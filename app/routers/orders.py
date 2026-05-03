"""
Order routes: creation, status updates, and retrieval.
Integrates with Telegram notification service.
"""

import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_admin, require_restaurant_owner
from app.models import Order, Restaurant, User, Admin
from app.schemas.order import OrderCreate, OrderResponse, OrderStatusUpdate
from app.services.order_service import create_order
from app.services.notification_service import notify_restaurant_about_order, notify_order_ready, notify_customer_new_order

router = APIRouter(prefix="/api/orders", tags=["Orders"])


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def place_order(
    data: OrderCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Create a new order.
    If the restaurant has pos_mode=True, the response includes
    pos_message: "Отправлено в R-Keeper".
    Sends Telegram notification to the restaurant's linked chat.
    """
    order, pos_message = create_order(db, data)
    response = OrderResponse.model_validate(order)
    if pos_message:
        response.pos_message = pos_message

    # Send restaurant notification in background
    background_tasks.add_task(notify_restaurant_about_order, order.id, db)

    # Send customer confirmation in background (if they have TG)
    background_tasks.add_task(notify_customer_new_order, order.id, db)

    return response


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(order_id: int, db: Session = Depends(get_db)):
    """Get order details by ID."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    return order


@router.patch("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: int,
    data: OrderStatusUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    """
    Update order status (admin only).
    When status changes to 'ready', sends Telegram notification to the user.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    require_restaurant_owner(admin, order.restaurant_id)

    order.status = data.status
    db.commit()
    db.refresh(order)

    # Notify user when order is ready
    if data.status == "ready" and order.user_id:
        user = db.query(User).filter(User.id == order.user_id).first()
        restaurant = db.query(Restaurant).filter(Restaurant.id == order.restaurant_id).first()
        if user and user.tg_id:
            background_tasks.add_task(
                notify_order_ready,
                user.tg_id,
                restaurant.name if restaurant else "Ресторан",
                order.id,
            )

    return order


@router.get("/restaurant/{restaurant_id}", response_model=List[OrderResponse])
def get_restaurant_orders(
    restaurant_id: int,
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    """Get all orders for a restaurant (owner only)."""
    require_restaurant_owner(admin, restaurant_id)
    return (
        db.query(Order)
        .filter(Order.restaurant_id == restaurant_id)
        .order_by(Order.created_at.desc())
        .all()
    )
