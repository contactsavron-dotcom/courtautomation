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
import requests as http_requests

from app.db.supabase_client import (
    create_advocate,
    create_advocate_with_auth,
    get_advocate_by_auth_id,
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


# --- Auth endpoints ---

class AuthRegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None
    bar_council_id: str
    tshc_computer_code: Optional[str] = None


class AuthLoginRequest(BaseModel):
    email: str
    password: str


@app.post("/api/auth/register")
@limiter.limit("5/minute")
def auth_register(body: AuthRegisterRequest, request: Request):
    # Check duplicate email
    existing = get_advocate_by_email(body.email.strip())
    if existing:
        raise HTTPException(status_code=409, detail="An advocate with this email is already registered")

    # Parse bar_council_id
    parts = body.bar_council_id.strip().split("/")
    if len(parts) != 3:
        raise HTTPException(status_code=400, detail="Bar Council ID must be in format XX/DIGITS/YYYY")
    bar_state_code, bar_number, bar_year = parts

    # Create Supabase Auth user
    supabase_url = settings.SUPABASE_URL
    signup_resp = http_requests.post(
        f"{supabase_url}/auth/v1/signup",
        headers={
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/json",
        },
        json={"email": body.email.strip(), "password": body.password},
    )

    if signup_resp.status_code not in (200, 201):
        error_data = signup_resp.json()
        error_msg = error_data.get("msg") or error_data.get("message") or error_data.get("error_description") or "Signup failed"
        logger.error(f"Supabase Auth signup failed: {error_data}")
        raise HTTPException(status_code=400, detail=str(error_msg))

    auth_data = signup_resp.json()
    auth_user_id = auth_data.get("id") or (auth_data.get("user", {}) or {}).get("id")
    if not auth_user_id:
        logger.error(f"No user ID in Supabase Auth response: {auth_data}")
        raise HTTPException(status_code=500, detail="Failed to create auth user")

    # Create advocate record linked to auth user
    advocate_data = {
        "name": body.name.strip(),
        "email": body.email.strip(),
        "phone": body.phone.strip() if body.phone else None,
        "bar_council_id": body.bar_council_id.strip(),
        "bar_state_code": bar_state_code,
        "bar_number": bar_number,
        "bar_year": bar_year,
        "tshc_computer_code": body.tshc_computer_code.strip() if body.tshc_computer_code else None,
    }

    try:
        advocate = create_advocate_with_auth(auth_user_id, advocate_data)
    except Exception as e:
        logger.error(f"Failed to create advocate after auth signup: {e}")
        if "duplicate" in str(e).lower():
            raise HTTPException(status_code=409, detail="Advocate with this Bar Council ID already exists")
        raise HTTPException(status_code=500, detail="Failed to register advocate")

    return {"success": True, "message": "Registration successful. You can now log in."}


@app.post("/api/auth/login")
def auth_login(body: AuthLoginRequest):
    supabase_url = settings.SUPABASE_URL
    anon_key = settings.SUPABASE_ANON_KEY

    # Authenticate via Supabase Auth
    token_resp = http_requests.post(
        f"{supabase_url}/auth/v1/token?grant_type=password",
        headers={
            "apikey": anon_key,
            "Content-Type": "application/json",
        },
        json={"email": body.email.strip(), "password": body.password},
    )

    if token_resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token_data = token_resp.json()
    access_token = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token")
    user_id = token_data.get("user", {}).get("id")

    if not access_token or not user_id:
        raise HTTPException(status_code=500, detail="Authentication failed")

    # Fetch advocate record
    advocate = get_advocate_by_auth_id(user_id)
    if not advocate:
        # Fallback: try email lookup for pre-existing advocates
        advocate = get_advocate_by_email(body.email.strip())

    if not advocate:
        raise HTTPException(status_code=404, detail="No advocate profile found. Please register first.")

    return {
        "success": True,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "advocate": {
            "id": advocate["id"],
            "name": advocate["name"],
            "email": advocate["email"],
            "bar_council_id": advocate["bar_council_id"],
            "tshc_cis_code": advocate.get("tshc_computer_code") or advocate.get("tshc_cis_code"),
            "plan_tier": advocate.get("plan_tier", "trial"),
        },
    }


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

@app.get("/api/advocates/lookup")
def lookup_advocate(email: str = Query(..., description="Advocate email address")):
    advocate = get_advocate_by_email(email)
    if not advocate:
        return {"success": False, "message": "Not found"}
    return {"success": True, "advocate": advocate}


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
