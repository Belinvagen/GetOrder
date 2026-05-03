"""
Telegram Bot command handlers: /start, /help, /myorders, /bonus,
/editorder, /pay, and smart FAQ catch-all.
"""

import json
from datetime import datetime, timezone, timedelta

from aiogram import Router, F
from aiogram.filters import CommandStart, Command, CommandObject
from aiogram.types import (
    Message, CallbackQuery,
    ReplyKeyboardMarkup, KeyboardButton, ReplyKeyboardRemove,
    InlineKeyboardMarkup, InlineKeyboardButton,
    FSInputFile,
)

from app.database import SessionLocal
from app.models import Restaurant, User, Order, OrderStatus, MenuItem

router = Router()

WEBAPP_URL = "https://getorder-production.up.railway.app"
WELCOME_POINTS = 100
WELCOME_DISCOUNT = 5.0
BISHKEK_TZ = timezone(timedelta(hours=6))

# ─── FAQ Knowledge Base ──────────────────────────────────────────────────────

FAQ_RULES = [
    {
        "keywords": ["рекоменд", "посовету", "что попробовать", "что вкусн", "лучшее", "хит", "популярн", "топ"],
        "answer": (
            "⭐ <b>Рекомендации от шеф-повара</b>\n\n"
            "🥇 <b>Стейк Рибай</b> — мраморная говядина Medium Rare (3 200 сом)\n"
            "🥈 <b>Пицца Четыре Сыра</b> — горгонзола, пармезан, моцарелла (880 сом)\n"
            "🥉 <b>Тирамису</b> — настоящий рецепт с маскарпоне (420 сом)\n\n"
            "☕ К десерту идеально — <b>Капучино</b> (220 сом)\n\n"
            f"👉 <a href='{WEBAPP_URL}'>Заказать</a>"
        ),
    },
    {
        "keywords": ["пицц", "маргарит", "пепперон", "четыре сыра"],
        "answer": (
            "🍕 <b>Наши пиццы</b>\n\n"
            "• <b>Маргарита</b> — моцарелла, базилик (680 сом)\n"
            "• <b>Пепперони</b> — пикантная колбаска (790 сом)\n"
            "• <b>Четыре Сыра</b> — горгонзола, пармезан, моцарелла, эмменталь (880 сом)\n\n"
            "Готовим на тонком тесте в дровяной печи 🔥\n\n"
            f"👉 <a href='{WEBAPP_URL}'>Заказать пиццу</a>"
        ),
    },
    {
        "keywords": ["стейк", "мясо", "рибай", "говядин", "лосось", "рыб"],
        "answer": (
            "🥩 <b>Стейки и горячее</b>\n\n"
            "• <b>Стейк Рибай</b> — премиум, Medium Rare (3 200 сом)\n"
            "• <b>Стейк из лосося</b> — на гриле со спаржей (1 650 сом)\n"
            "• <b>Карбонара</b> — с панчеттой и пекорино (620 сом)\n"
            "• <b>Бургер Шеф-повара</b> — мраморная говядина, чеддер (690 сом)\n\n"
            f"👉 <a href='{WEBAPP_URL}'>Заказать</a>"
        ),
    },
    {
        "keywords": ["десерт", "сладк", "тирамису", "чизкейк", "панкейк", "торт"],
        "answer": (
            "🍰 <b>Десерты</b>\n\n"
            "• <b>Тирамису</b> — маскарпоне + эспрессо (420 сом)\n"
            "• <b>Чизкейк</b> — с клубничным конфитюром (380 сом)\n"
            "• <b>Панкейки</b> — с ягодами и кленовым сиропом (350 сом)\n\n"
            "К десерту рекомендуем капучино ☕"
        ),
    },
    {
        "keywords": ["напиток", "кофе", "чай", "лимонад", "капучино", "пить"],
        "answer": (
            "☕ <b>Напитки</b>\n\n"
            "• <b>Капучино</b> — эспрессо + молочная пенка (220 сом)\n"
            "• <b>Цитрусовый Лимонад</b> — со льдом и мятой (280 сом)"
        ),
    },
    {
        "keywords": ["бургер", "котлет"],
        "answer": (
            "🍔 <b>Бургер Шеф-повара</b> — 690 сом\n\n"
            "Мраморная говядина, чеддер, бекон, фирменный соус на бриошь.\n"
            "Один из хитов нашего меню! 🔥"
        ),
    },
    {
        "keywords": ["салат", "цезарь", "закуск", "лёгк", "легк"],
        "answer": (
            "🥗 <b>Закуски</b>\n\n"
            "• <b>Цезарь с курицей</b> — 580 сом\n"
            "• <b>Брускетта</b> — 420 сом\n"
            "• <b>Кольца Кальмара</b> — 650 сом"
        ),
    },
    {
        "keywords": ["аллерг", "глютен", "лактоз", "веган", "вегетариан", "без мяса"],
        "answer": (
            "⚠️ <b>Аллергены и диеты</b>\n\n"
            "🌿 <b>Вегетарианское:</b> Маргарита, Четыре Сыра, Брускетта, Панкейки\n"
            "🐟 <b>Без мяса:</b> Лосось, Кольца кальмара\n"
            "🥛 <b>Лактоза:</b> пиццы, десерты, капучино\n\n"
            "Сообщите об аллергии при оформлении."
        ),
    },
    {
        "keywords": ["компан", "друзья", "двоих", "группа", "вечерин", "день рожден", "праздник"],
        "answer": (
            "🎉 <b>Для компании (3-4 чел.)</b>\n\n"
            "• 🍕 Четыре Сыра (880)\n"
            "• 🍕 Пепперони (790)\n"
            "• 🥗 Цезарь (580)\n"
            "• 🍰 Тирамису ×2 (840)\n"
            "• 🍋 Лимонад ×4 (1 120)\n\n"
            "💰 ~4 210 сом (~1 050/чел.)"
        ),
    },
    {
        "keywords": ["wifi", "вай-фай", "вайфай", "интернет"],
        "answer": "📶 <b>Wi-Fi</b>\n\nСеть: Fusion_Guest\nПароль: fusion2026",
    },
    {
        "keywords": ["парков", "машин", "авто", "стоянк"],
        "answer": "🅿️ Бесплатная парковка у входа на 15 мест.",
    },
    {
        "keywords": ["детск", "ребёнок", "ребенок", "дети", "семь"],
        "answer": (
            "👶 <b>Для детей</b>\n\n"
            "• Детские стульчики\n"
            "• Панкейки с ягодами (350 сом) — любимое блюдо малышей! 🎈"
        ),
    },
    {
        "keywords": ["кальян", "курить"],
        "answer": "🚭 У нас зал для некурящих. Кальян не предоставляем.",
    },
    {
        "keywords": ["меню", "что есть", "что можно", "ассортимент", "выбор"],
        "answer": (
            "🍽 <b>Наше меню</b>\n\n"
            "У нас большой выбор блюд:\n"
            "• 🥗 Закуски — от 420 сом\n"
            "• 🍕 Пицца — от 680 сом\n"
            "• 🥩 Горячие блюда — от 620 сом\n"
            "• 🍰 Десерты — от 350 сом\n"
            "• ☕ Напитки — от 220 сом\n\n"
            f"👉 <a href='{WEBAPP_URL}'>Открыть полное меню</a>"
        ),
    },
    {
        "keywords": ["цена", "стоимость", "сколько стоит", "прайс", "дорого", "дешев"],
        "answer": (
            "💰 <b>Цены</b>\n\n"
            "Цены указаны в меню рядом с каждым блюдом.\n"
            "Средний чек: 600-1500 сом.\n"
            "Стейк Рибай — наше премиальное блюдо: 3 200 сом.\n\n"
            f"👉 <a href='{WEBAPP_URL}'>Посмотреть цены</a>"
        ),
    },
    {
        "keywords": ["время", "ждать", "сколько готов", "долго", "быстро", "когда"],
        "answer": (
            "🕐 <b>Время приготовления</b>\n\n"
            "Среднее время: 15-30 минут.\n"
            "При оформлении вы выбираете удобное время прибытия,\n"
            "и мы приготовим всё к вашему приходу! ⏰"
        ),
    },
    {
        "keywords": ["доставк", "привез", "курьер"],
        "answer": (
            "🚗 <b>Доставка</b>\n\n"
            "Пока мы работаем на самовынос и обслуживание в зале.\n"
            "Оформите предзаказ онлайн — заберите без ожидания!\n"
            "Доставка появится совсем скоро 🔜"
        ),
    },
    {
        "keywords": ["оплат", "оплатить", "карт", "нал", "каспи", "элсом", "mbank", "перевод"],
        "answer": (
            "💳 <b>Способы оплаты</b>\n\n"
            "• 💵 Наличными при получении\n"
            "• 💳 Банковской картой\n"
            "• 📱 Через MBank (QR-код)\n\n"
            "Используйте /pay <номер заказа> для оплаты по QR."
        ),
    },
    {
        "keywords": ["бонус", "скидк", "акци", "программа лояльности", "баллы"],
        "answer": (
            "🎁 <b>Бонусная программа</b>\n\n"
            "• 100 приветственных баллов при регистрации\n"
            "• 5% скидка на все заказы\n"
            "• Баллы начисляются за каждый заказ\n\n"
            "Проверьте свои бонусы: /bonus"
        ),
    },
    {
        "keywords": ["заказ", "статус", "где мой", "готов ли", "трек"],
        "answer": (
            "📋 <b>Отслеживание заказа</b>\n\n"
            "Я пришлю уведомление, когда заказ будет готов! ✅\n"
            "Посмотреть заказ и оплатить можно через меню: /myorders"
        ),
    },
    {
        "keywords": ["отмен", "отказ", "не хочу", "верн"],
        "answer": (
            "❌ <b>Отмена заказа</b>\n\n"
            "Если до времени прибытия больше 30 минут,\n"
            "вы можете изменить заказ через меню: /myorders\n\n"
            "Для полной отмены свяжитесь с рестораном."
        ),
    },
    {
        "keywords": ["изменить", "редактировать", "поменять", "убрать", "добавить"],
        "answer": (
            "✏️ <b>Редактирование заказа</b>\n\n"
            "Используйте команду:\n"
            "/editorder <номер заказа>\n\n"
            "Условие: до времени прибытия должно быть ≥ 30 минут."
        ),
    },
    {
        "keywords": ["привет", "здравствуй", "хай", "hello", "салам", "ку", "добрый"],
        "answer": (
            "👋 <b>Привет! Я ИИ-помощник ресторана Fusion</b>\n\n"
            "Могу помочь с:\n"
            "🍽 Подобрать блюда по вашему вкусу\n"
            "💰 Рассказать о ценах и акциях\n"
            "📋 Управлять заказами\n\n"
            "Просто спросите что угодно! 💬"
        ),
    },
    {
        "keywords": ["спасиб", "благодар", "круто", "класс", "отлично", "супер"],
        "answer": "😊 Рады помочь! Приятного аппетита! 🍽",
    },
    {
        "keywords": ["адрес", "где вы", "локац", "находи", "как найти", "карт"],
        "answer": (
            "📍 <b>Как нас найти</b>\n\n"
            "Ресторан Fusion\n"
            "📍 г. Бишкек\n\n"
            "Точный адрес уточняйте при оформлении заказа."
        ),
    },
    {
        "keywords": ["работа", "график", "часы", "открыт", "закрыт"],
        "answer": (
            "🕐 <b>Часы работы</b>\n\n"
            "Пн-Чт: 10:00 — 23:00\n"
            "Пт-Сб: 10:00 — 01:00\n"
            "Вс: 11:00 — 22:00"
        ),
    },
]

