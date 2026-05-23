"""
Database configuration for MySQL (SQLAlchemy) and MongoDB (Motor).
"""

from pathlib import Path
from pydantic_settings import BaseSettings
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from motor.motor_asyncio import AsyncIOMotorClient


# ──────────────────────────────────────────────
#  Settings — read from .env
# ──────────────────────────────────────────────
class Settings(BaseSettings):
    MYSQL_URL: str = "mysql+pymysql://admin:123456@localhost:3308/tn"
    MONGO_URL: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "tn_db"

    # JWT
    SECRET_KEY: str = "tn_super_secret_key_change_in_production_2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # Google Drive
    GOOGLE_DRIVE_CREDENTIALS_FILE: str = "credentials.json"
    GOOGLE_DRIVE_FOLDER_ID: str = ""

    # Gemini AI
    GEMINI_API_KEY: str = ""

    # Gmail SMTP
    SMTP_EMAIL: str = ""
    SMTP_APP_PASSWORD: str = ""

    # VirusTotal
    VIRUSTOTAL_API_KEY: str = ""

    class Config:
        env_file = str(Path(__file__).resolve().parents[3] / ".env")


settings = Settings()


# ──────────────────────────────────────────────
#  MySQL — SQLAlchemy
# ──────────────────────────────────────────────
engine = create_engine(settings.MYSQL_URL, echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a MySQL session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all MySQL tables defined by Base subclasses."""
    # Import models so they register with Base.metadata
    import tn.models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    print("[OK] MySQL tables created successfully!")


# ──────────────────────────────────────────────
#  MongoDB — Motor (async)
# ──────────────────────────────────────────────
mongo_client: AsyncIOMotorClient | None = None
mongo_db = None


def connect_mongo():
    """Open the MongoDB connection."""
    global mongo_client, mongo_db
    mongo_client = AsyncIOMotorClient(settings.MONGO_URL)
    mongo_db = mongo_client[settings.MONGO_DB_NAME]
    print(f"[OK] Connected to MongoDB: {settings.MONGO_DB_NAME}")


def close_mongo():
    """Close the MongoDB connection."""
    global mongo_client
    if mongo_client:
        mongo_client.close()
        print("[OK] MongoDB connection closed.")


def get_mongo_db():
    """Return the Motor database instance."""
    return mongo_db
