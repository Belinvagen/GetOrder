"""
Authentication service: JWT creation/validation and Telegram HMAC verification.
"""

import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

# ─── Password hashing ────────────────────────────────────────────────────────

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# ─── JWT ──────────────────────────────────────────────────────────────────────

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[dict]:
    """Verify and decode a JWT token. Returns payload or None."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


# ─── Telegram Auth ────────────────────────────────────────────────────────────

def verify_telegram_data(data: dict) -> bool:
    """
    Verify the authentication data received from the Telegram Login Widget.
    
    The verification process:
    1. Sort all received fields (except 'hash') alphabetically.
    2. Create a "data check string" by joining them with newlines.
    3. Compute HMAC-SHA256 using SHA256(bot_token) as the secret key.
    4. Compare the computed hash with the received hash.
    
    See: https://core.telegram.org/widgets/login#checking-authorization
    """
    received_hash = data.get("hash", "")
    
    # Build the data-check-string
    check_items = []
    for key in sorted(data.keys()):
        if key == "hash":
            continue
        check_items.append(f"{key}={data[key]}")
    
    data_check_string = "\n".join(check_items)
    
    # Create secret key from bot token
    secret_key = hashlib.sha256(settings.TELEGRAM_BOT_TOKEN.encode()).digest()
    
    # Compute HMAC
    computed_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256,
    ).hexdigest()
    
    return hmac.compare_digest(computed_hash, received_hash)
