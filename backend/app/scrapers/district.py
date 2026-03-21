import logging
import re
import time
from datetime import datetime

import requests
from bs4 import BeautifulSoup

from app.models.schemas import CaseEntry, ScrapeResult
from app.scrapers.captcha import solve_captcha, CaptchaSolveError

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
}

DISTRICT_COURTS = {
    "rangareddy": {
        "domain": "rangareddy.dcourts.gov.in",
        "name": "Ranga Reddy District Court",
        "est_code": "TSRA00",
    },
    "ccc_hyd": {
        "domain": "hccc.dcourts.gov.in",
        "name": "City Civil Court, Hyderabad",
        "est_code": "TSHC01",
    },
    "metro_sessions": {
        "domain": "hmsj.dcourts.gov.in",
        "name": "Metropolitan Sessions Court",
        "est_code": "TSHM01",
    },
    "medchal": {
        "domain": "medchalmalkajgiri.dcourts.gov.in",
        "name": "Medchal-Malkajgiri District Court",
        "est_code": "TSMM02",
    },
}

MAX_CAPTCHA_RETRIES = 3
CAUSE_LIST_PATH = "/cause-list-%e2%81%84-daily-board/"


def _convert_date(yyyy_mm_dd: str) -> str:
    """Convert YYYY-MM-DD to MM/DD/YYYY for district courts."""
    dt = datetime.strptime(yyyy_mm_dd, "%Y-%m-%d")
    return dt.strftime("%m/%d/%Y")


def _fetch_scid(session: requests.Session, domain: str) -> str:
    """GET the cause list page and extract the hidden scid value."""
    url = f"https://{domain}{CAUSE_LIST_PATH}"
    logger.info(f"Fetching scid from {url}")
    resp = session.get(url, timeout=30, verify=True)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")
    scid_input = soup.find("input", {"name": "scid"})
    if not scid_input or not scid_input.get("value"):
        raise ValueError(f"Could not find scid on {domain}")
    scid = scid_input["value"]
    logger.info(f"Got scid: {scid[:8]}...")
    return scid


def _fetch_and_solve_captcha(session: requests.Session, domain: str, scid: str) -> str:
    """Download the captcha image and solve it via CapSolver."""
    captcha_url = f"https://{domain}/?_siwp_captcha&id={scid}"
    logger.info(f"Downloading captcha from {domain}")
    resp = session.get(captcha_url, timeout=30, verify=True)
    resp.raise_for_status()
    image_bytes = resp.content
    logger.info(f"Captcha image: {len(image_bytes)} bytes")
    return solve_captcha(image_bytes)


def _parse_district_html(html: str) -> list[CaseEntry]:
    """Parse the HTML table from a district court AJAX response."""
    soup = BeautifulSoup(html, "lxml")
    cases = []

    for row in soup.find_all("tr"):
        tds = row.find_all("td")
        if len(tds) < 2:
            continue
        # Skip header rows
        if row.find("th"):
            continue
        # Skip rows that are just text/headers
        first_text = tds[0].get_text(strip=True)
        if not first_text or not any(c.isdigit() for c in first_text):
            continue

        cells = [td.get_text(strip=True, separator="\n") for td in tds]

        case = CaseEntry(
            serial_no=cells[0] if len(cells) > 0 else None,
            case_no=cells[1] if len(cells) > 1 else "",
            parties_petitioner=cells[2] if len(cells) > 2 else "",
            parties_respondent=cells[3] if len(cells) > 3 else "",
            petitioner_advocate=cells[4] if len(cells) > 4 else "",
            respondent_advocate=cells[5] if len(cells) > 5 else "",
        )
        cases.append(case)

    return cases


