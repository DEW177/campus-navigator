"""
Application configuration, loaded from environment variables (.env).
"""
import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", "postgresql://user:password@localhost:5432/campus_navigator"
    )
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me")
    DEBUG: bool = os.getenv("DEBUG", "True") == "True"
    GEOAPIFY_API_KEY: str = os.getenv("GEOAPIFY_API_KEY", "").strip()
    GEOAPIFY_DAILY_REQUEST_LIMIT: int = max(0, int(os.getenv("GEOAPIFY_DAILY_REQUEST_LIMIT", "1000")))


settings = Settings()