DEFAULT_ANSWER = (
    "🤖 Хм, я пока не нашёл ответ на ваш вопрос.\n\n"
    "Попробуйте спросить:\n"
    "• «Что посоветуешь?» — рекомендации 🌟\n"
    "• «Расскажи про пиццу» — о блюдах\n"
    "• «Есть вегетарианское?» — по диетам\n"
    "• «Для компании» — подборка на группу\n\n"
    "Или: /myorders • /editorder • /pay • /bonus"
)


def _format_price(tiyns: int) -> str:
    return f"{tiyns / 100:,.0f} сом"


# ─── /start deep link (restaurant pairing) ───────────────────────────────────

@router.message(CommandStart(deep_link=True))
async def cmd_start_deep_link(message: Message, command: CommandObject):
    payload = command.args
    if not payload or not payload.startswith("pair_"):
        await _handle_registration(message)
        return

    rest_id_str = payload.replace("pair_", "", 1)
    if not rest_id_str or not rest_id_str.isdigit():
        await message.answer("❌ Неверный код привязки.")
        return

    rest_id = int(rest_id_str)
    db = SessionLocal()
    try:
        restaurant = db.query(Restaurant).filter(Restaurant.id == rest_id).first()
        if not restaurant:
            await message.answer(f"❌ Ресторан с ID {rest_id} не найден.")
            return
        restaurant.telegram_chat_id = message.chat.id
        db.commit()
        await message.answer(
            f"✅ <b>Чат успешно привязан!</b>\n\n"
            f"🏪 Ресторан: <b>{restaurant.name}</b>\n\n"
            f"Теперь сюда будут приходить новые заказы.",
            parse_mode="HTML",
        )
    except Exception as e:
        await message.answer(f"⚠️ Ошибка при привязке: {e}")
    finally:
        db.close()


