
import os
from urllib.parse import quote_plus
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY")
    if not SECRET_KEY:
        raise RuntimeError("SECRET_KEY is missing from the environment.")

    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "3306")
    DB_NAME = os.getenv("DB_NAME", "smart_complaint_db")
    DB_USER = os.getenv("DB_USER")
    DB_PASSWORD = os.getenv("DB_PASSWORD")

    CORS_ALLOWED_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "")
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE", "Lax")
    SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "true").lower() == "true"
    PERMANENT_SESSION_LIFETIME = int(os.getenv("SESSION_LIFETIME_SECONDS", "28800"))
    SESSION_COOKIE_SAMESITE = "None"
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True

    if SESSION_COOKIE_SAMESITE.lower() == "none" and not SESSION_COOKIE_SECURE:
        raise RuntimeError("SESSION_COOKIE_SECURE must be true when SameSite=None.")

    database_url = os.getenv("DATABASE_URL")

    if database_url:
        if database_url.startswith("mysql://"):
            database_url = database_url.replace(
                "mysql://", "mysql+pymysql://", 1
            )
    else:
        if not DB_USER:
            raise RuntimeError("DB_USER is missing from the environment.")
        if not DB_PASSWORD:
            raise RuntimeError("DB_PASSWORD is missing from the environment.")

        database_url = (
            f"mysql+pymysql://{quote_plus(DB_USER)}:"
            f"{quote_plus(DB_PASSWORD)}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
        )

    SQLALCHEMY_DATABASE_URI = database_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
