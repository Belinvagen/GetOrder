"""
Restaurant CRUD routes (admin-protected where needed).
Admins can only modify their own restaurant.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_admin, require_restaurant_owner
from app.models import Restaurant, Admin
from app.schemas.restaurant import (
    RestaurantResponse,
    RestaurantUpdate,
    TrafficLightUpdate,
)

router = APIRouter(prefix="/api/restaurants", tags=["Restaurants"])


@router.get("/", response_model=List[RestaurantResponse])
def list_restaurants(db: Session = Depends(get_db)):
    """Get all restaurants (public)."""
    return db.query(Restaurant).all()


@router.get("/{restaurant_id}", response_model=RestaurantResponse)
def get_restaurant(restaurant_id: int, db: Session = Depends(get_db)):
    """Get a single restaurant by ID (public)."""
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ресторан с id={restaurant_id} не найден",
        )
    return restaurant


@router.put("/{restaurant_id}", response_model=RestaurantResponse)
def update_restaurant(
    restaurant_id: int,
    data: RestaurantUpdate,
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    """Update restaurant details (owner only)."""
    require_restaurant_owner(admin, restaurant_id)

    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ресторан с id={restaurant_id} не найден",
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(restaurant, field, value)

    db.commit()
    db.refresh(restaurant)
    return restaurant


@router.patch("/{restaurant_id}/traffic-light", response_model=RestaurantResponse)
def update_traffic_light(
    restaurant_id: int,
    data: TrafficLightUpdate,
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    """Update the traffic light status of a restaurant (owner only)."""
    require_restaurant_owner(admin, restaurant_id)

    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ресторан с id={restaurant_id} не найден",
        )

    restaurant.traffic_light = data.traffic_light
    db.commit()
    db.refresh(restaurant)
    return restaurant


@router.delete("/{restaurant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_restaurant(
    restaurant_id: int,
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    """Delete a restaurant and all related data (owner only)."""
    require_restaurant_owner(admin, restaurant_id)

    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ресторан с id={restaurant_id} не найден",
        )

    db.delete(restaurant)
    db.commit()