# ─── /start ──────────────────────────────────────────────────────────────────

@router.message(CommandStart())
async def cmd_start(message: Message):
    await _handle_registration(message)


async def _handle_registration(message: Message):
    tg_id = message.from_user.id
    tg_name = message.from_user.full_name or "Гость"
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.tg_id == tg_id).first()
        if user:
            await message.answer(
                f"👋 <b>С возвращением, {user.name}!</b>\n\n"
                f"💰 Бонусы: <b>{user.points} баллов</b>\n"
                f"🏷 Скидка: <b>{user.discount:.0f}%</b>\n\n"
                f"🍽 <a href='{WEBAPP_URL}'>Открыть меню</a>\n"
                f"📋 /myorders — мои заказы\n"
                f"💰 /bonus — бонусы\n"
                f"❓ /help — помощь\n\n"
                f"Или просто напишите вопрос — я постараюсь помочь! 💬",
                parse_mode="HTML",
                disable_web_page_preview=True,
            )
            if user.phone:
                await _auto_link_orders(db, user, user.phone, message)
            
            # Show active order if any
            active_order = db.query(Order).filter(
                Order.user_id == user.id,
                Order.status.in_([OrderStatus.pending, OrderStatus.cooking, OrderStatus.ready])
            ).order_by(Order.created_at.desc()).first()
            if active_order:
                await cmd_myorders(message)
        else:
            phone_keyboard = ReplyKeyboardMarkup(
                keyboard=[
                    [KeyboardButton(text="📱 Поделиться номером", request_contact=True)],
                    [KeyboardButton(text="❌ Пропустить")],
                ],
                resize_keyboard=True,
                one_time_keyboard=True,
            )
            await message.answer(
                f"👋 <b>Добро пожаловать в Fusion!</b>\n\n"
                f"Я помогу вам заказывать еду и следить за готовностью.\n\n"
                f"🎁 <b>Подарок за регистрацию:</b>\n"
                f"  • {WELCOME_POINTS} бонусных баллов\n"
                f"  • Скидка {WELCOME_DISCOUNT:.0f}% на все заказы\n\n"
                f"Поделитесь номером телефона для завершения 👇",
                parse_mode="HTML",
                reply_markup=phone_keyboard,
            )
    except Exception as e:
        await message.answer(f"⚠️ Ошибка: {e}")
    finally:
        db.close()


