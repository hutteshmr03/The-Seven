from pydantic_settings import BaseSettings


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

    class Config:
        env_file = ".env"


settings = Settings()