def scrape_district_for_advocate(
    court_key: str,
    bar_state_code: str,
    bar_number: str,
    bar_year: str,
    target_date: str,
) -> ScrapeResult:
    """
    Scrape one district court for one advocate.

    Args:
        court_key: Key from DISTRICT_COURTS (e.g. "rangareddy")
        bar_state_code: 2-letter state code (e.g. "TS")
        bar_number: Bar registration number (e.g. "315")
        bar_year: Bar registration year (e.g. "2017")
        target_date: Date in YYYY-MM-DD format

    Returns:
        ScrapeResult with parsed cases (may have 0 cases).
    """
    court = DISTRICT_COURTS[court_key]
    domain = court["domain"]
    est_code = court["est_code"]
    district_date = _convert_date(target_date)

    logger.info(f"Scraping {court_key} for {bar_state_code}/{bar_number}/{bar_year} on {district_date}")

    session = requests.Session()
    session.headers.update(HEADERS)

    # Step 1: Get scid
    scid = _fetch_scid(session, domain)

    for attempt in range(1, MAX_CAPTCHA_RETRIES + 1):
        # Step 2 & 3: Get and solve captcha
        try:
            solved = _fetch_and_solve_captcha(session, domain, scid)
        except CaptchaSolveError as e:
            logger.error(f"Captcha solve failed on attempt {attempt}: {e}")
            if attempt < MAX_CAPTCHA_RETRIES:
                time.sleep(1)
                scid = _fetch_scid(session, domain)
                continue
            return ScrapeResult(
                court_source=court_key,
                hearing_date=target_date,
                total_cases=0,
                cases=[],
                raw_html=None,
            )

        # Step 4: POST to AJAX endpoint
        ajax_url = f"https://{domain}/wp-admin/admin-ajax.php"
        form_data = {
            "action": "get_advocate",
            "est_code": est_code,
            "service_type": "courtComplex",
            "adv_search": "datecase",
            "barcode[state_code]": bar_state_code,
            "barcode[bar_code]": bar_number,
            "barcode[year]": bar_year,
            "advocate_date": district_date,
            "es_ajax_request": "1",
            "scid": scid,
            "siwp_captcha_value": solved,
        }

        try:
            resp = session.post(ajax_url, data=form_data, timeout=30, verify=True)
            resp.raise_for_status()
        except requests.RequestException as e:
            logger.error(f"AJAX POST failed for {court_key}: {e}")
            if attempt < MAX_CAPTCHA_RETRIES:
                time.sleep(1)
                scid = _fetch_scid(session, domain)
                continue
            return ScrapeResult(
                court_source=court_key,
                hearing_date=target_date,
                total_cases=0,
                cases=[],
                raw_html=None,
            )

        # Step 5: Parse JSON response
        try:
            data = resp.json()
        except ValueError:
            logger.error(f"Invalid JSON from {court_key}: {resp.text[:200]}")
            return ScrapeResult(
                court_source=court_key,
                hearing_date=target_date,
                total_cases=0,
                cases=[],
                raw_html=resp.text,
            )

        raw_data = data.get("data", "")

        # Check for captcha error — retry
        if "captcha code entered was incorrect" in str(raw_data).lower():
            logger.warning(f"Captcha incorrect on attempt {attempt}/{MAX_CAPTCHA_RETRIES}")
            if attempt < MAX_CAPTCHA_RETRIES:
                time.sleep(1)
                scid = _fetch_scid(session, domain)
                continue
            return ScrapeResult(
                court_source=court_key,
                hearing_date=target_date,
                total_cases=0,
                cases=[],
                raw_html=str(raw_data),
            )

        # Check for no records
        if not data.get("success") or "No records found" in str(raw_data):
            logger.info(f"{court_key}: no records for {bar_state_code}/{bar_number}/{bar_year}")
            return ScrapeResult(
                court_source=court_key,
                hearing_date=target_date,
                total_cases=0,
                cases=[],
                raw_html=str(raw_data),
            )

        # Step 6: Parse the HTML table
        html_content = str(raw_data)
        cases = _parse_district_html(html_content)
        logger.info(f"{court_key}: found {len(cases)} cases")

        return ScrapeResult(
            court_source=court_key,
            hearing_date=target_date,
            total_cases=len(cases),
            cases=cases,
            raw_html=html_content,
        )

    # Should not reach here, but safety fallback
    return ScrapeResult(
        court_source=court_key,
        hearing_date=target_date,
        total_cases=0,
        cases=[],
        raw_html=None,
    )