# ─── Phone contact / skip ─────────────────────────────────────────────────────

@router.message(F.contact)
async def handle_contact(message: Message):
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
                parse_mode="HTML", reply_markup=ReplyKeyboardRemove(),
            )
            return
        user = User(tg_id=tg_id, name=tg_name, phone=phone,
                     points=WELCOME_POINTS, discount=WELCOME_DISCOUNT)
        db.add(user)
        db.commit()

        await message.answer(
            f"🎉 <b>Регистрация завершена!</b>\n\n"
            f"👤 {tg_name}\n📞 {phone}\n"
            f"💰 {WELCOME_POINTS} баллов | 🏷 {WELCOME_DISCOUNT:.0f}%",
            parse_mode="HTML", reply_markup=ReplyKeyboardRemove(),
        )

        # Auto-link orders by phone
        await _auto_link_orders(db, user, phone, message)
    except Exception as e:
        db.rollback()
        await message.answer(f"⚠️ Ошибка: {e}", reply_markup=ReplyKeyboardRemove())
    finally:
        db.close()


@router.message(F.text == "❌ Пропустить")
async def skip_phone(message: Message):
    tg_id = message.from_user.id
    tg_name = message.from_user.full_name or "Гость"
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.tg_id == tg_id).first()
        if existing:
            await message.answer(
                f"Вы уже зарегистрированы! 👋\n"
                f"🍽 <a href='{WEBAPP_URL}'>Открыть меню</a>",
                parse_mode="HTML", reply_markup=ReplyKeyboardRemove(),
                disable_web_page_preview=True,
            )
            return
        user = User(tg_id=tg_id, name=tg_name, phone=None,
                     points=WELCOME_POINTS, discount=WELCOME_DISCOUNT)
        db.add(user)
        db.commit()
        await message.answer(
            f"✅ <b>Регистрация завершена!</b>\n\n"
            f"👤 {tg_name}\n💰 {WELCOME_POINTS} баллов | 🏷 {WELCOME_DISCOUNT:.0f}%\n\n"
            f"🍽 <a href='{WEBAPP_URL}'>Заказать еду</a>",
            parse_mode="HTML", reply_markup=ReplyKeyboardRemove(),
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
    await message.answer(
        "❓ <b>Справка по боту Fusion</b>\n\n"
        "━━━━━━━━━━━━━━━━━━━━\n\n"
        "🍽 <b>Как заказать?</b>\n"
        f"1. Откройте <a href='{WEBAPP_URL}'>меню</a>\n"
        "2. Добавьте блюда в корзину\n"
        "3. Оформите заказ\n"
        "4. Следите за статусом и оплачивайте через бота\n\n"
        "━━━━━━━━━━━━━━━━━━━━\n\n"
        "📱 <b>Команды:</b>\n"
        "• /myorders — ваши заказы\n"
        "• /bonus — мои бонусы\n"
        "• /chatid — ID чата\n\n"
        "━━━━━━━━━━━━━━━━━━━━\n\n"
        "💬 <b>Умный помощник</b>\n"
        "Просто напишите вопрос — я постараюсь ответить!\n"
        "Например: «сколько стоит пицца?»",
        parse_mode="HTML",
        disable_web_page_preview=True,
    )


# ─── /myorders ───────────────────────────────────────────────────────────────

@router.message(Command("myorders"))
async def cmd_myorders(message: Message):
    tg_id = message.from_user.id
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.tg_id == tg_id).first()
        if not user:
            await message.answer("Вы ещё не зарегистрированы. Нажмите /start")
            return

        order = (
            db.query(Order)
            .filter(Order.user_id == user.id)
            .order_by(Order.created_at.desc())
            .first()
        )

        if not order:
            await message.answer(
                "📋 У вас пока нет заказов.\n\n"
                f"🍽 <a href='{WEBAPP_URL}'>Открыть меню</a>",
                parse_mode="HTML", disable_web_page_preview=True,
            )
            return

        status_emoji = {
            "pending": "🟡 Ожидает",
            "cooking": "🍳 Готовится",
            "ready": "✅ Готов",
            "completed": "📦 Завершён",
        }

        st = order.status.value if hasattr(order.status, 'value') else order.status
        emoji = status_emoji.get(st, st)
        
        text = f"📋 <b>Ваш последний заказ:</b>\n\n"
        text += f"<b>#{order.id}</b> — {emoji}\n"
        
        # Show items
        items = json.loads(order.items_json) if order.items_json else []
        for item in items:
            name = item.get("name", "?")
            qty = item.get("quantity", 1)
            text += f"  • {name} × {qty}\n"
            
        text += f"\n💰 <b>Итого: {_format_price(order.total_amount)}</b>"

        buttons = [
            [InlineKeyboardButton(text="💳 Оплатить", callback_data=f"payqr:{order.id}")],
            [InlineKeyboardButton(text="✏️ Изменить", callback_data=f"editstart:{order.id}")]
        ]

        await message.answer(
            text, 
            parse_mode="HTML",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=buttons)
        )
    except Exception as e:
        print(f"Error in cmd_myorders: {e}")
        await message.answer(f"⚠️ Ошибка при загрузке заказа: {e}")
    finally:
        db.close()


