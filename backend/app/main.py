import logging
from datetime import date as date_cls
from datetime import datetime, timedelta
from typing import Optional

from fastapi import FastAPI, HTTPException, Header, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.config import settings
from app.db.supabase_client import (
    create_advocate,
    get_advocate_by_email,
    get_results_for_advocate,
)
from app.models.schemas import AdvocateRegister
from app.services.orchestrator import run_daily_scrape, run_ondemand_check

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="CauseListPro API", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"{request.method} {request.url.path}")
    response = await call_next(request)
    logger.info(f"{request.method} {request.url.path} -> {response.status_code}")
    return response


# --- Health ---

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
    }


# --- Scrape endpoints ---

@app.post("/api/scrape/daily")
def scrape_daily(authorization: str = Header()):
    expected = f"Bearer {settings.DAILY_SCRAPE_SECRET}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Invalid authorization secret")
    return run_daily_scrape()


class OnDemandRequest(BaseModel):
    advocate_id: str


@app.post("/api/scrape/ondemand")
def scrape_ondemand(body: OnDemandRequest):
    result = run_ondemand_check(body.advocate_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


# --- Advocate endpoints ---

@app.post("/api/advocates/register")
@limiter.limit("5/minute")
def register_advocate(body: AdvocateRegister, request: Request):
    # Check duplicate email
    existing = get_advocate_by_email(str(body.email))
    if existing:
        raise HTTPException(status_code=409, detail="An advocate with this email is already registered")

    # Parse bar_council_id into components
    parts = body.bar_council_id.split("/")
    bar_state_code = parts[0]
    bar_number = parts[1]
    bar_year = parts[2]

    data = {
        "name": body.name,
        "email": str(body.email),
        "phone": body.phone,
        "bar_council_id": body.bar_council_id,
        "bar_state_code": bar_state_code,
        "bar_number": bar_number,
        "bar_year": bar_year,
        "tshc_computer_code": body.tshc_computer_code,
    }

    try:
        advocate = create_advocate(data)
    except Exception as e:
        logger.error(f"Failed to create advocate: {e}")
        if "duplicate" in str(e).lower():
            raise HTTPException(status_code=409, detail="Advocate with this bar council ID already exists")
        raise HTTPException(status_code=500, detail="Failed to register advocate")

    return {"success": True, "advocate": advocate}


@app.get("/api/advocates/{advocate_id}/results")
def advocate_results(
    advocate_id: str,
    date: Optional[str] = Query(default=None, description="Date in YYYY-MM-DD format"),
):
    if date is None:
        target_date = (date_cls.today() + timedelta(days=1)).isoformat()
    else:
        target_date = date
    results = get_results_for_advocate(advocate_id, target_date)
    return {"advocate_id": advocate_id, "date": target_date, "results": results}
