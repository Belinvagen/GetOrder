import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base, SessionLocal
from app.routers import auth, restaurants, menu, orders, users, uploads, superadmin

logger = logging.getLogger(__name__)


async def _run_bot():
    """Run Telegram bot polling in background."""
    try:
        from aiogram import Bot, Dispatcher
        from aiogram.client.default import DefaultBotProperties
        from aiogram.enums import ParseMode
        from bot.config import BOT_TOKEN
        from bot.handlers import router as handlers_router
        from bot.callbacks import router as callbacks_router

        if not BOT_TOKEN:
            logger.warning("TELEGRAM_BOT_TOKEN not set, skipping bot")
            return

        bot = Bot(token=BOT_TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
        dp = Dispatcher()
        dp.include_router(handlers_router)
        dp.include_router(callbacks_router)

        await bot.delete_webhook(drop_pending_updates=True)
        me = await bot.get_me()
        logger.info(f"🤖 Bot started: @{me.username}")
        await dp.start_polling(bot)
    except asyncio.CancelledError:
        logger.info("🤖 Bot polling stopped")
    except Exception as e:
        logger.error(f"🤖 Bot error: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create all database tables on startup, ensure superadmin exists, start bot."""
    Base.metadata.create_all(bind=engine)
    _ensure_superadmin()

    # Start bot polling as background task
    bot_task = asyncio.create_task(_run_bot())
    logger.info("🚀 Bot task created")

    yield

    # Shutdown: cancel bot
    bot_task.cancel()
    try:
        await bot_task
    except asyncio.CancelledError:
        pass


def _ensure_superadmin():
    """Create superadmin account if it doesn't exist."""
    from passlib.context import CryptContext
    from app.config import settings
    from app.models import Admin

    if not settings.SUPERADMIN_USERNAME:
        return

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    db = SessionLocal()
    try:
        existing = db.query(Admin).filter(Admin.username == settings.SUPERADMIN_USERNAME).first()
        if not existing:
            sa = Admin(
                username=settings.SUPERADMIN_USERNAME,
                hashed_password=pwd_context.hash(settings.SUPERADMIN_PASSWORD),
                is_superadmin=True,
                restaurant_id=None,
            )
            db.add(sa)
            db.commit()
    finally:
        db.close()


app = FastAPI(
    title="GetOrder Platform",
    description="API для платформы предзаказа еды GetOrder",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow all origins in development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(restaurants.router)
app.include_router(menu.router)
app.include_router(orders.router)
app.include_router(users.router)
app.include_router(uploads.router)
app.include_router(superadmin.router)


@app.get("/api/populate-demo", tags=["Health"])
def trigger_populate_demo():
    try:
        import populate_demo
        populate_demo.main()
        return {"status": "success", "message": "Demo data populated successfully!"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

@app.get("/", tags=["Health"])
def health_check():
    """Health check endpoint."""
    return {"status": "ok", "platform": "GetOrder", "version": "1.0.0"}
