"""
Pydantic schemas for Restaurant-related operations.
"""

from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from app.models import TrafficLight


class RestaurantCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    address: Optional[str] = None
    traffic_light: TrafficLight = TrafficLight.green
    pos_mode: bool = False


class RestaurantUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    address: Optional[str] = None
    pos_mode: Optional[bool] = None


class TrafficLightUpdate(BaseModel):
    traffic_light: TrafficLight


class RestaurantResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    address: Optional[str] = None
    traffic_light: TrafficLight
    pos_mode: bool
    telegram_chat_id: Optional[int] = None
    tg_pairing_code: Optional[str] = None
    logo_url: Optional[str] = None
    cover_url: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("created_at", mode="before")
    @classmethod
    def ensure_utc(cls, v: datetime) -> datetime:
        if isinstance(v, datetime) and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v