# ─── /bonus ──────────────────────────────────────────────────────────────────

@router.message(Command("bonus"))
async def cmd_bonus(message: Message):
    tg_id = message.from_user.id
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.tg_id == tg_id).first()
        if not user:
            await message.answer("Вы ещё не зарегистрированы. Нажмите /start")
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


# ─── /editorder ──────────────────────────────────────────────────────────────

@router.message(Command("editorder"))
async def cmd_editorder(message: Message, command: CommandObject):
    if not command.args or not command.args.strip().isdigit():
        await message.answer("Используйте: /editorder <номер заказа>\nПример: /editorder 5")
        return

    order_id = int(command.args.strip())
    tg_id = message.from_user.id
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.tg_id == tg_id).first()
        if not user:
            await message.answer("Вы не зарегистрированы. Нажмите /start")
            return

        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            await message.answer(f"❌ Заказ #{order_id} не найден.")
            return
        if order.user_id != user.id:
            await message.answer("❌ Это не ваш заказ.")
            return

        st = order.status.value if hasattr(order.status, 'value') else order.status
        if st not in ("pending", "cooking"):
            await message.answer(f"❌ Заказ #{order_id} уже завершён и не может быть изменён.")
            return

        # Check 30-min window
        if order.arrival_time:
            now = datetime.now(timezone.utc)
            arrival = order.arrival_time
            if arrival.tzinfo is None:
                arrival = arrival.replace(tzinfo=timezone.utc)
            diff = (arrival - now).total_seconds()
            if diff < 30 * 60:
                mins_left = max(0, int(diff // 60))
                await message.answer(
                    f"⏳ Изменить заказ уже нельзя.\n"
                    f"До прибытия осталось {mins_left} мин (нужно ≥ 30).\n\n"
                    f"Свяжитесь с рестораном напрямую."
                )
                return

        # Show order with edit buttons
        items = json.loads(order.items_json) if order.items_json else []
        text = f"✏️ <b>Редактирование заказа #{order_id}</b>\n\n"
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

        text += f"\n💰 <b>Итого: {_format_price(order.total_amount)}</b>"

        buttons.append([
            InlineKeyboardButton(text="⏰ Время прибытия", callback_data=f"edtime:{order_id}"),
            InlineKeyboardButton(text="✖️ Закрыть", callback_data=f"edclose:{order_id}"),
        ])

        await message.answer(
            text, parse_mode="HTML",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=buttons),
        )
    finally:
        db.close()


# ─── /pay ────────────────────────────────────────────────────────────────────

@router.message(Command("pay"))
async def cmd_pay(message: Message, command: CommandObject):
    if not command.args or not command.args.strip().isdigit():
        await message.answer("Используйте: /pay <номер заказа>\nПример: /pay 5")
        return

    order_id = int(command.args.strip())
    tg_id = message.from_user.id
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.tg_id == tg_id).first()
        if not user:
            await message.answer("Вы не зарегистрированы. Нажмите /start")
            return

        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            await message.answer(f"❌ Заказ #{order_id} не найден.")
            return
        if order.user_id != user.id:
            await message.answer("❌ Это не ваш заказ.")
            return

        total_som = order.total_amount / 100

        import os
        qr_path = os.path.join(os.path.dirname(__file__), "payment_qr.png")

        caption = (
            f"💳 <b>Оплата заказа #{order_id}</b>\n\n"
            f"💰 Сумма: <b>{total_som:,.0f} сом</b>\n\n"
            f"📱 Отсканируйте QR-код в приложении MBank\n"
            f"и переведите указанную сумму.\n\n"
            f"После оплаты нажмите кнопку ниже 👇"
        )

        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(
                text="✅ Я оплатил",
                callback_data=f"paid:{order_id}"
            )],
        ])

        photo = FSInputFile(qr_path)
        await message.answer_photo(
            photo=photo,
            caption=caption,
            parse_mode="HTML",
            reply_markup=keyboard,
        )
    except Exception as e:
        await message.answer(f"⚠️ Ошибка: {e}")
    finally:
        db.close()


