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
    """Parse TSHC cause list HTML into CaseEntry objects."""
    soup = BeautifulSoup(html, "lxml")
    cases = []

    tbody = soup.find("tbody")
    if not tbody:
        return cases

    for row in tbody.find_all("tr"):
        tds = row.find_all("td")
        if len(tds) < 5:
            continue

        cells = [td.get_text(strip=True, separator="\n") for td in tds]

        # Column 2 (parties) has petitioner vs respondent separated by "vs"
        parties_raw = cells[2] if len(cells) > 2 else ""
        parts = re.split(r"\n*vs\n*", parties_raw, maxsplit=1)
        petitioner = parts[0].strip() if len(parts) > 0 else ""
        respondent = parts[1].strip() if len(parts) > 1 else ""

        # Column 5 (district/remarks) — first line is district
        district_raw = cells[5] if len(cells) > 5 else ""
        district = district_raw.split("\n")[0].strip() if district_raw else None

        cases.append(
            CaseEntry(
                serial_no=cells[0].strip() or None,
                case_no=cells[1].strip(),
                parties_petitioner=petitioner,
                parties_respondent=respondent,
                petitioner_advocate=cells[3].strip() if len(cells) > 3 else "",
                respondent_advocate=cells[4].strip() if len(cells) > 4 else "",
                district=district,
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
