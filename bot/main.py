"""
GetOrder Telegram Bot — Entry Point.
Run: python -m bot.main
"""

import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode

from bot.config import BOT_TOKEN
from bot.handlers import router as handlers_router
from bot.callbacks import router as callbacks_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


async def main():
    if not BOT_TOKEN:
        logger.error(
            "TELEGRAM_BOT_TOKEN is not set!\n"
            "Set it in .env file and restart the bot.\n"
            "Get a token from @BotFather on Telegram."
        )
        return

    bot = Bot(
        token=BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dp = Dispatcher()

    # Register routers
    dp.include_router(handlers_router)
    dp.include_router(callbacks_router)

    logger.info("🤖 GetOrder Bot starting...")

    # Delete webhook to ensure polling works
    await bot.delete_webhook(drop_pending_updates=True)

    try:
        me = await bot.get_me()
        logger.info(f"✅ Bot started: @{me.username}")
        await dp.start_polling(bot)
    finally:
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
