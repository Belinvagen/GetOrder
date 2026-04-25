"""
Pydantic schemas for Order-related operations.
"""

from datetime import datetime, timezone
from typing import Optional, List

from pydantic import BaseModel, Field, field_validator

from app.models import OrderType, OrderStatus


class OrderItemSchema(BaseModel):
    """Single item within an order."""
    menu_item_id: int
    name: str
    quantity: int = Field(..., gt=0)
    price: int = Field(..., gt=0, description="Unit price at time of order")


class OrderCreate(BaseModel):
    user_id: Optional[int] = None  # Optional — can order without TG auth
    restaurant_id: int
    customer_name: str = Field(..., min_length=1, max_length=200)
    customer_phone: str = Field(..., min_length=5, max_length=30)
    type: OrderType = OrderType.takeout
    arrival_time: Optional[datetime] = None
    items: List[OrderItemSchema] = Field(..., min_length=1)


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class OrderResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    restaurant_id: int
    customer_name: str
    customer_phone: str
    type: OrderType
    arrival_time: Optional[datetime] = None
    status: OrderStatus
    items_json: str
    total_amount: int
    created_at: datetime
    pos_message: Optional[str] = None  # Filled when pos_mode is True

    model_config = {"from_attributes": True}

    @field_validator("created_at", mode="before")
    @classmethod
    def ensure_utc(cls, v: datetime) -> datetime:
        """Attach UTC tzinfo to naive datetimes so JSON serializes with +00:00."""
        if isinstance(v, datetime) and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v
