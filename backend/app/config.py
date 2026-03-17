from pathlib import Path
from pydantic_settings import BaseSettings

ENV_PATH = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    RESEND_API_KEY: str
    TWOCAPTCHA_API_KEY: str = "PLACEHOLDER"
    DAILY_SCRAPE_SECRET: str
    APP_URL: str = "http://localhost:3000"
    ADMIN_EMAIL: str

    model_config = {"env_file": str(ENV_PATH), "env_file_encoding": "utf-8"}


settings = Settings()