# ─── /linkorder ──────────────────────────────────────────────────────────────

@router.message(Command("linkorder"))
async def cmd_linkorder(message: Message, command: CommandObject):
    """Link an existing order to this TG user (order-first, bot-later flow)."""
    if not command.args or not command.args.strip().isdigit():
        await message.answer("Используйте: /linkorder <номер заказа>\nПример: /linkorder 5")
        return

    order_id = int(command.args.strip())
    tg_id = message.from_user.id
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.tg_id == tg_id).first()
        if not user:
            await message.answer("Сначала зарегистрируйтесь: /start")
            return

        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            await message.answer(f"❌ Заказ #{order_id} не найден.")
            return

        if order.user_id and order.user_id != user.id:
            await message.answer("❌ Этот заказ уже привязан к другому аккаунту.")
            return

        if order.user_id == user.id:
            await message.answer(f"ℹ️ Заказ #{order_id} уже привязан к вашему аккаунту.")
            return

        order.user_id = user.id
        db.commit()

        total_som = order.total_amount / 100
        await message.answer(
            f"✅ <b>Заказ #{order_id} привязан!</b>\n\n"
            f"💰 Сумма: {total_som:,.0f} сом\n\n"
            f"Теперь вы можете:\n"
            f"• /pay {order_id} — оплатить\n"
            f"• /editorder {order_id} — изменить\n"
            f"• /myorders — все заказы",
            parse_mode="HTML",
        )
    except Exception as e:
        await message.answer(f"⚠️ Ошибка: {e}")
    finally:
        db.close()


