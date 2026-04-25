"""
Super-admin routes: manage restaurant accounts.
Only accessible by users with is_superadmin=True.
"""

import secrets
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from passlib.context import CryptContext
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_admin
from app.models import Admin, Restaurant

router = APIRouter(prefix="/api/superadmin", tags=["Super Admin"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ─── Guards ───────────────────────────────────────────────────────────────────

def require_superadmin(admin: Admin = Depends(get_current_admin)) -> Admin:
    if not admin.is_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ только для суперадмина",
        )
    return admin


# ─── Schemas ──────────────────────────────────────────────────────────────────

class AccountOut(BaseModel):
    admin_id: int
    username: str
    restaurant_id: Optional[int] = None
    restaurant_name: Optional[str] = None
    is_active: bool
    is_superadmin: bool
    has_telegram: bool
    created_at: str


class AccountCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=4, max_length=100)
    restaurant_name: str = Field(..., min_length=1, max_length=200)
    restaurant_description: Optional[str] = None
    restaurant_address: Optional[str] = None


class PasswordResetOut(BaseModel):
    new_password: str


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/accounts", response_model=List[AccountOut])
def list_accounts(
    db: Session = Depends(get_db),
    admin: Admin = Depends(require_superadmin),
):
    """List all admin accounts with their restaurants."""
    admins = db.query(Admin).order_by(Admin.id).all()
    result = []
    for a in admins:
        restaurant = a.restaurant
        result.append(AccountOut(
            admin_id=a.id,
            username=a.username,
            restaurant_id=a.restaurant_id,
            restaurant_name=restaurant.name if restaurant else None,
            is_active=a.is_active,
            is_superadmin=a.is_superadmin,
            has_telegram=bool(restaurant and restaurant.telegram_chat_id),
            created_at=str(a.created_at),
        ))
    return result


@router.post("/accounts", response_model=AccountOut, status_code=status.HTTP_201_CREATED)
def create_account(
    data: AccountCreate,
    db: Session = Depends(get_db),
    admin: Admin = Depends(require_superadmin),
):
    """Create a new restaurant + admin account."""
    # Check username uniqueness
    existing = db.query(Admin).filter(Admin.username == data.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Логин '{data.username}' уже занят",
        )

    # Create restaurant
    restaurant = Restaurant(
        name=data.restaurant_name,
        description=data.restaurant_description,
        address=data.restaurant_address,
        tg_pairing_code=secrets.token_hex(3),
    )
    db.add(restaurant)
    db.flush()

    # Create admin
    new_admin = Admin(
        username=data.username,
        hashed_password=pwd_context.hash(data.password),
        restaurant_id=restaurant.id,
        is_superadmin=False,
        is_active=True,
    )
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)

    return AccountOut(
        admin_id=new_admin.id,
        username=new_admin.username,
        restaurant_id=restaurant.id,
        restaurant_name=restaurant.name,
        is_active=True,
        is_superadmin=False,
        has_telegram=False,
        created_at=str(new_admin.created_at),
    )


@router.patch("/accounts/{admin_id}/toggle-active")
def toggle_account_active(
    admin_id: int,
    db: Session = Depends(get_db),
    admin: Admin = Depends(require_superadmin),
):
    """Activate or deactivate an admin account (soft delete)."""
    target = db.query(Admin).filter(Admin.id == admin_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Аккаунт не найден")
    if target.is_superadmin:
        raise HTTPException(status_code=400, detail="Нельзя деактивировать суперадмина")

    target.is_active = not target.is_active
    db.commit()

    return {"admin_id": admin_id, "is_active": target.is_active}


@router.patch("/accounts/{admin_id}/reset-password", response_model=PasswordResetOut)
def reset_password(
    admin_id: int,
    db: Session = Depends(get_db),
    admin: Admin = Depends(require_superadmin),
):
    """Generate a new random password for the admin."""
    target = db.query(Admin).filter(Admin.id == admin_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Аккаунт не найден")

    new_password = secrets.token_urlsafe(8)  # e.g. "aB3_xK9w2m"
    target.hashed_password = pwd_context.hash(new_password)
    db.commit()

    return PasswordResetOut(new_password=new_password)
