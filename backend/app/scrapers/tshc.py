import logging
import re
import time
from datetime import datetime

import requests
import urllib3
from bs4 import BeautifulSoup

from app.models.schemas import CaseEntry, ScrapeResult

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)

BASE_URL = "https://causelist.tshc.gov.in"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
}

ENDPOINTS = [
    ("tshc_daily", f"{BASE_URL}/advocateCodeWiseView"),
    ("tshc_advance", f"{BASE_URL}/advance-list/advocateCodeWiseView"),
    ("tshc_supplementary", f"{BASE_URL}/suplementary-list/advocateCodeWiseView"),
]

NAME_ENDPOINTS = [
    ("tshc_daily", f"{BASE_URL}/advocateWiseView"),
    ("tshc_advance", f"{BASE_URL}/advance-list/advocateWiseView"),
    ("tshc_supplementary", f"{BASE_URL}/suplementary-list/advocateWiseView"),
]

MAX_RETRIES = 3
BACKOFF_SECONDS = [2, 4, 8]


def _convert_date(yyyy_mm_dd: str) -> str:
    """Convert YYYY-MM-DD to DD-MM-YYYY for TSHC."""
    dt = datetime.strptime(yyyy_mm_dd, "%Y-%m-%d")
    return dt.strftime("%d-%m-%Y")


def _post_with_retry(url: str, data: dict) -> requests.Response | None:
    """POST with exponential backoff retry."""
    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.post(
                url, data=data, headers=HEADERS, verify=False, timeout=30
            )
            resp.raise_for_status()
            return resp
        except (requests.ConnectionError, requests.Timeout, requests.RequestException) as e:
            if attempt < MAX_RETRIES - 1:
                wait = BACKOFF_SECONDS[attempt]
                logger.warning(f"Retry {attempt+1}/{MAX_RETRIES} for {url}: {e}. Waiting {wait}s")
                time.sleep(wait)
            else:
                logger.error(f"All {MAX_RETRIES} retries failed for {url}: {e}")
                return None


def parse_tshc_html(html: str) -> list[CaseEntry]:
    """Parse TSHC cause list HTML into CaseEntry objects.

    The page contains multiple <table> elements, each preceded by a
    'COURT NO. X' header.  Inside each table, single-column rows are
    section headers (e.g. 'INTERLOCUTORY') and 6-column rows are case data.
    """
    soup = BeautifulSoup(html, "lxml")
    cases: list[CaseEntry] = []

    # Extract court number from anywhere in the page
    court_no: str | None = None
    court_match = re.search(r"COURT NO\.?\s*(\d+)", html, re.I)
    if court_match:
        court_no = court_match.group(1)

    # Only process the main cause list table (id="dataTable")
    table = soup.find("table", id="dataTable")
    if table:
        tables = [table]
    else:
        # Fallback: use first table with class 'table-bordered'
        tables = soup.find_all("table", class_="table-bordered")

    for table in tables:
        tbody = table.find("tbody")
        if not tbody:
            continue

        status_section = ""  # Track section headers like "INTERLOCUTORY"

        for row in tbody.find_all("tr"):
            tds = row.find_all("td")

            # Single-column row = section header (status context)
            if len(tds) == 1:
                header_text = tds[0].get_text(strip=True)
                # Skip non-status headers like "Connected Case Number"
                if header_text and header_text not in (
                    "Connected Case Number", "PETITIONER(S)", "RESPONDENT(S)", "",
                ):
                    status_section = header_text
                continue

            if len(tds) < 5:
                continue

            cells = [td.get_text(strip=True, separator="\n") for td in tds]

            # Column 2: parties — petitioner vs respondent
            parties_raw = cells[2] if len(cells) > 2 else ""
            parts = re.split(r"\n*vs\n*", parties_raw, maxsplit=1)
            petitioner = parts[0].strip() if len(parts) > 0 else ""
            respondent = parts[1].strip() if len(parts) > 1 else ""

            # Column 5: district + remarks
            district_raw = cells[5] if len(cells) > 5 else ""
            district_lines = [
                l.strip() for l in district_raw.split("\n") if l.strip()
            ]
            district = district_lines[0] if district_lines else None
            remarks = district_lines[1] if len(district_lines) > 1 else ""

            # Derive status from remarks or section header
            status = ""
            for keyword in ("FOR ORDERS", "FOR ADMISSION", "FOR ARGUMENTS", "FOR HEARING"):
                if keyword in remarks.upper() or keyword in status_section.upper():
                    status = keyword
                    break
            if not status and status_section:
                status = status_section

            cases.append(
                CaseEntry(
                    serial_no=cells[0].strip() or None,
                    case_no=cells[1].strip(),
                    parties_petitioner=petitioner,
                    parties_respondent=respondent,
                    petitioner_advocate=cells[3].strip() if len(cells) > 3 else "",
                    respondent_advocate=cells[4].strip() if len(cells) > 4 else "",
                    court_name=court_no,
                    district=district,
                    status=status,
                )
            )

    return cases


