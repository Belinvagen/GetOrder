"""
Callback query handlers:
  - Restaurant: Accept / Decline orders
  - Customer: Edit order items, confirm payment
"""

import json

from aiogram import Router
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton

from app.database import SessionLocal
from app.models import Order, OrderStatus, User

router = Router()


def _format_price(tiyns: int) -> str:
    return f"{tiyns / 100:,.0f} сом"


# ─── Restaurant callbacks ────────────────────────────────────────────────────

@router.callback_query(lambda c: c.data and c.data.startswith("order_accept:"))
async def accept_order(callback: CallbackQuery):
    order_id = int(callback.data.split(":")[1])
    db = SessionLocal()
    try:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            await callback.answer("Заказ не найден", show_alert=True)
            return
        if order.status != OrderStatus.pending:
            await callback.answer(f"Уже обработан ({order.status.value})", show_alert=True)
            return
        order.status = OrderStatus.cooking
        db.commit()
        username = callback.from_user.username or callback.from_user.full_name
        await callback.message.edit_text(
            f"✅ <b>Заказ #{order_id} принят в работу</b>\nПринял: @{username}",
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
    order_id = int(callback.data.split(":")[1])
    db = SessionLocal()
    try:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            await callback.answer("Заказ не найден", show_alert=True)
            return
        if order.status != OrderStatus.pending:
            await callback.answer(f"Уже обработан ({order.status.value})", show_alert=True)
            return
        order.status = OrderStatus.completed
        db.commit()
        await callback.message.edit_text(
            f"❌ <b>Заказ #{order_id} отклонён</b>", parse_mode="HTML",
        )
        await callback.answer("Заказ отклонён", show_alert=True)
    except Exception as e:
        db.rollback()
        await callback.answer(f"Ошибка: {e}", show_alert=True)
    finally:
        db.close()


# ─── Customer: Remove item from order ────────────────────────────────────────

@router.callback_query(lambda c: c.data and c.data.startswith("edrm:"))
async def edit_remove_item(callback: CallbackQuery):
    """Remove an item from order by index."""
    parts = callback.data.split(":")
    order_id = int(parts[1])
    item_index = int(parts[2])

    db = SessionLocal()
    try:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            await callback.answer("Заказ не найден", show_alert=True)
            return

        items = json.loads(order.items_json) if order.items_json else []
        if item_index < 0 or item_index >= len(items):
            await callback.answer("Позиция не найдена", show_alert=True)
            return

        removed = items.pop(item_index)
        removed_name = removed.get("name", "?")

        if not items:
            # Last item removed — cancel order
            order.status = OrderStatus.completed
            order.items_json = "[]"
            order.total_amount = 0
            db.commit()
            await callback.message.edit_text(
                f"🗑 <b>Заказ #{order_id} отменён</b>\n\n"
                f"Все позиции были удалены.",
                parse_mode="HTML",
            )
            await callback.answer("Заказ отменён")
            return

        # Recalculate total
        new_total = sum(
            it.get("subtotal", it.get("price", 0) * it.get("quantity", 1))
            for it in items
        )
        order.items_json = json.dumps(items, ensure_ascii=False)
        order.total_amount = new_total
        db.commit()

        # Rebuild message
        text = f"✏️ <b>Заказ #{order_id}</b> (обновлён)\n\n"
        buttons = []
        for i, item in enumerate(items):
            name = item.get("name", "?")
            qty = item.get("quantity", 1)
            price = item.get("subtotal", item.get("price", 0) * qty)
            text += f"{i+1}. {name} × {qty} — {_format_price(price)}\n"
            buttons.append([
                InlineKeyboardButton(
                    text=f"❌ {name}",
                    callback_data=f"edrm:{order_id}:{i}"
                )
            ])

        text += f"\n💰 <b>Итого: {_format_price(new_total)}</b>"
        text += f"\n\n✅ «{removed_name}» убран из заказа"

        buttons.append([
            InlineKeyboardButton(text="⏰ Время", callback_data=f"edtime:{order_id}"),
            InlineKeyboardButton(text="✖️ Закрыть", callback_data=f"edclose:{order_id}"),
        ])

        await callback.message.edit_text(
            text, parse_mode="HTML",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=buttons),
        )
        await callback.answer(f"«{removed_name}» удалён")

    except Exception as e:
        db.rollback()
        await callback.answer(f"Ошибка: {e}", show_alert=True)
    finally:
        db.close()


