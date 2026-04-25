"""
Notification service — sends Telegram messages via Bot API.
Used by the FastAPI backend to notify restaurants and users.
Calls the Telegram Bot API directly via httpx (no aiogram needed in FastAPI process).
"""

import json
import logging
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

TELEGRAM_API = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}"


async def send_message(chat_id: int, text: str, reply_markup: dict | None = None) -> bool:
    """Send a message via Telegram Bot API."""
    if not settings.TELEGRAM_BOT_TOKEN:
        logger.warning(f"[BOT] Token not set. Would send to {chat_id}: {text[:100]}...")
        return False

    payload: dict = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
    }
    if reply_markup:
        payload["reply_markup"] = json.dumps(reply_markup)

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(f"{TELEGRAM_API}/sendMessage", json=payload)
            if resp.status_code == 200:
                return True
            logger.error(f"[BOT] Telegram API error: {resp.status_code} {resp.text}")
            return False
    except Exception as e:
        logger.error(f"[BOT] Failed to send message: {e}")
        return False


async def notify_order_ready(user_tg_id: int, restaurant_name: str, order_id: int):
    """
    Notify user that their order is ready.
    Called when order status changes to 'ready'.
    """
    text = (
        f"✅ <b>Ваш заказ #{order_id} готов!</b>\n\n"
        f"🍽 Ресторан: <b>{restaurant_name}</b>\n\n"
        f"Заберите ваш заказ. Приятного аппетита! 😋"
    )
    await send_message(user_tg_id, text)


async def notify_restaurant_about_order(order_id: int, db_session):
    """
    Send a new-order notification to the restaurant's linked Telegram chat.
    Looks up the restaurant by order → restaurant → telegram_chat_id.
    If no chat is linked, falls back to global ADMIN_CHAT_ID (if set).
    """
    from app.models import Order, Restaurant

    order = db_session.query(Order).filter(Order.id == order_id).first()
    if not order:
        logger.warning(f"[NOTIFY] Order #{order_id} not found")
        return

    restaurant = (
        db_session.query(Restaurant)
        .filter(Restaurant.id == order.restaurant_id)
        .first()
    )
    if not restaurant:
        logger.warning(f"[NOTIFY] Restaurant for order #{order_id} not found")
        return

    # Determine target chat
    chat_id = restaurant.telegram_chat_id or settings.ADMIN_CHAT_ID
    if not chat_id:
        logger.info(f"[NOTIFY] No chat configured for restaurant '{restaurant.name}', skipping")
        return

    # Build message
    order_type = "🥡 С собой" if (order.type.value if hasattr(order.type, 'value') else order.type) == "takeout" else "🍽 В зале"
    total = order.total_amount / 100

    items = []
    try:
        items = json.loads(order.items_json) if order.items_json else []
    except (json.JSONDecodeError, TypeError):
        pass

    items_text = ""
    for item in items:
        items_text += f"  • {item.get('name', '?')} × {item.get('quantity', 1)}\n"

    arrival = ""
    if order.arrival_time:
        try:
            from datetime import datetime, timezone, timedelta
            bishkek_tz = timezone(timedelta(hours=6))
            if isinstance(order.arrival_time, datetime):
                local_time = order.arrival_time.astimezone(bishkek_tz)
                arrival = f"\n⏰ Время прибытия клиента: {local_time.strftime('%H:%M')}"
            else:
                arrival = f"\n⏰ Время прибытия клиента: {order.arrival_time}"
        except Exception:
            pass

    text = (
        f"🔥 <b>Новый заказ #{order_id}!</b>\n\n"
        f"👤 Клиент: <b>{order.customer_name}</b>\n"
        f"📞 Телефон: <b>{order.customer_phone}</b>\n\n"
        f"🏪 {restaurant.name}\n"
        f"📦 {order_type}{arrival}\n\n"
        f"📝 Состав:\n{items_text}\n"
        f"💰 <b>Итого: {total:,.0f} сом</b>"
    )

    reply_markup = {
        "inline_keyboard": [
            [
                {"text": "В работу 🟡", "callback_data": f"order_accept:{order_id}"},
                {"text": "Отклонить ❌", "callback_data": f"order_decline:{order_id}"},
            ]
        ]
    }

    await send_message(chat_id, text, reply_markup)
