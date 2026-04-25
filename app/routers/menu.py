"""
Menu management routes: categories, menu items, and stop-list control.
All admin endpoints verify restaurant ownership.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_admin, require_restaurant_owner
from app.models import Restaurant, Category, MenuItem, Admin
from app.schemas.menu import (
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
    MenuItemCreate,
    MenuItemResponse,
    MenuItemUpdate,
    StopListUpdate,
    FullMenuResponse,
)

router = APIRouter(prefix="/api", tags=["Menu"])


# ─── Categories ───────────────────────────────────────────────────────────────

@router.post(
    "/restaurants/{restaurant_id}/categories",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_category(
    restaurant_id: int,
    data: CategoryCreate,
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    """Create a menu category for a restaurant (owner only)."""
    require_restaurant_owner(admin, restaurant_id)

    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ресторан с id={restaurant_id} не найден",
        )

    category = Category(
        restaurant_id=restaurant_id,
        name=data.name,
        sort_order=data.sort_order,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.put("/categories/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    data: CategoryUpdate,
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    """Update a category (owner only)."""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Категория с id={category_id} не найдена",
        )

    require_restaurant_owner(admin, category.restaurant_id)

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)

    db.commit()
    db.refresh(category)
    return category


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    """Delete a category and all its items (owner only)."""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Категория с id={category_id} не найдена",
        )

    require_restaurant_owner(admin, category.restaurant_id)

    db.delete(category)
    db.commit()


# ─── Full Menu ────────────────────────────────────────────────────────────────

@router.get("/restaurants/{restaurant_id}/menu", response_model=FullMenuResponse)
def get_full_menu(restaurant_id: int, db: Session = Depends(get_db)):
    """Get the full menu of a restaurant grouped by categories (public)."""
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ресторан с id={restaurant_id} не найден",
        )

    categories = (
        db.query(Category)
        .filter(Category.restaurant_id == restaurant_id)
        .order_by(Category.sort_order)
        .all()
    )

    return FullMenuResponse(
        restaurant_id=restaurant.id,
        restaurant_name=restaurant.name,
        categories=[CategoryResponse.model_validate(c) for c in categories],
    )


# ─── Menu Items ───────────────────────────────────────────────────────────────

@router.post(
    "/categories/{category_id}/items",
    response_model=MenuItemResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_menu_item(
    category_id: int,
    data: MenuItemCreate,
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    """Add a menu item to a category (owner only)."""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Категория с id={category_id} не найдена",
        )

    require_restaurant_owner(admin, category.restaurant_id)

    menu_item = MenuItem(
        category_id=category_id,
        name=data.name,
        description=data.description,
        price=data.price,
        image_url=data.image_url,
        is_active=data.is_active,
    )
    db.add(menu_item)
    db.commit()
    db.refresh(menu_item)
    return menu_item


@router.patch("/items/{item_id}", response_model=MenuItemResponse)
def update_menu_item(
    item_id: int,
    data: MenuItemUpdate,
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    """Update a menu item (owner only)."""
    menu_item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not menu_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Блюдо с id={item_id} не найдено",
        )

    require_restaurant_owner(admin, menu_item.category.restaurant_id)

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(menu_item, field, value)

    db.commit()
    db.refresh(menu_item)
    return menu_item


@router.patch("/items/{item_id}/toggle-active", response_model=MenuItemResponse)
def toggle_stop_list(
    item_id: int,
    data: StopListUpdate,
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    """Toggle a menu item's stop-list status (owner only)."""
    menu_item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not menu_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Блюдо с id={item_id} не найдено",
        )

    require_restaurant_owner(admin, menu_item.category.restaurant_id)

    menu_item.is_active = data.is_active
    db.commit()
    db.refresh(menu_item)
    return menu_item


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_menu_item(
    item_id: int,
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    """Delete a menu item (owner only)."""
    menu_item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not menu_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Блюдо с id={item_id} не найдено",
        )

    require_restaurant_owner(admin, menu_item.category.restaurant_id)

    db.delete(menu_item)
    db.commit()
