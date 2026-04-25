"""
Image upload routes: restaurant logo, cover, and menu item images.
Uses Cloudinary for storage.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

import cloudinary
import cloudinary.uploader

from app.config import settings
from app.dependencies import get_db, get_current_admin, require_restaurant_owner
from app.models import Restaurant, MenuItem, Admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Uploads"])

# ─── Cloudinary init ──────────────────────────────────────────────────────────

_cloudinary_configured = False


def _ensure_cloudinary():
    global _cloudinary_configured
    if _cloudinary_configured:
        return
    if not settings.CLOUDINARY_CLOUD_NAME:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cloudinary не настроен. Заполните CLOUDINARY_* в .env",
        )
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )
    _cloudinary_configured = True


MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


async def _upload_to_cloudinary(file: UploadFile, folder: str) -> str:
    """Upload file to Cloudinary and return secure_url."""
    _ensure_cloudinary()

    # Validate content type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Разрешены только изображения (image/*)",
        )

    # Read and validate size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Файл слишком большой. Максимум {MAX_FILE_SIZE // 1024 // 1024}МБ",
        )

    try:
        result = cloudinary.uploader.upload(
            contents,
            folder=f"getorder/{folder}",
            resource_type="image",
            transformation=[
                {"quality": "auto", "fetch_format": "auto"},
            ],
        )
        return result["secure_url"]
    except Exception as e:
        logger.error(f"Cloudinary upload error: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Ошибка загрузки изображения: {str(e)}",
        )


# ─── Restaurant Logo ─────────────────────────────────────────────────────────

@router.post("/restaurants/{restaurant_id}/upload-logo")
async def upload_restaurant_logo(
    restaurant_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    """Upload restaurant logo image (owner only)."""
    require_restaurant_owner(admin, restaurant_id)

    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Ресторан не найден")

    url = await _upload_to_cloudinary(file, f"restaurants/{restaurant_id}/logo")

    restaurant.logo_url = url
    db.commit()
    db.refresh(restaurant)

    return {"logo_url": url}


# ─── Restaurant Cover ────────────────────────────────────────────────────────

@router.post("/restaurants/{restaurant_id}/upload-cover")
async def upload_restaurant_cover(
    restaurant_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    """Upload restaurant cover image (owner only)."""
    require_restaurant_owner(admin, restaurant_id)

    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Ресторан не найден")

    url = await _upload_to_cloudinary(file, f"restaurants/{restaurant_id}/cover")

    restaurant.cover_url = url
    db.commit()
    db.refresh(restaurant)

    return {"cover_url": url}


# ─── Menu Item Image ─────────────────────────────────────────────────────────

@router.post("/menu/{item_id}/upload-image")
async def upload_menu_item_image(
    item_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    """Upload menu item image (owner only)."""
    menu_item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not menu_item:
        raise HTTPException(status_code=404, detail="Блюдо не найдено")

    require_restaurant_owner(admin, menu_item.category.restaurant_id)

    url = await _upload_to_cloudinary(file, f"menu/{menu_item.category.restaurant_id}")

    menu_item.image_url = url
    db.commit()
    db.refresh(menu_item)

    return {"image_url": url}
