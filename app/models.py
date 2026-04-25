"""
SQLAlchemy ORM models for the GetOrder platform.
"""

import enum
import secrets
from datetime import datetime, timezone

from sqlalchemy import (
    Column, Integer, BigInteger, String, Boolean, Float,
    DateTime, Enum, ForeignKey, Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


# ─── Enums ────────────────────────────────────────────────────────────────────

class TrafficLight(str, enum.Enum):
    green = "green"
    yellow = "yellow"
    red = "red"


class OrderType(str, enum.Enum):
    takeout = "takeout"
    dine_in = "dine_in"


class OrderStatus(str, enum.Enum):
    pending = "pending"
    cooking = "cooking"
    ready = "ready"
    completed = "completed"


# ─── Models ───────────────────────────────────────────────────────────────────

class Admin(Base):
    """Administrator account for JWT-protected endpoints."""
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=True)
    is_superadmin = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    restaurant = relationship("Restaurant", back_populates="admin")

    def __repr__(self) -> str:
        return f"<Admin id={self.id} username={self.username} super={self.is_superadmin}>"


class User(Base):
    """Telegram user of the platform."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tg_id = Column(BigInteger, unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    phone = Column(String(20), nullable=True)
    points = Column(Integer, default=0)
    discount = Column(Float, default=0.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    orders = relationship("Order", back_populates="user", lazy="selectin")

    def __repr__(self) -> str:
        return f"<User id={self.id} tg_id={self.tg_id} name={self.name}>"


class Restaurant(Base):
    """Restaurant registered on the platform."""
    __tablename__ = "restaurants"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    address = Column(String(500), nullable=True)
    traffic_light = Column(
        Enum(TrafficLight),
        default=TrafficLight.green,
        nullable=False,
    )
    pos_mode = Column(Boolean, default=False, nullable=False)  # False=manual, True=mock R-Keeper
    telegram_chat_id = Column(BigInteger, nullable=True)  # Telegram chat/group for order notifications
    tg_pairing_code = Column(String(10), unique=True, nullable=True)  # Deep-link pairing code
    logo_url = Column(String(500), nullable=True)  # Restaurant logo (Cloudinary)
    cover_url = Column(String(500), nullable=True)  # Restaurant cover image (Cloudinary)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    categories = relationship("Category", back_populates="restaurant", lazy="selectin", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="restaurant", lazy="selectin")
    admin = relationship("Admin", back_populates="restaurant", uselist=False)

    def __repr__(self) -> str:
        return f"<Restaurant id={self.id} name={self.name}>"


class Category(Base):
    """Menu category within a restaurant."""
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), nullable=False)
    sort_order = Column(Integer, default=0)

    # Relationships
    restaurant = relationship("Restaurant", back_populates="categories")
    items = relationship("MenuItem", back_populates="category", lazy="selectin", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Category id={self.id} name={self.name}>"


class MenuItem(Base):
    """Individual menu item within a category."""
    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Integer, nullable=False)  # Price in smallest currency unit (tiyns/kopecks)
    image_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)  # False = in stop-list

    # Relationships
    category = relationship("Category", back_populates="items")

    def __repr__(self) -> str:
        return f"<MenuItem id={self.id} name={self.name} active={self.is_active}>"


class Order(Base):
    """Customer order."""
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Optional — can order without TG
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    customer_name = Column(String(200), nullable=False)  # Always required
    customer_phone = Column(String(30), nullable=False)   # Always required
    type = Column(Enum(OrderType), nullable=False, default=OrderType.takeout)
    arrival_time = Column(DateTime, nullable=True)
    status = Column(Enum(OrderStatus), nullable=False, default=OrderStatus.pending)
    items_json = Column(Text, nullable=False)  # JSON-encoded list of order items
    total_amount = Column(Integer, nullable=False)  # Total in smallest currency unit
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="orders")
    restaurant = relationship("Restaurant", back_populates="orders")

    def __repr__(self) -> str:
        return f"<Order id={self.id} status={self.status} total={self.total_amount}>"
