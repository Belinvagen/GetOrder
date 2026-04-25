"""
Telegram Bot command handlers: /start with registration flow,
/help, /myorders, /bonus.
"""

from aiogram import Router, F
from aiogram.filters import CommandStart, Command, CommandObject
from aiogram.types import Message, ReplyKeyboardMarkup, KeyboardButton, ReplyKeyboardRemove

from app.database import SessionLocal
from app.models import Restaurant, User

router = Router()

WEBAPP_URL = "https://get-order-lemon.vercel.app"

# Welcome bonus for new users
WELCOME_POINTS = 100
WELCOME_DISCOUNT = 5.0  # 5%


# ─── /start ──────────────────────────────────────────────────────────────────

@router.message(CommandStart(deep_link=True))
async def cmd_start_deep_link(message: Message, command: CommandObject):
    """
    Handle /start with deep link payload.
    Expected format: /start pair_{6_char_code}
    """
    payload = command.args
    if not payload or not payload.startswith("pair_"):
        await _handle_registration(message)
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
    """Welcome + auto-register."""
    await _handle_registration(message)


async def _handle_registration(message: Message):
    """Check if user exists, if not — register with welcome bonus."""
    tg_id = message.from_user.id
    tg_name = message.from_user.full_name or "Гость"

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.tg_id == tg_id).first()

        if user:
            # Existing user
            await message.answer(
                f"👋 <b>С возвращением, {user.name}!</b>\n\n"
                f"💰 Ваши бонусы: <b>{user.points} баллов</b>\n"
                f"🏷 Скидка: <b>{user.discount:.0f}%</b>\n\n"
                f"🍽 <a href='{WEBAPP_URL}'>Открыть меню</a>\n"
                f"📋 <a href='{WEBAPP_URL}/orders'>Мои заказы</a>\n\n"
                f"Отправьте /help для помощи",
                parse_mode="HTML",
                disable_web_page_preview=True,
            )
        else:
            # New user — ask for phone
            phone_keyboard = ReplyKeyboardMarkup(
                keyboard=[
                    [KeyboardButton(text="📱 Поделиться номером", request_contact=True)],
                    [KeyboardButton(text="❌ Пропустить")],
                ],
                resize_keyboard=True,
                one_time_keyboard=True,
            )

            await message.answer(
                f"👋 <b>Добро пожаловать в GetOrder!</b>\n\n"
                f"Я помогу вам заказывать еду и следить за готовностью.\n\n"
                f"🎁 <b>Подарок за регистрацию:</b>\n"
                f"  • {WELCOME_POINTS} бонусных баллов\n"
                f"  • Скидка {WELCOME_DISCOUNT:.0f}% на все заказы\n\n"
                f"Чтобы завершить регистрацию, поделитесь номером телефона 👇",
                parse_mode="HTML",
                reply_markup=phone_keyboard,
            )

    except Exception as e:
        await message.answer(f"⚠️ Ошибка: {e}")
    finally:
        db.close()


# ─── Phone contact handler ────────────────────────────────────────────────────

@router.message(F.contact)
async def handle_contact(message: Message):
    """User shared their phone number — complete registration."""
    tg_id = message.from_user.id
    tg_name = message.from_user.full_name or "Гость"
    phone = message.contact.phone_number

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.tg_id == tg_id).first()
        if existing:
            existing.phone = phone
            existing.name = tg_name
            db.commit()
            await message.answer(
                f"✅ Номер обновлён: <b>{phone}</b>",
                parse_mode="HTML",
                reply_markup=ReplyKeyboardRemove(),
            )
            return

        user = User(
            tg_id=tg_id,
            name=tg_name,
            phone=phone,
            points=WELCOME_POINTS,
            discount=WELCOME_DISCOUNT,
        )
        db.add(user)
        db.commit()

        await message.answer(
            f"🎉 <b>Регистрация завершена!</b>\n\n"
            f"👤 Имя: <b>{tg_name}</b>\n"
            f"📞 Телефон: <b>{phone}</b>\n"
            f"💰 Бонусы: <b>{WELCOME_POINTS} баллов</b>\n"
            f"🏷 Скидка: <b>{WELCOME_DISCOUNT:.0f}%</b>\n\n"
            f"🍽 <a href='{WEBAPP_URL}'>Заказать еду</a>",
            parse_mode="HTML",
            reply_markup=ReplyKeyboardRemove(),
            disable_web_page_preview=True,
        )

    except Exception as e:
        db.rollback()
        await message.answer(f"⚠️ Ошибка регистрации: {e}", reply_markup=ReplyKeyboardRemove())
    finally:
        db.close()


