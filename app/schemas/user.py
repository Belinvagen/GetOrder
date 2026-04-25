"""
Pydantic schemas for User-related operations.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    tg_id: int
    name: str = Field(..., min_length=1, max_length=200)
    phone: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    phone: Optional[str] = None
    points: Optional[int] = None
    discount: Optional[float] = None


class UserResponse(BaseModel):
    id: int
    tg_id: int
    name: str
    phone: Optional[str] = None
    points: int
    discount: float
    created_at: datetime

    model_config = {"from_attributes": True}


class TelegramAuthData(BaseModel):
    """Data received from Telegram Login Widget."""
    id: int
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None
    auth_date: int
    hash: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Optional[UserResponse] = None
    restaurant_id: Optional[int] = None


class AdminLogin(BaseModel):
    username: str
    password: str


class AdminRegister(BaseModel):
    """Registration data for a new restaurant admin."""
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=6)
    restaurant_name: str = Field(..., min_length=1, max_length=200)
    description: str = ""
    address: str = ""
