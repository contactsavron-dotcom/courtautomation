import json
from datetime import datetime

from supabase import create_client, Client

from app.config import settings

supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def get_active_advocates() -> list[dict]:
    res = supabase.table("advocates").select("*").eq("is_active", True).execute()
    return res.data


def get_advocate_by_id(advocate_id: str) -> dict | None:
    res = supabase.table("advocates").select("*").eq("id", advocate_id).execute()
    return res.data[0] if res.data else None


def get_advocate_by_email(email: str) -> dict | None:
    res = supabase.table("advocates").select("*").eq("email", email).execute()
    return res.data[0] if res.data else None


def create_advocate(data: dict) -> dict:
    res = supabase.table("advocates").insert(data).execute()
    return res.data[0]


def store_daily_result(
    advocate_id: str,
    hearing_date: str,
    court_source: str,
    total_cases: int,
    cases_json: list,
    raw_html: str,
) -> dict:
    row = {
        "advocate_id": advocate_id,
        "hearing_date": hearing_date,
        "court_source": court_source,
        "total_cases": total_cases,
        "cases_json": cases_json,
        "raw_html": raw_html,
        "scraped_at": datetime.utcnow().isoformat(),
    }
    res = (
        supabase.table("daily_results")
        .upsert(row, on_conflict="advocate_id,hearing_date,court_source")
        .execute()
    )
    return res.data[0]


def get_results_for_advocate(advocate_id: str, date: str) -> list[dict]:
    res = (
        supabase.table("daily_results")
        .select("*")
        .eq("advocate_id", advocate_id)
        .eq("hearing_date", date)
        .execute()
    )
    return res.data


def log_notification(
    advocate_id: str,
    hearing_date: str,
    channel: str,
    status: str,
    subject: str,
    error_msg: str | None = None,
) -> dict:
    row = {
        "advocate_id": advocate_id,
        "hearing_date": hearing_date,
        "channel": channel,
        "status": status,
        "message_subject": subject,
        "error_message": error_msg,
    }
    if status == "sent":
        row["sent_at"] = datetime.utcnow().isoformat()
    res = supabase.table("notification_logs").insert(row).execute()
    return res.data[0]


def was_notification_sent_today(advocate_id: str, hearing_date: str) -> bool:
    """Check if an email was already successfully sent to this advocate for this date."""
    result = (
        supabase.table("notification_logs")
        .select("id")
        .eq("advocate_id", advocate_id)
        .eq("hearing_date", hearing_date)
        .eq("channel", "email")
        .eq("status", "sent")
        .execute()
    )
    return len(result.data) > 0


def log_scrape_start(run_id: str, court_source: str) -> str:
    row = {
        "run_id": run_id,
        "court_source": court_source,
        "status": "running",
    }
    res = supabase.table("scrape_logs").insert(row).execute()
    return res.data[0]["id"]


def create_advocate_with_auth(auth_user_id: str, data: dict) -> dict | None:
    result = supabase.table("advocates").insert({
        **data,
        "auth_user_id": auth_user_id,
    }).execute()
    return result.data[0] if result.data else None


def get_advocate_by_auth_id(auth_user_id: str) -> dict | None:
    res = supabase.table("advocates").select("*").eq("auth_user_id", auth_user_id).execute()
    return res.data[0] if res.data else None


def log_scrape_complete(
    log_id: str,
    status: str,
    advocates_checked: int,
    cases_found: int,
    errors: list,
) -> dict:
    row = {
        "status": status,
        "completed_at": datetime.utcnow().isoformat(),
        "advocates_checked": advocates_checked,
        "cases_found": cases_found,
        "errors": errors,
    }
    res = supabase.table("scrape_logs").update(row).eq("id", log_id).execute()
    return res.data[0]
