"""
Authentication routes: Admin login/register and Telegram Login Widget auth.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models import Admin, User, Restaurant
from app.schemas.user import (
    AdminLogin, AdminRegister, TokenResponse,
    TelegramAuthData, UserResponse,
)
from app.services.auth_service import (
    verify_password,
    hash_password,
    create_access_token,
    verify_telegram_data,
)

import secrets

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def admin_login(login_data: AdminLogin, db: Session = Depends(get_db)):
    """
    Admin login endpoint. Returns a JWT access token with restaurant_id.
    """
    admin = db.query(Admin).filter(Admin.username == login_data.username).first()

    if not admin or not verify_password(login_data.password, admin.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверное имя пользователя или пароль",
        )

    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Аккаунт деактивирован. Обратитесь к администратору.",
        )

    access_token = create_access_token(data={
        "sub": admin.username,
        "role": "superadmin" if admin.is_superadmin else "admin",
        "restaurant_id": admin.restaurant_id,
        "is_superadmin": admin.is_superadmin,
    })

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        restaurant_id=admin.restaurant_id,
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def admin_register(data: AdminRegister, db: Session = Depends(get_db)):
    """
    Register a new restaurant admin.
    Creates both the Restaurant and the Admin account.
    """
    # Check if username already exists
    existing = db.query(Admin).filter(Admin.username == data.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Имя пользователя уже занято",
        )

    # Create the restaurant
    restaurant = Restaurant(
        name=data.restaurant_name,
        description=data.description or None,
        address=data.address or None,
        tg_pairing_code=secrets.token_hex(3),  # 6-char unique code
    )
    db.add(restaurant)
    db.flush()  # get restaurant.id

    # Create the admin linked to this restaurant
    admin = Admin(
        username=data.username,
        hashed_password=hash_password(data.password),
        restaurant_id=restaurant.id,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    db.refresh(restaurant)

    access_token = create_access_token(data={
        "sub": admin.username,
        "role": "admin",
        "restaurant_id": restaurant.id,
    })

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        restaurant_id=restaurant.id,
    )


@router.post("/telegram", response_model=TokenResponse)
def telegram_auth(auth_data: TelegramAuthData, db: Session = Depends(get_db)):
    """
    Telegram Login Widget authentication.
    Validates the HMAC hash, creates or retrieves the user,
    and returns a JWT token.
    """
    # Verify Telegram data integrity
    data_dict = auth_data.model_dump()
    if not verify_telegram_data(data_dict):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Невалидные данные авторизации Telegram",
        )

    # Find or create user
    user = db.query(User).filter(User.tg_id == auth_data.id).first()

    full_name = auth_data.first_name
    if auth_data.last_name:
        full_name += f" {auth_data.last_name}"

    if not user:
        user = User(
            tg_id=auth_data.id,
            name=full_name,
            points=100,       # Welcome bonus
            discount=5.0,     # Welcome discount
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update name if changed
        if user.name != full_name:
            user.name = full_name
            db.commit()
            db.refresh(user)

    # Create token for the user
    access_token = create_access_token(
        data={"sub": str(user.tg_id), "role": "user", "user_id": user.id}
    )

    user_response = UserResponse.model_validate(user)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_response,
    )
