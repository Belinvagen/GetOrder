"""
Seed script: creates test admins (each linked to their restaurant),
restaurants, categories, and menu items.
Run: python seed.py
"""

import secrets

from app.database import SessionLocal, engine, Base
from app.models import Admin, User, Restaurant, Category, MenuItem, TrafficLight
from app.services.auth_service import hash_password


def seed():
    # Create tables if they don't exist (preserves existing data)
    Base.metadata.create_all(bind=engine)
    
    # Migrate: add new columns if they don't exist
    from sqlalchemy import text, inspect
    with engine.connect() as conn:
        inspector = inspect(engine)
        if "orders" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("orders")]
            if "customer_name" not in columns:
                conn.execute(text("ALTER TABLE orders ADD COLUMN customer_name VARCHAR(200) DEFAULT 'Гость'"))
            if "customer_phone" not in columns:
                conn.execute(text("ALTER TABLE orders ADD COLUMN customer_phone VARCHAR(30) DEFAULT ''"))
            conn.commit()
    
    db = SessionLocal()

    try:
        # ── Superadmin ───────────────────────────────────────────
        if not db.query(Admin).filter(Admin.is_superadmin == True).first():
            superadmin = Admin(
                username="root",
                hashed_password=hash_password("root123"),
                is_superadmin=True,
                is_active=True,
            )
            db.add(superadmin)
            print("[+] Superadmin 'root' created (password: root123)")

        # ── Test User ─────────────────────────────────────────
        if not db.query(User).first():
            user = User(tg_id=123456789, name="Тест Пользователь", phone="+996551234567")
            db.add(user)
            print("[+] Test user created: tg_id=123456789")

        # ── Restaurant 1 (manual mode) + Admin ────────────────
        r1 = db.query(Restaurant).filter(Restaurant.id == 1).first()
        if not r1:
            r1 = Restaurant(
                name="Burger Palace",
                description="Лучшие бургеры в городе",
                address="ул. Чуй 150, Бишкек",
                traffic_light=TrafficLight.green,
                pos_mode=False,
                tg_pairing_code=secrets.token_hex(3),
            )
            db.add(r1)
            db.flush()

            # Admin for Burger Palace
            admin1 = Admin(
                username="burger_admin",
                hashed_password=hash_password("admin123"),
                restaurant_id=r1.id,
            )
            db.add(admin1)
            print("[+] Admin 'burger_admin' created → Burger Palace")

            # Categories & Items
            cat_burgers = Category(restaurant_id=r1.id, name="Бургеры", sort_order=1)
            cat_drinks = Category(restaurant_id=r1.id, name="Напитки", sort_order=2)
            db.add_all([cat_burgers, cat_drinks])
            db.flush()

            db.add_all([
                MenuItem(category_id=cat_burgers.id, name="Классический бургер", description="Говядина, салат, томат, соус", price=25000, is_active=True),
                MenuItem(category_id=cat_burgers.id, name="Чизбургер", description="Двойной сыр, говядина", price=32000, is_active=True),
                MenuItem(category_id=cat_burgers.id, name="Чикен бургер", description="Куриная котлета, салат", price=22000, is_active=False),
                MenuItem(category_id=cat_drinks.id, name="Кола 0.5л", price=6000, is_active=True),
                MenuItem(category_id=cat_drinks.id, name="Лимонад", price=7000, is_active=True),
            ])
            print("[+] Restaurant 'Burger Palace' created with menu")

        # ── Restaurant 2 (R-Keeper mode) + Admin ──────────────
        r2 = db.query(Restaurant).filter(Restaurant.name == "Sushi Master").first()
        if not r2:
            r2 = Restaurant(
                name="Sushi Master",
                description="Японская кухня и суши",
                address="пр. Манаса 77, Бишкек",
                traffic_light=TrafficLight.yellow,
                pos_mode=True,
                tg_pairing_code=secrets.token_hex(3),
            )
            db.add(r2)
            db.flush()

            # Admin for Sushi Master
            admin2 = Admin(
                username="sushi_admin",
                hashed_password=hash_password("admin123"),
                restaurant_id=r2.id,
            )
            db.add(admin2)
            print("[+] Admin 'sushi_admin' created → Sushi Master")

            cat_rolls = Category(restaurant_id=r2.id, name="Роллы", sort_order=1)
            cat_sets = Category(restaurant_id=r2.id, name="Сеты", sort_order=2)
            db.add_all([cat_rolls, cat_sets])
            db.flush()

            db.add_all([
                MenuItem(category_id=cat_rolls.id, name="Филадельфия", description="Лосось, сливочный сыр", price=35000, is_active=True),
                MenuItem(category_id=cat_rolls.id, name="Калифорния", description="Краб, авокадо, огурец", price=30000, is_active=True),
                MenuItem(category_id=cat_sets.id, name="Сет на двоих", description="32 шт: Филадельфия, Калифорния, Дракон", price=90000, is_active=True),
            ])
            print("[+] Restaurant 'Sushi Master' (R-Keeper) created with menu")

        db.commit()
        print("\n[OK] Seed completed successfully!")
        print("\nТестовые аккаунты:")
        print("  burger_admin / admin123 → Burger Palace")
        print("  sushi_admin  / admin123 → Sushi Master")

        # Print pairing codes
        for r in db.query(Restaurant).all():
            if r.tg_pairing_code:
                print(f"  🔗 {r.name}: t.me/GetOrderProjectTGBot?start=pair_{r.tg_pairing_code}")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
