import logging
from html import escape

import resend

from app.config import settings
from app.models.schemas import ScrapeResult

resend.api_key = settings.RESEND_API_KEY

logger = logging.getLogger(__name__)

COURT_DISPLAY_NAMES = {
    "tshc_daily": "TSHC High Court — Daily List",
    "tshc_advance": "TSHC High Court — Advance List",
    "tshc_supplementary": "TSHC High Court — Supplementary List",
    "rangareddy": "Ranga Reddy District Court",
    "ccc_hyd": "City Civil Court, Hyderabad",
    "metro_sessions": "Metropolitan Sessions Court",
    "medchal": "Medchal-Malkajgiri District Court",
}

FROM_ADDRESS = "CauseListPro <alerts@causelistpro.in>"


def _build_case_table(result: ScrapeResult) -> str:
    """Build an HTML table for cases in one court."""
    rows = ""
    for c in result.cases:
        parties = escape(c.parties_petitioner)
        if c.parties_respondent:
            parties += f" <em>vs</em> {escape(c.parties_respondent)}"
        court_judge = escape(c.court_name or c.district or "—")
        status = escape(c.status or "—")
        rows += f"""<tr>
<td style="padding:8px 10px;border:1px solid #ddd;text-align:center;font-size:13px;">{escape(c.serial_no or "—")}</td>
<td style="padding:8px 10px;border:1px solid #ddd;font-size:13px;font-weight:600;">{escape(c.case_no)}</td>
<td style="padding:8px 10px;border:1px solid #ddd;font-size:13px;">{parties}</td>
<td style="padding:8px 10px;border:1px solid #ddd;font-size:13px;">{court_judge}</td>
<td style="padding:8px 10px;border:1px solid #ddd;font-size:13px;">{status}</td>
</tr>"""

    return f"""<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:8px;">
<thead>
<tr style="background-color:#f0f4f0;">
<th style="padding:8px 10px;border:1px solid #ddd;text-align:center;font-size:12px;color:#333;">S.No</th>
<th style="padding:8px 10px;border:1px solid #ddd;text-align:left;font-size:12px;color:#333;">Case Number</th>
<th style="padding:8px 10px;border:1px solid #ddd;text-align:left;font-size:12px;color:#333;">Parties</th>
<th style="padding:8px 10px;border:1px solid #ddd;text-align:left;font-size:12px;color:#333;">Court / Judge</th>
<th style="padding:8px 10px;border:1px solid #ddd;text-align:left;font-size:12px;color:#333;">Status</th>
</tr>
</thead>
<tbody>
{rows}
</tbody>
</table>"""


def _build_html(
    advocate_name: str,
    hearing_date: str,
    results_by_court: dict[str, ScrapeResult],
    total_cases: int,
) -> str:
    """Build the full HTML email body."""
    courts_with_cases = sum(1 for r in results_by_court.values() if r.total_cases > 0)
    court_count = len(results_by_court)

    if total_cases > 0:
        summary = f"You have <strong>{total_cases} case(s)</strong> listed for <strong>{escape(hearing_date)}</strong> across {courts_with_cases} court(s)."
    else:
        summary = f"No cases listed for <strong>{escape(hearing_date)}</strong>."

    court_sections = ""
    for court_key, result in results_by_court.items():
        display_name = COURT_DISPLAY_NAMES.get(court_key, court_key)
        if result.total_cases > 0:
            court_sections += f"""<tr><td style="padding:16px 24px 4px;">
<h3 style="margin:0 0 8px;font-size:15px;color:#0B1F15;border-bottom:2px solid #D4AF37;padding-bottom:6px;">{escape(display_name)} ({result.total_cases} case{"s" if result.total_cases != 1 else ""})</h3>
{_build_case_table(result)}
</td></tr>"""
        else:
            court_sections += f"""<tr><td style="padding:8px 24px;">
<p style="margin:0;font-size:14px;color:#2d7a2d;">{escape(display_name)}: No cases listed &#10003;</p>
</td></tr>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

<!-- Header -->
<tr><td style="background-color:#0B1F15;padding:20px 24px;text-align:center;">
<h1 style="margin:0;font-size:20px;color:#D4AF37;font-weight:700;letter-spacing:0.5px;">CauseListPro &mdash; Daily Cause List Alert</h1>
</td></tr>

<!-- Greeting & Summary -->
<tr><td style="padding:24px 24px 8px;">
<p style="margin:0 0 12px;font-size:15px;color:#333;">Dear {escape(advocate_name)},</p>
<p style="margin:0 0 4px;font-size:14px;color:#555;">{summary}</p>
</td></tr>

<!-- Court Sections -->
{court_sections}

<!-- Footer -->
<tr><td style="padding:20px 24px;border-top:1px solid #eee;margin-top:16px;">
<p style="margin:0 0 4px;font-size:11px;color:#999;">Source: tshc.gov.in, eCourts India | This is an automated alert from CauseListPro</p>
<p style="margin:0;font-size:11px;color:#999;">Hearing date: {escape(hearing_date)} | Generated for {escape(advocate_name)}</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>"""


def send_daily_alert(
    advocate_name: str,
    advocate_email: str,
    hearing_date: str,
    results_by_court: dict[str, ScrapeResult],
    total_cases: int,
) -> bool:
    """
    Send a daily cause list alert email to an advocate.

    Returns True if sent successfully, False otherwise.
    """
    subject = f"CauseListPro: {total_cases} case(s) on {hearing_date}" if total_cases > 0 else f"CauseListPro: No cases on {hearing_date}"

    html = _build_html(advocate_name, hearing_date, results_by_court, total_cases)

    logger.info(f"Sending email to {advocate_email}: {subject}")

    try:
        resp = resend.Emails.send({
            "from": FROM_ADDRESS,
            "to": [advocate_email],
            "subject": subject,
            "html": html,
        })
        logger.info(f"Email sent to {advocate_email}: id={resp.get('id', 'unknown')}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {advocate_email}: {e}")
        return False


def send_admin_summary(
    run_id: str,
    advocates_checked: int,
    total_cases: int,
    emails_sent: int,
    errors: list[str],
) -> bool:
    """Send a summary email to the admin after a scrape run."""
    error_section = ""
    if errors:
        error_items = "".join(f"<li>{escape(e)}</li>" for e in errors)
        error_section = f"<h3>Errors ({len(errors)})</h3><ul>{error_items}</ul>"

    html = f"""<html><body style="font-family:Arial,sans-serif;padding:20px;">
<h2>CauseListPro Scrape Summary</h2>
<p><strong>Run ID:</strong> {escape(run_id)}</p>
<p><strong>Advocates checked:</strong> {advocates_checked}</p>
<p><strong>Total cases found:</strong> {total_cases}</p>
<p><strong>Emails sent:</strong> {emails_sent}</p>
<p><strong>Errors:</strong> {len(errors)}</p>
{error_section}
</body></html>"""

    logger.info(f"Sending admin summary for run {run_id}")

    try:
        resend.Emails.send({
            "from": FROM_ADDRESS,
            "to": [settings.ADMIN_EMAIL],
            "subject": f"CauseListPro Run {run_id}: {total_cases} cases, {emails_sent} emails",
            "html": html,
        })
        return True
    except Exception as e:
        logger.error(f"Failed to send admin summary: {e}")
        return False
