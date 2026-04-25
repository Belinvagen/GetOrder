"""
Order business logic: validation, stop-list checks, pos_mode handling.
"""

import json
from typing import Optional

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models import Order, Restaurant, MenuItem, OrderStatus
from app.schemas.order import OrderCreate


def create_order(db: Session, order_data: OrderCreate) -> tuple[Order, Optional[str]]:
    """
    Create a new order with validation.
    
    Returns:
        Tuple of (created Order, pos_message or None)
    
    Raises:
        HTTPException if validation fails.
    """
    # 1. Verify restaurant exists
    restaurant = db.query(Restaurant).filter(Restaurant.id == order_data.restaurant_id).first()
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ресторан с id={order_data.restaurant_id} не найден",
        )

    # 2. Validate all menu items exist, are active, and belong to this restaurant
    total_amount = 0
    items_for_json = []

    for item in order_data.items:
        menu_item = db.query(MenuItem).filter(MenuItem.id == item.menu_item_id).first()
        if not menu_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Блюдо с id={item.menu_item_id} не найдено",
            )
        if not menu_item.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Блюдо '{menu_item.name}' находится в стоп-листе",
            )
        
        # Verify the item belongs to this restaurant (via category)
        if menu_item.category.restaurant_id != order_data.restaurant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Блюдо '{menu_item.name}' не принадлежит ресторану",
            )

        item_total = menu_item.price * item.quantity
        total_amount += item_total

        items_for_json.append({
            "menu_item_id": menu_item.id,
            "name": menu_item.name,
            "quantity": item.quantity,
            "price": menu_item.price,
            "subtotal": item_total,
        })

    # 3. Create the order
    order = Order(
        user_id=order_data.user_id,
        restaurant_id=order_data.restaurant_id,
        type=order_data.type,
        arrival_time=order_data.arrival_time,
        status=OrderStatus.pending,
        items_json=json.dumps(items_for_json, ensure_ascii=False),
        total_amount=total_amount,
    )

    db.add(order)
    db.commit()
    db.refresh(order)

    # 4. Check pos_mode — simulate R-Keeper integration
    pos_message = None
    if restaurant.pos_mode:
        pos_message = "Отправлено в R-Keeper"

    return order, pos_message
