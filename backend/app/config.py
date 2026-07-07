import os
from typing import Optional
from pydantic_settings import BaseSettings

# Clean CLOUDINARY_URL environment variable before any library auto-initializes
_cloudinary_url = os.environ.get("CLOUDINARY_URL")
if _cloudinary_url:
    _cloudinary_url = _cloudinary_url.strip()
    _idx = _cloudinary_url.find("cloudinary://")
    if _idx != -1:
        _cloudinary_url = _cloudinary_url[_idx:].strip()
    _cloudinary_url = _cloudinary_url.strip("\"'")
    os.environ["CLOUDINARY_URL"] = _cloudinary_url


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg2://friendzone_user:friendzone_pass@localhost:5432/friendzone"
    secret_key: str = "change-this-to-a-long-random-string"
    access_token_expire_minutes: int = 10080  # 7 days
    algorithm: str = "HS256"

    leader_username: str = "leader"
    leader_password: str = "changeme123"
    leader_nickname: str = "The Boss"
    leader_full_name: str = "Group Leader"

    frontend_origin: str = "http://localhost:5173"

    upload_dir: str = "uploads"
    max_storage_bytes: int = 50 * 1024 * 1024  # 50 MB default storage limit
    cloudinary_url: Optional[str] = None

    class Config:
        env_file = ".env"


settings = Settings()