# ─── /chatid ─────────────────────────────────────────────────────────────────

@router.message(Command("chatid"))
async def cmd_chatid(message: Message):
    await message.answer(
        f"🆔 <b>Ваш Chat ID:</b> <code>{message.chat.id}</code>",
        parse_mode="HTML",
    )


# ─── Auto-link helper ────────────────────────────────────────────────────────

async def _auto_link_orders(db, user, phone, message):
    """Find orders by phone and link them to the user. Show latest order."""
    if not phone:
        return
    try:
        # Normalize phone: strip spaces, ensure only digits
        phone_digits = ''.join(filter(str.isdigit, phone))
        if len(phone_digits) < 9:
            return
            
        all_unlinked = db.query(Order).filter(Order.user_id.is_(None)).all()
        unlinked = []
        
        for o in all_unlinked:
            if not o.customer_phone:
                continue
            order_phone_digits = ''.join(filter(str.isdigit, o.customer_phone))
            if len(order_phone_digits) >= 9 and phone_digits[-9:] == order_phone_digits[-9:]:
                unlinked.append(o)

        if not unlinked:
            # Uncomment for debug:
            # await message.answer(f"Не найдено заказов для номера {phone_digits[-9:]}")
            return

        for o in unlinked:
            o.user_id = user.id
        db.commit()

        latest = max(unlinked, key=lambda o: o.id)
        items = json.loads(latest.items_json) if latest.items_json else []
        items_text = ""
        for item in items:
            name = item.get("name", "?")
            qty = item.get("quantity", 1)
            items_text += f"  • {name} × {qty}\n"

        total = latest.total_amount / 100
        count = len(unlinked)
        word = "заказ" if count == 1 else "заказа" if count < 5 else "заказов"

        buttons = [
            [InlineKeyboardButton(text="💳 Оплатить", callback_data=f"payqr:{latest.id}")],
            [InlineKeyboardButton(text="✏️ Изменить", callback_data=f"editstart:{latest.id}")]
        ]

        await message.answer(
            f"📦 <b>Нашёл {count} {word}!</b>\n\n"
            f"Последний — <b>заказ #{latest.id}</b>:\n"
            f"{items_text}"
            f"\n💰 <b>Итого: {total:,.0f} сом</b>\n\n"
            f"💬 Или напишите: «добавь маргариту» / «убери капучино»",
            parse_mode="HTML",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=buttons)
        )
    except Exception as e:
        print(f"Auto link error: {e}")
        await message.answer(f"⚠️ Ошибка при поиске заказов: {e}")


# ─── Natural language order editing ──────────────────────────────────────────

async def _handle_nl_edit(message: Message, text_lower: str) -> bool:
    """Handle 'добавь маргариту' / 'убери колу' style messages."""
    tg_id = message.from_user.id
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.tg_id == tg_id).first()
        if not user:
            return False

        order = (
            db.query(Order)
            .filter(Order.user_id == user.id,
                    Order.status.in_([OrderStatus.pending, OrderStatus.cooking]))
            .order_by(Order.created_at.desc())
            .first()
        )
        if not order:
            await message.answer("У вас нет активных заказов для изменения.")
            return True

        is_add = any(kw in text_lower for kw in ["добавь", "добавить", "хочу ещё", "хочу еще", "ещё ", "еще "])
        is_remove = any(kw in text_lower for kw in ["убери", "удали", "убрать", "удалить", "без "])
        if not is_add and not is_remove:
            return False

        # Find matching menu item from DB
        menu_items = db.query(MenuItem).filter(MenuItem.is_active == True).all()
        matched = None
        best_score = 0
        for mi in menu_items:
            name_lower = mi.name.lower()
            # Check each significant word from menu item name
            words = [w for w in name_lower.split() if len(w) >= 4]
            for w in words:
                stem = w[:len(w)-1] if len(w) > 4 else w  # rough stem
                if stem in text_lower and len(stem) > best_score:
                    matched = mi
                    best_score = len(stem)

        if not matched:
            await message.answer(
                "🤔 Не нашёл такое блюдо. Попробуйте точнее.\n"
                "Например: «добавь маргариту» или «убери капучино»"
            )
            return True

        items = json.loads(order.items_json) if order.items_json else []

        if is_add:
            items.append({
                "menu_item_id": matched.id,
                "name": matched.name,
                "quantity": 1,
                "price": matched.price,
                "subtotal": matched.price,
            })
            order.items_json = json.dumps(items, ensure_ascii=False)
            order.total_amount = sum(it.get("subtotal", 0) for it in items)
            db.commit()
            await message.answer(
                f"✅ <b>{matched.name}</b> добавлен в заказ #{order.id}!\n\n"
                f"💰 Новая сумма: <b>{order.total_amount / 100:,.0f} сом</b>",
                parse_mode="HTML",
            )
            return True

        if is_remove:
            found_idx = None
            for i, it in enumerate(items):
                it_name = it.get("name", "").lower()
                if matched.name.lower() in it_name or it_name in matched.name.lower():
                    found_idx = i
                    break
            if found_idx is None:
                await message.answer(f"❌ «{matched.name}» нет в вашем заказе #{order.id}.")
                return True
            removed = items.pop(found_idx)
            order.items_json = json.dumps(items, ensure_ascii=False)
            order.total_amount = sum(it.get("subtotal", 0) for it in items)
            db.commit()
            await message.answer(
                f"✅ <b>{removed.get('name')}</b> убран из заказа #{order.id}!\n\n"
                f"💰 Новая сумма: <b>{order.total_amount / 100:,.0f} сом</b>",
                parse_mode="HTML",
            )
            return True
    except Exception as e:
        await message.answer(f"⚠️ Ошибка: {e}")
        return True
    finally:
        db.close()
    return False


