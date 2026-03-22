import logging
import time
from datetime import date, datetime, timedelta
from uuid import uuid4

from app.db.supabase_client import (
    get_active_advocates,
    get_advocate_by_id,
    log_notification,
    log_scrape_complete,
    log_scrape_start,
    store_daily_result,
    was_notification_sent_today,
)
from app.models.schemas import ScrapeResult
from app.scrapers.district import DISTRICT_COURTS, scrape_district_for_advocate
from app.scrapers.tshc import scrape_tshc_by_name, scrape_tshc_for_advocate
from app.services.emailer import send_admin_summary, send_daily_alert

logger = logging.getLogger(__name__)


def _get_target_date() -> str:
    """Return the next court working day as YYYY-MM-DD.

    Tomorrow, unless tomorrow is Saturday (use Monday) or Sunday (use Monday).
    """
    tomorrow = date.today() + timedelta(days=1)
    weekday = tomorrow.weekday()  # 0=Mon ... 6=Sun
    if weekday == 5:  # Saturday -> Monday
        tomorrow += timedelta(days=2)
    elif weekday == 6:  # Sunday -> Monday
        tomorrow += timedelta(days=1)
    return tomorrow.isoformat()


def _extract_cis_code(advocate: dict) -> str | None:
    """Get the 5-digit TSHC CIS code from an advocate record.

    Uses tshc_cis_code if set, otherwise extracts last 5 digits from
    tshc_computer_code (e.g. NB/TS/2019/01390 -> 01390).
    """
    if advocate.get("tshc_cis_code"):
        return advocate["tshc_cis_code"]
    computer_code = advocate.get("tshc_computer_code")
    if computer_code:
        parts = computer_code.split("/")
        if parts:
            return parts[-1]
    return None


def _deduplicate_metro_sessions(
    metro_result: ScrapeResult,
    ccc_result: ScrapeResult | None,
) -> ScrapeResult:
    """Remove cases from metro_sessions that already appear in ccc_hyd.

    Courts 3 (ccc_hyd) and 4 (metro_sessions) share establishment codes,
    so the same case can appear in both.
    """
    if not ccc_result or not ccc_result.cases:
        return metro_result
    if not metro_result.cases:
        return metro_result

    ccc_case_numbers = {c.case_no for c in ccc_result.cases}
    deduped = [c for c in metro_result.cases if c.case_no not in ccc_case_numbers]
    removed = len(metro_result.cases) - len(deduped)

    if removed > 0:
        logger.info(f"Dedup: removed {removed} duplicate cases from metro_sessions")

    return ScrapeResult(
        court_source=metro_result.court_source,
        hearing_date=metro_result.hearing_date,
        total_cases=len(deduped),
        cases=deduped,
        raw_html=metro_result.raw_html,
    )


def run_ondemand_check(advocate_id: str) -> dict:
    """Run an on-demand scrape for a single advocate.

    Returns a dict with results per court source.
    """
    advocate = get_advocate_by_id(advocate_id)
    if not advocate:
        return {"error": "Advocate not found", "advocate_id": advocate_id}

    target_date = _get_target_date()
    adv_name = advocate["name"]
    logger.info(f"On-demand check for {adv_name} on {target_date}")

    all_results: dict[str, ScrapeResult] = {}

    # TSHC
    cis_code = _extract_cis_code(advocate)
    tshc_results: list[ScrapeResult] = []
    if cis_code:
        try:
            tshc_results = scrape_tshc_for_advocate(cis_code, target_date)
        except Exception as e:
            logger.error(f"TSHC on-demand error for {adv_name}: {e}")
    elif advocate.get("name"):
        logger.info(f"No CIS code for {adv_name} — using name search fallback")
        try:
            tshc_results = scrape_tshc_by_name(advocate["name"], target_date)
        except Exception as e:
            logger.error(f"TSHC name-search error for {adv_name}: {e}")

    for result in tshc_results:
        store_daily_result(
            advocate_id=advocate_id,
            hearing_date=target_date,
            court_source=result.court_source,
            total_cases=result.total_cases,
            cases_json=[c.model_dump() for c in result.cases],
            raw_html=result.raw_html or "",
        )
        all_results[result.court_source] = result

    # District courts
    for court_key in DISTRICT_COURTS:
        try:
            result = scrape_district_for_advocate(
                court_key=court_key,
                bar_state_code=advocate["bar_state_code"],
                bar_number=advocate["bar_number"],
                bar_year=advocate["bar_year"],
                target_date=target_date,
            )
            if court_key == "metro_sessions":
                result = _deduplicate_metro_sessions(result, all_results.get("ccc_hyd"))
            store_daily_result(
                advocate_id=advocate_id,
                hearing_date=target_date,
                court_source=court_key,
                total_cases=result.total_cases,
                cases_json=[c.model_dump() for c in result.cases],
                raw_html=result.raw_html or "",
            )
            all_results[court_key] = result
        except Exception as e:
            logger.error(f"{court_key} on-demand error for {adv_name}: {e}")
        time.sleep(1)

    total = sum(r.total_cases for r in all_results.values())
    return {
        "advocate_id": advocate_id,
        "advocate_name": adv_name,
        "target_date": target_date,
        "total_cases": total,
        "courts_checked": len(all_results),
        "results": {k: v.model_dump(exclude={"raw_html"}) for k, v in all_results.items()},
    }


