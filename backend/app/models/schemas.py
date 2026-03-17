from pydantic import BaseModel, EmailStr, field_validator
import re


class CaseEntry(BaseModel):
    serial_no: str | None = None
    case_no: str
    parties_petitioner: str = ""
    parties_respondent: str = ""
    petitioner_advocate: str = ""
    respondent_advocate: str = ""
    court_name: str | None = None
    district: str | None = None
    status: str | None = None


class ScrapeResult(BaseModel):
    court_source: str
    hearing_date: str
    total_cases: int = 0
    cases: list[CaseEntry] = []
    raw_html: str | None = None


class AdvocateRegister(BaseModel):
    name: str
    email: EmailStr
    phone: str | None = None
    bar_council_id: str
    tshc_computer_code: str | None = None
    case_number_for_cis: str | None = None

    @field_validator("name")
    @classmethod
    def name_must_not_be_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name must not be empty")
        return v.strip()

    @field_validator("bar_council_id")
    @classmethod
    def validate_bar_council_id(cls, v: str) -> str:
        if not re.match(r"^[A-Z]{2}/\d{1,5}/\d{4}$", v):
            raise ValueError("bar_council_id must match format: XX/DIGITS/YYYY (e.g. TS/315/2017)")
        return v


class ScrapeResponse(BaseModel):
    success: bool
    run_id: str | None = None
    advocates_checked: int = 0
    total_cases_found: int = 0
    emails_sent: int = 0
    errors_count: int = 0
