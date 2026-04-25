"""
Application configuration loaded from environment variables.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./data/getorder.db"
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    TELEGRAM_BOT_TOKEN: str = ""
    ADMIN_CHAT_ID: int = 0  # Telegram chat/group ID for admin notifications
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "admin123"
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""
    SUPERADMIN_USERNAME: str = "root"
    SUPERADMIN_PASSWORD: str = "root123"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
