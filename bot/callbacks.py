"""
Callback query handlers for restaurant inline buttons (Accept / Decline).
Directly updates order status in DB — no HTTP round-trips.
"""

from aiogram import Router
from aiogram.types import CallbackQuery

from app.database import SessionLocal
from app.models import Order, OrderStatus

router = Router()


@router.callback_query(lambda c: c.data and c.data.startswith("order_accept:"))
async def accept_order(callback: CallbackQuery):
    """Restaurant accepts the order → status changes to 'cooking'."""
    order_id = int(callback.data.split(":")[1])

    db = SessionLocal()
    try:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            await callback.answer("Заказ не найден", show_alert=True)
            return

        if order.status != OrderStatus.pending:
            await callback.answer(
                f"Заказ уже обработан (статус: {order.status.value})",
                show_alert=True,
            )
            return

        order.status = OrderStatus.cooking
        db.commit()

        username = callback.from_user.username or callback.from_user.full_name
        await callback.message.edit_text(
            f"✅ <b>Заказ #{order_id} принят в работу</b>\n"
            f"Принял: @{username}",
            parse_mode="HTML",
        )
        await callback.answer("Заказ принят! 🍳")

    except Exception as e:
        db.rollback()
        await callback.answer(f"Ошибка: {e}", show_alert=True)
    finally:
        db.close()


@router.callback_query(lambda c: c.data and c.data.startswith("order_decline:"))
async def decline_order(callback: CallbackQuery):
    """Restaurant declines the order → status changes to 'cancelled'."""
    order_id = int(callback.data.split(":")[1])

    db = SessionLocal()
    try:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            await callback.answer("Заказ не найден", show_alert=True)
            return

        if order.status != OrderStatus.pending:
            await callback.answer(
                f"Заказ уже обработан (статус: {order.status.value})",
                show_alert=True,
            )
            return

        order.status = OrderStatus.completed  # or add a 'cancelled' status
        db.commit()

        await callback.message.edit_text(
            f"❌ <b>Заказ #{order_id} отклонён</b>",
            parse_mode="HTML",
        )
        await callback.answer("Заказ отклонён", show_alert=True)

    except Exception as e:
        db.rollback()
        await callback.answer(f"Ошибка: {e}", show_alert=True)
    finally:
        db.close()
