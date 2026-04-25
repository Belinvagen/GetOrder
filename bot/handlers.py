"""
Telegram Bot command handlers: /start (with deep linking pairing), /help, /myorders.
"""

from aiogram import Router
from aiogram.filters import CommandStart, Command, CommandObject
from aiogram.types import Message

from app.database import SessionLocal
from app.models import Restaurant

router = Router()


@router.message(CommandStart(deep_link=True))
async def cmd_start_deep_link(message: Message, command: CommandObject):
    """
    Handle /start with deep link payload.
    Expected format: /start pair_{6_char_code}
    Example: t.me/GetorderAdminBot?start=pair_a1b2c3
    """
    payload = command.args
    if not payload or not payload.startswith("pair_"):
        # Not a pairing command — show welcome
        await _send_welcome(message)
        return

    pairing_code = payload.replace("pair_", "", 1)
    if not pairing_code:
        await message.answer("❌ Неверный код привязки.")
        return

    db = SessionLocal()
    try:
        restaurant = (
            db.query(Restaurant)
            .filter(Restaurant.tg_pairing_code == pairing_code)
            .first()
        )

        if not restaurant:
            await message.answer(
                "❌ Ресторан с таким кодом привязки не найден.\n"
                "Проверьте код и попробуйте снова."
            )
            return

        # Save chat_id (works for both private chats and groups)
        restaurant.telegram_chat_id = message.chat.id
        db.commit()

        await message.answer(
            f"✅ <b>Чат успешно привязан!</b>\n\n"
            f"🏪 Ресторан: <b>{restaurant.name}</b>\n\n"
            f"Теперь сюда будут приходить новые заказы.\n"
            f"Нажимайте кнопки, чтобы принимать или отклонять их.",
            parse_mode="HTML",
        )

    except Exception as e:
        await message.answer(f"⚠️ Ошибка при привязке: {e}")
    finally:
        db.close()


@router.message(CommandStart())
async def cmd_start(message: Message):
    """Welcome message when user starts the bot (no deep link)."""
    await _send_welcome(message)


async def _send_welcome(message: Message):
    """Send the standard welcome message."""
    await message.answer(
        "👋 <b>Добро пожаловать в GetOrder!</b>\n\n"
        "Я помогу вам отслеживать ваши заказы.\n\n"
        "🍽 Оформите заказ через наше приложение, "
        "и я пришлю уведомление, когда он будет готов!\n\n"
        "📋 Команды:\n"
        "/help — Частые вопросы\n"
        "/myorders — Мои заказы\n\n"
        "🌐 <a href='http://localhost:3000'>Открыть приложение</a>",
        parse_mode="HTML",
        disable_web_page_preview=True,
    )


@router.message(Command("help"))
async def cmd_help(message: Message):
    """FAQ — базовые ответы на вопросы."""
    await message.answer(
        "❓ <b>Частые вопросы (FAQ)</b>\n\n"
        "━━━━━━━━━━━━━━━━━━━━\n\n"
        "🕐 <b>Сколько ждать заказ?</b>\n"
        "Среднее время приготовления — 15-30 минут. "
        "Вы можете выбрать удобное время при оформлении заказа.\n\n"
        "━━━━━━━━━━━━━━━━━━━━\n\n"
        "📱 <b>Как сделать заказ?</b>\n"
        "1. Откройте приложение\n"
        "2. Выберите ресторан\n"
        "3. Добавьте блюда в корзину\n"
        "4. Укажите тип заказа и время\n"
        "5. Оформите заказ!\n\n"
        "━━━━━━━━━━━━━━━━━━━━\n\n"
        "🥡 <b>С собой или в зале?</b>\n"
        "Вы можете выбрать «С собой» или «В зале» "
        "при оформлении. Цены одинаковые.\n\n"
        "━━━━━━━━━━━━━━━━━━━━\n\n"
        "🟢🟡🔴 <b>Что означает светофор?</b>\n"
        "Это уровень загруженности ресторана:\n"
        "🟢 Свободно — минимальное ожидание\n"
        "🟡 Умеренно — среднее ожидание\n"
        "🔴 Занято — возможны задержки\n\n"
        "━━━━━━━━━━━━━━━━━━━━\n\n"
        "💰 <b>Как оплатить?</b>\n"
        "Оплата при получении — наличными или картой.\n\n"
        "━━━━━━━━━━━━━━━━━━━━\n\n"
        "🔔 <b>Уведомления</b>\n"
        "Я пришлю сообщение, когда ваш заказ будет готов!\n\n"
        "📞 По другим вопросам обращайтесь к администратору ресторана.",
        parse_mode="HTML",
    )


@router.message(Command("myorders"))
async def cmd_myorders(message: Message):
    """Inform user about checking orders."""
    await message.answer(
        "📋 <b>Мои заказы</b>\n\n"
        "Отслеживайте свои заказы в приложении:\n"
        "🌐 <a href='http://localhost:3000/orders'>Открыть мои заказы</a>\n\n"
        "Я также пришлю уведомление, когда заказ будет готов! ✅",
        parse_mode="HTML",
        disable_web_page_preview=True,
    )


@router.message(Command("chatid"))
async def cmd_chatid(message: Message):
    """Show the chat ID — useful for debugging."""
    await message.answer(
        f"🆔 <b>Ваш Chat ID:</b> <code>{message.chat.id}</code>",
        parse_mode="HTML",
    )