@router.message(F.text == "❌ Пропустить")
async def skip_phone(message: Message):
    """User skips phone sharing — register without phone."""
    tg_id = message.from_user.id
    tg_name = message.from_user.full_name or "Гость"

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.tg_id == tg_id).first()
        if existing:
            await message.answer(
                f"Вы уже зарегистрированы! 👋\n"
                f"🍽 <a href='{WEBAPP_URL}'>Открыть меню</a>",
                parse_mode="HTML",
                reply_markup=ReplyKeyboardRemove(),
                disable_web_page_preview=True,
            )
            return

        user = User(
            tg_id=tg_id,
            name=tg_name,
            phone=None,
            points=WELCOME_POINTS,
            discount=WELCOME_DISCOUNT,
        )
        db.add(user)
        db.commit()

        await message.answer(
            f"✅ <b>Регистрация завершена!</b>\n\n"
            f"👤 Имя: <b>{tg_name}</b>\n"
            f"💰 Бонусы: <b>{WELCOME_POINTS} баллов</b>\n"
            f"🏷 Скидка: <b>{WELCOME_DISCOUNT:.0f}%</b>\n\n"
            f"💡 Вы можете поделиться номером позже через /start\n\n"
            f"🍽 <a href='{WEBAPP_URL}'>Заказать еду</a>",
            parse_mode="HTML",
            reply_markup=ReplyKeyboardRemove(),
            disable_web_page_preview=True,
        )

    except Exception as e:
        db.rollback()
        await message.answer(f"⚠️ Ошибка: {e}", reply_markup=ReplyKeyboardRemove())
    finally:
        db.close()


# ─── /help ───────────────────────────────────────────────────────────────────

@router.message(Command("help"))
async def cmd_help(message: Message):
    """FAQ."""
    await message.answer(
        "❓ <b>Частые вопросы (FAQ)</b>\n\n"
        "━━━━━━━━━━━━━━━━━━━━\n\n"
        "🕐 <b>Сколько ждать заказ?</b>\n"
        "Среднее время — 15-30 мин. "
        "Выберите удобное время при оформлении.\n\n"
        "━━━━━━━━━━━━━━━━━━━━\n\n"
        "📱 <b>Как сделать заказ?</b>\n"
        "1. Откройте меню\n"
        "2. Добавьте блюда в корзину\n"
        "3. Укажите имя и телефон\n"
        "4. Оформите заказ!\n\n"
        "━━━━━━━━━━━━━━━━━━━━\n\n"
        "🥡 <b>С собой или в зале?</b>\n"
        "Выбирайте при оформлении. Цены одинаковые.\n\n"
        "━━━━━━━━━━━━━━━━━━━━\n\n"
        "💰 <b>Оплата</b>\n"
        "При получении — наличными или картой.\n\n"
        "━━━━━━━━━━━━━━━━━━━━\n\n"
        "🔔 <b>Уведомления</b>\n"
        "Я пришлю сообщение, когда ваш заказ будет готов!\n\n"
        f"🍽 <a href='{WEBAPP_URL}'>Открыть меню</a>",
        parse_mode="HTML",
        disable_web_page_preview=True,
    )


# ─── /myorders ───────────────────────────────────────────────────────────────

@router.message(Command("myorders"))
async def cmd_myorders(message: Message):
    """Check orders link."""
    await message.answer(
        "📋 <b>Мои заказы</b>\n\n"
        f"Отслеживайте свои заказы:\n"
        f"🌐 <a href='{WEBAPP_URL}/orders'>Открыть мои заказы</a>\n\n"
        "Я также пришлю уведомление, когда заказ будет готов! ✅",
        parse_mode="HTML",
        disable_web_page_preview=True,
    )


# ─── /bonus ──────────────────────────────────────────────────────────────────

@router.message(Command("bonus"))
async def cmd_bonus(message: Message):
    """Show user's bonus info."""
    tg_id = message.from_user.id
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.tg_id == tg_id).first()
        if not user:
            await message.answer(
                "Вы ещё не зарегистрированы. Нажмите /start для регистрации."
            )
            return

        await message.answer(
            f"💰 <b>Ваши бонусы</b>\n\n"
            f"👤 {user.name}\n"
            f"🎁 Баллы: <b>{user.points}</b>\n"
            f"🏷 Скидка: <b>{user.discount:.0f}%</b>\n\n"
            f"Баллы начисляются за каждый заказ!",
            parse_mode="HTML",
        )
    finally:
        db.close()


# ─── /chatid ─────────────────────────────────────────────────────────────────

@router.message(Command("chatid"))
async def cmd_chatid(message: Message):
    """Show chat ID for debugging."""
    await message.answer(
        f"🆔 <b>Ваш Chat ID:</b> <code>{message.chat.id}</code>",
        parse_mode="HTML",
    )
