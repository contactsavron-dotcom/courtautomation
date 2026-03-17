import logging
import time

import requests

from app.config import settings

logger = logging.getLogger(__name__)

SUBMIT_URL = "https://2captcha.com/in.php"
RESULT_URL = "https://2captcha.com/res.php"
POLL_INTERVAL = 5
MAX_POLLS = 6

FATAL_ERRORS = {
    "ERROR_CAPTCHA_UNSOLVABLE",
    "ERROR_WRONG_USER_KEY",
    "ERROR_ZERO_BALANCE",
}


class CaptchaSolveError(Exception):
    pass


def solve_captcha(image_bytes: bytes, api_key: str = None) -> str:
    """
    Submit a captcha image to 2Captcha and return the solved text.

    Args:
        image_bytes: Raw PNG bytes of the captcha image.
        api_key: 2Captcha API key. Defaults to settings.TWOCAPTCHA_API_KEY.

    Returns:
        The solved captcha text.

    Raises:
        CaptchaSolveError: On fatal API errors or timeout.
    """
    if api_key is None:
        api_key = settings.TWOCAPTCHA_API_KEY

    # Step 1: Submit captcha image
    logger.info("Submitting captcha image to 2Captcha")
    try:
        resp = requests.post(
            SUBMIT_URL,
            data={"key": api_key, "method": "post"},
            files={"file": ("captcha.png", image_bytes, "image/png")},
            timeout=30,
        )
    except requests.RequestException as e:
        raise CaptchaSolveError(f"Failed to submit captcha: {e}")

    # Step 2: Extract captcha_id from "OK|{id}"
    text = resp.text.strip()
    logger.info(f"2Captcha submit response: {text}")

    if not text.startswith("OK|"):
        raise CaptchaSolveError(f"2Captcha submit error: {text}")

    captcha_id = text.split("|", 1)[1]

    # Step 3: Poll for result
    for attempt in range(1, MAX_POLLS + 1):
        time.sleep(POLL_INTERVAL)
        logger.info(f"Polling 2Captcha result (attempt {attempt}/{MAX_POLLS})")

        try:
            resp = requests.get(
                RESULT_URL,
                params={"key": api_key, "action": "get", "id": captcha_id},
                timeout=30,
            )
        except requests.RequestException as e:
            logger.warning(f"Poll request failed: {e}")
            continue

        result = resp.text.strip()

        # Step 4: Check for solved
        if result.startswith("OK|"):
            solved = result.split("|", 1)[1]
            logger.info(f"Captcha solved: {solved}")
            return solved

        # Step 5: Not ready yet
        if result == "CAPCHA_NOT_READY":
            logger.info("Captcha not ready yet, continuing to poll")
            continue

        # Step 6: Fatal error
        if result in FATAL_ERRORS:
            raise CaptchaSolveError(f"2Captcha error: {result}")

        logger.warning(f"Unexpected 2Captcha response: {result}")

    raise CaptchaSolveError(f"Captcha solve timed out after {MAX_POLLS * POLL_INTERVAL}s")