# ─── Customer: Change arrival time ───────────────────────────────────────────

@router.callback_query(lambda c: c.data and c.data.startswith("edtime:"))
async def edit_time_prompt(callback: CallbackQuery):
    order_id = int(callback.data.split(":")[1])
    buttons = []
    for mins in [30, 45, 60, 90]:
        buttons.append(
            InlineKeyboardButton(
                text=f"⏰ {mins} мин",
                callback_data=f"settime:{order_id}:{mins}"
            )
        )

    await callback.message.edit_text(
        f"⏰ <b>Выберите новое время прибытия для заказа #{order_id}:</b>",
        parse_mode="HTML",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[buttons]),
    )
    await callback.answer()


@router.callback_query(lambda c: c.data and c.data.startswith("settime:"))
async def edit_set_time(callback: CallbackQuery):
    parts = callback.data.split(":")
    order_id = int(parts[1])
    minutes = int(parts[2])

    from datetime import datetime, timezone, timedelta

    db = SessionLocal()
    try:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            await callback.answer("Заказ не найден", show_alert=True)
            return

        new_time = datetime.now(timezone.utc) + timedelta(minutes=minutes)
        order.arrival_time = new_time
        db.commit()

        bishkek_tz = timezone(timedelta(hours=6))
        local_time = new_time.astimezone(bishkek_tz).strftime("%H:%M")

        await callback.message.edit_text(
            f"✅ <b>Время прибытия обновлено!</b>\n\n"
            f"Заказ #{order_id}\n"
            f"⏰ Новое время: <b>{local_time}</b> (через {minutes} мин)",
            parse_mode="HTML",
        )
        await callback.answer(f"Время: {local_time}")
    except Exception as e:
        db.rollback()
        await callback.answer(f"Ошибка: {e}", show_alert=True)
    finally:
        db.close()


# ─── Customer: Close edit menu ───────────────────────────────────────────────

@router.callback_query(lambda c: c.data and c.data.startswith("edclose:"))
async def edit_close(callback: CallbackQuery):
    order_id = callback.data.split(":")[1]
    await callback.message.edit_text(
        f"✅ Редактирование заказа #{order_id} завершено.",
        parse_mode="HTML",
    )
    await callback.answer()


# ─── Customer: Payment confirmation ──────────────────────────────────────────

@router.callback_query(lambda c: c.data and c.data.startswith("paid:"))
async def confirm_payment(callback: CallbackQuery):
    order_id = int(callback.data.split(":")[1])

    db = SessionLocal()
    try:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            await callback.answer("Заказ не найден", show_alert=True)
            return

        total_som = order.total_amount / 100

        await callback.message.edit_caption(
            caption=(
                f"✅ <b>Оплата заказа #{order_id} подтверждена!</b>\n\n"
                f"💰 Сумма: <b>{total_som:,.0f} сом</b>\n\n"
                f"Спасибо! Мы уведомим вас, когда заказ будет готов. 🍽"
            ),
            parse_mode="HTML",
        )
        await callback.answer("Оплата подтверждена! ✅", show_alert=True)
    except Exception as e:
        await callback.answer(f"Ошибка: {e}", show_alert=True)
    finally:
        db.close()


# ─── Customer: Inline button "Pay QR" from order notification ────────────────

@router.callback_query(lambda c: c.data and c.data.startswith("payqr:"))
async def inline_pay_qr(callback: CallbackQuery):
    """When customer clicks 'Pay QR' button in order confirmation message."""
    order_id = int(callback.data.split(":")[1])
    await callback.answer(
        f"Используйте команду: /pay {order_id}",
        show_alert=True,
    )


# ─── Customer: Inline button "Edit" from order notification ──────────────────

@router.callback_query(lambda c: c.data and c.data.startswith("editstart:"))
async def inline_edit_start(callback: CallbackQuery):
    """When customer clicks 'Edit' button in order confirmation message."""
    order_id = int(callback.data.split(":")[1])
    await callback.answer(
        f"Используйте команду: /editorder {order_id}",
        show_alert=True,
    )