def run_daily_scrape() -> dict:
    """Run the full daily scrape for all active advocates.

    Returns a summary dict with run stats.
    """
    run_id = str(uuid4())
    target_date = _get_target_date()
    logger.info(f"Starting daily scrape run={run_id} target_date={target_date}")

    log_id = log_scrape_start(run_id, "all")

    advocates = get_active_advocates()
    logger.info(f"Found {len(advocates)} active advocates")

    advocates_checked = 0
    total_cases = 0
    emails_sent = 0
    errors = []

    for advocate in advocates:
        adv_id = advocate["id"]
        adv_name = advocate["name"]
        adv_email = advocate["email"]
        advocates_checked += 1

        logger.info(f"Processing advocate {advocates_checked}/{len(advocates)}: {adv_name}")

        all_results: dict[str, ScrapeResult] = {}

        # --- TSHC High Court (3 list types) ---
        cis_code = _extract_cis_code(advocate)
        tshc_results: list[ScrapeResult] = []
        if cis_code:
            try:
                tshc_results = scrape_tshc_for_advocate(cis_code, target_date)
            except Exception as e:
                msg = f"TSHC error for {adv_name}: {e}"
                logger.error(msg)
                errors.append(msg)
        elif advocate.get("name"):
            logger.info(f"No CIS code for {adv_name} — using name search fallback")
            try:
                tshc_results = scrape_tshc_by_name(advocate["name"], target_date)
            except Exception as e:
                msg = f"TSHC name-search error for {adv_name}: {e}"
                logger.error(msg)
                errors.append(msg)

        for result in tshc_results:
            store_daily_result(
                advocate_id=adv_id,
                hearing_date=target_date,
                court_source=result.court_source,
                total_cases=result.total_cases,
                cases_json=[c.model_dump() for c in result.cases],
                raw_html=result.raw_html or "",
            )
            all_results[result.court_source] = result

        # --- District Courts (4 courts) ---
        for court_key in DISTRICT_COURTS:
            try:
                result = scrape_district_for_advocate(
                    court_key=court_key,
                    bar_state_code=advocate["bar_state_code"],
                    bar_number=advocate["bar_number"],
                    bar_year=advocate["bar_year"],
                    target_date=target_date,
                )

                # Deduplicate metro_sessions against ccc_hyd
                if court_key == "metro_sessions":
                    result = _deduplicate_metro_sessions(
                        result, all_results.get("ccc_hyd")
                    )

                store_daily_result(
                    advocate_id=adv_id,
                    hearing_date=target_date,
                    court_source=court_key,
                    total_cases=result.total_cases,
                    cases_json=[c.model_dump() for c in result.cases],
                    raw_html=result.raw_html or "",
                )
                all_results[court_key] = result

            except Exception as e:
                msg = f"{court_key} error for {adv_name}: {e}"
                logger.error(msg)
                errors.append(msg)

            time.sleep(1)

        # --- Tally and notify ---
        advocate_total = sum(r.total_cases for r in all_results.values())
        total_cases += advocate_total

        # Check if email was already sent for this advocate + date
        already_sent = was_notification_sent_today(adv_id, target_date)
        if already_sent:
            logger.info(f"Email already sent to {adv_name} for {target_date} — skipping")
        else:
            should_notify = advocate_total > 0 or advocate.get("notify_zero_cases", False)
            if should_notify:
                subject = (
                    f"CauseListPro: {advocate_total} case(s) on {target_date}"
                    if advocate_total > 0
                    else f"CauseListPro: No cases on {target_date}"
                )
                try:
                    sent = send_daily_alert(
                        advocate_name=adv_name,
                        advocate_email=adv_email,
                        hearing_date=target_date,
                        results_by_court=all_results,
                        total_cases=advocate_total,
                    )
                    if sent:
                        emails_sent += 1
                        log_notification(adv_id, target_date, "email", "sent", subject)
                    else:
                        log_notification(adv_id, target_date, "email", "failed", subject, "send returned false")
                except Exception as e:
                    msg = f"Email error for {adv_name}: {e}"
                    logger.error(msg)
                    errors.append(msg)
                    log_notification(adv_id, target_date, "email", "failed", subject, str(e))

    # --- Finalize ---
    status = "completed" if not errors else "completed_with_errors"
    log_scrape_complete(log_id, status, advocates_checked, total_cases, errors)

    try:
        send_admin_summary(run_id, advocates_checked, total_cases, emails_sent, errors)
    except Exception as e:
        logger.error(f"Failed to send admin summary: {e}")

    summary = {
        "run_id": run_id,
        "target_date": target_date,
        "advocates_checked": advocates_checked,
        "total_cases": total_cases,
        "emails_sent": emails_sent,
        "errors_count": len(errors),
        "errors": errors,
        "status": status,
    }
    logger.info(f"Scrape run complete: {summary}")
    return summary
