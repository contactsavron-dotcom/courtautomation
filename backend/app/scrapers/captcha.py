import logging
import time
import base64

import requests

from app.config import settings

logger = logging.getLogger(__name__)

CREATE_TASK_URL = "https://api.capsolver.com/createTask"
GET_RESULT_URL = "https://api.capsolver.com/getTaskResult"
POLL_INTERVAL = 3
MAX_POLLS = 10


class CaptchaSolveError(Exception):
    pass


def solve_captcha(image_bytes: bytes, api_key: str = None) -> str:
    if api_key is None:
        api_key = settings.CAPSOLVER_API_KEY

    image_b64 = base64.b64encode(image_bytes).decode("utf-8")

    logger.info("Submitting captcha image to CapSolver")
    try:
        resp = requests.post(
            CREATE_TASK_URL,
            json={
                "clientKey": api_key,
                "task": {
                    "type": "ImageToTextTask",
                    "body": image_b64,
                },
            },
            timeout=30,
        )
        data = resp.json()
    except requests.RequestException as e:
        raise CaptchaSolveError(f"Failed to submit captcha: {e}")

    if data.get("errorId", 0) > 0:
        raise CaptchaSolveError(f"CapSolver error: {data.get('errorDescription', 'Unknown error')}")

    if data.get("status") == "ready" and data.get("solution"):
        solved = data["solution"]["text"]
        logger.info(f"Captcha solved instantly: {solved}")
        return solved

    task_id = data.get("taskId")
    if not task_id:
        raise CaptchaSolveError(f"No taskId in CapSolver response: {data}")

    for attempt in range(1, MAX_POLLS + 1):
        time.sleep(POLL_INTERVAL)
        logger.info(f"Polling CapSolver result (attempt {attempt}/{MAX_POLLS})")

        try:
            resp = requests.post(
                GET_RESULT_URL,
                json={"clientKey": api_key, "taskId": task_id},
                timeout=30,
            )
            data = resp.json()
        except requests.RequestException as e:
            logger.warning(f"Poll request failed: {e}")
            continue

        if data.get("errorId", 0) > 0:
            raise CaptchaSolveError(f"CapSolver error: {data.get('errorDescription', 'Unknown error')}")

        if data.get("status") == "ready" and data.get("solution"):
            solved = data["solution"]["text"]
            logger.info(f"Captcha solved: {solved}")
            return solved

        if data.get("status") == "processing":
            logger.info("Captcha still processing, continuing to poll")
            continue

    raise CaptchaSolveError(f"Captcha solve timed out after {MAX_POLLS * POLL_INTERVAL}s")
