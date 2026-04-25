"""
Pydantic schemas for Category and MenuItem operations.
"""

from typing import Optional, List

from pydantic import BaseModel, Field


class MenuItemCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    price: int = Field(..., gt=0, description="Price in smallest currency unit")
    image_url: Optional[str] = None
    is_active: bool = True


class MenuItemUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    price: Optional[int] = Field(None, gt=0)
    image_url: Optional[str] = None
    is_active: Optional[bool] = None


class MenuItemResponse(BaseModel):
    id: int
    category_id: int
    name: str
    description: Optional[str] = None
    price: int
    image_url: Optional[str] = None
    is_active: bool

    model_config = {"from_attributes": True}


class StopListUpdate(BaseModel):
    """Toggle stop-list status for a menu item."""
    is_active: bool


class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    sort_order: int = 0


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    sort_order: Optional[int] = None


class CategoryResponse(BaseModel):
    id: int
    restaurant_id: int
    name: str
    sort_order: int
    items: List[MenuItemResponse] = []

    model_config = {"from_attributes": True}


class FullMenuResponse(BaseModel):
    """Full restaurant menu grouped by categories."""
    restaurant_id: int
    restaurant_name: str
    categories: List[CategoryResponse]