def _extract_total_cases(html: str, cis_code: str) -> int:
    """Extract total case count from TSHC response."""
    match = re.search(rf"TOTAL CASES FOR\s*{re.escape(cis_code)}\s*=\s*(\d+)", html)
    if match:
        return int(match.group(1))
    return 0


def scrape_tshc_for_advocate(cis_code: str, target_date: str) -> list[ScrapeResult]:
    """
    Scrape all 3 TSHC list types for one advocate.

    Args:
        cis_code: 5-digit CIS advocate code (e.g. "01390")
        target_date: Date in YYYY-MM-DD format

    Returns:
        List of ScrapeResult for lists with total_cases > 0.
    """
    if not cis_code:
        return []

    tshc_date = _convert_date(target_date)
    form_data = {"listDate": tshc_date, "advocateCode": cis_code}
    results = []

    for court_source, url in ENDPOINTS:
        logger.info(f"Scraping {court_source} for code={cis_code} date={tshc_date}")

        resp = _post_with_retry(url, form_data)
        if resp is None:
            logger.error(f"Failed to fetch {court_source} for code={cis_code}")
            continue

        html = resp.text

        if "No Data Available" in html:
            logger.info(f"{court_source}: no data for code={cis_code}")
            continue

        total = _extract_total_cases(html, cis_code)
        cases = parse_tshc_html(html)

        if total > 0 or cases:
            results.append(
                ScrapeResult(
                    court_source=court_source,
                    hearing_date=target_date,
                    total_cases=total if total else len(cases),
                    cases=cases,
                    raw_html=html,
                )
            )
            logger.info(f"{court_source}: found {total} cases for code={cis_code}")

        time.sleep(1)

    return results


def scrape_tshc_by_name(advocate_name: str, target_date: str) -> list[ScrapeResult]:
    """Fallback for advocates without a CIS code.

    Uses POST /advocateWiseView with advocate name instead of code.
    Checks all 3 list types (daily, advance, supplementary).

    Args:
        advocate_name: Advocate name (will be uppercased).
        target_date: Date in YYYY-MM-DD format.

    Returns:
        List of ScrapeResult for lists with cases found.
    """
    name = advocate_name.strip().upper()
    if len(name) < 3:
        return []

    tshc_date = _convert_date(target_date)
    form_data = {"listDate": tshc_date, "advocate": name}
    results = []

    for court_source, url in NAME_ENDPOINTS:
        logger.info(f"Scraping {court_source} by name={name} date={tshc_date}")

        resp = _post_with_retry(url, form_data)
        if resp is None:
            logger.error(f"Failed to fetch {court_source} for name={name}")
            continue

        html = resp.text

        if "No Data Available" in html:
            logger.info(f"{court_source}: no data for name={name}")
            continue

        cases = parse_tshc_html(html)

        if cases:
            results.append(
                ScrapeResult(
                    court_source=court_source,
                    hearing_date=target_date,
                    total_cases=len(cases),
                    cases=cases,
                    raw_html=html,
                )
            )
            logger.info(f"{court_source}: found {len(cases)} cases for name={name}")

        time.sleep(1)

    return results