# ─── Dynamic menu item query ─────────────────────────────────────────────────

async def _handle_menu_query(message: Message, text_lower: str) -> bool:
    """Handle queries asking for details about a specific menu item."""
    db = SessionLocal()
    try:
        menu_items = db.query(MenuItem).filter(MenuItem.is_active == True).all()
        matched = None
        best_score = 0
        generic_words = {"пицц", "стейк", "бургер", "салат", "закуск", "десерт", "напит"}
        
        for mi in menu_items:
            name_lower = mi.name.lower()
            words = [w for w in name_lower.split() if len(w) >= 4]
            for w in words:
                stem = w[:len(w)-1] if len(w) > 4 else w
                if stem in text_lower:
                    if stem in generic_words:
                        continue  # Skip generic category words
                    if len(stem) > best_score:
                        matched = mi
                        best_score = len(stem)

        if not matched:
            return False

        price = matched.price / 100
        text = (
            f"🍽 <b>{matched.name}</b>\n\n"
            f"{matched.description or 'Вкуснейшее блюдо от нашего шеф-повара!'}\n\n"
            f"💰 Цена: <b>{price:,.0f} сом</b>\n\n"
            f"Чтобы добавить в заказ, напишите: «добавь {matched.name.lower()}»"
        )

        if matched.image_url:
            import os
            from aiogram.types import FSInputFile
            rel_path = matched.image_url.lstrip("/")
            full_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                "frontend", "public", rel_path
            )
            if os.path.exists(full_path):
                photo = FSInputFile(full_path)
                await message.answer_photo(photo=photo, caption=text, parse_mode="HTML")
                return True

        await message.answer(text, parse_mode="HTML")
        return True
    except Exception as e:
        print(f"Menu query error: {e}")
        return False
    finally:
        db.close()


# ─── FAQ catch-all (must be last!) ───────────────────────────────────────────

@router.message(F.text)
async def faq_catchall(message: Message):
    """Smart FAQ + NL order editing."""
    text_lower = message.text.lower()

    if any(kw in text_lower for kw in ["мой заказ", "мои заказы", "статус заказа", "покажи заказ", "где мой заказ"]):
        await cmd_myorders(message)
        return

    # Try natural language order editing first
    if any(kw in text_lower for kw in ["добавь", "добавить", "убери", "удали", "убрать", "удалить"]):
        handled = await _handle_nl_edit(message, text_lower)
        if handled:
            return

    # Dynamic menu item description
    handled = await _handle_menu_query(message, text_lower)
    if handled:
        return

    # FAQ keyword matching
    for rule in FAQ_RULES:
        for kw in rule["keywords"]:
            if kw in text_lower:
                await message.answer(rule["answer"], parse_mode="HTML",
                                     disable_web_page_preview=True)
                return

    await message.answer(DEFAULT_ANSWER, parse_mode="HTML")
