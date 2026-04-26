"""
GetOrder Platform — FastAPI Application Entry Point.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base, SessionLocal
from app.routers import auth, restaurants, menu, orders, users, uploads, superadmin


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create all database tables on startup and ensure superadmin exists."""
    Base.metadata.create_all(bind=engine)
    _ensure_superadmin()
    yield


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
