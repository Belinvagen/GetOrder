import sys
import os

# Ensure the app module can be imported
sys.path.insert(0, os.path.abspath("."))

from app.database import SessionLocal
from app.models import Restaurant, Category, MenuItem, Order

def main():
    db = SessionLocal()
    try:
        # Get the first restaurant (the main one)
        restaurant = db.query(Restaurant).first()
        if not restaurant:
            print("No restaurant found. Run seed.py first.")
            return

        print(f"Preparing demonstration data for restaurant: {restaurant.name} (ID: {restaurant.id})")

        # 1. Update restaurant details and images (always, in case they got overwritten)
        old_chat_id = restaurant.telegram_chat_id  # Preserve TG binding!
        restaurant.name = "Fusion"
        restaurant.description = "Авторская кухня премиум-класса. Лучшие стейки, итальянская пицца и фирменные десерты."
        restaurant.logo_url = "/img/logo_fusion_1777160555339.png"
        restaurant.cover_url = "/img/cover_fusion_1777160568634.png"
        if old_chat_id:
            restaurant.telegram_chat_id = old_chat_id
        db.commit()

        # 2. Skip menu rebuild if already populated (check if Fusion categories exist)
        existing_cats = db.query(Category).filter(Category.restaurant_id == restaurant.id).count()
        if existing_cats >= 5:
            print(f"Menu already has {existing_cats} categories — skipping rebuild.")
            print("Database ready!")
            return

        # 3. Full rebuild: delete old data
        deleted_orders = db.query(Order).delete()
        print(f"Deleted {deleted_orders} old orders.")

        deleted_categories = db.query(Category).filter(Category.restaurant_id == restaurant.id).delete()
        print(f"Deleted {deleted_categories} old categories.")
        
        db.query(MenuItem).delete()

        # 4. Create new categories
        categories = {
            "Закуски": Category(name="Закуски", sort_order=1, restaurant_id=restaurant.id),
            "Пицца": Category(name="Пицца", sort_order=2, restaurant_id=restaurant.id),
            "Горячие блюда": Category(name="Горячие блюда", sort_order=3, restaurant_id=restaurant.id),
            "Десерты": Category(name="Десерты", sort_order=4, restaurant_id=restaurant.id),
            "Напитки": Category(name="Напитки", sort_order=5, restaurant_id=restaurant.id),
        }
        
        for cat in categories.values():
            db.add(cat)
        db.commit()
        
        print("Categories created.")

        # 5. Create new items
        items = [
            # ЗАКУСКИ
            MenuItem(
                category_id=categories["Закуски"].id,
                name="Цезарь с курицей на гриле",
                description="Классический салат с хрустящим роменом, сочной куриной грудкой, чесночными крутонами и фирменным соусом Цезарь.",
                price=58000,
                image_url="/img/food_caesar_salad_1777160632537.png",
                is_active=True
            ),
            MenuItem(
                category_id=categories["Закуски"].id,
                name="Итальянская Брускетта",
                description="Аутентичная брускетта на поджаренной чиабатте со спелыми томатами, свежим базиликом и бальзамическим кремом.",
                price=42000,
                image_url="/img/food_bruschetta_1777161639044.png",
                is_active=True
            ),
            MenuItem(
                category_id=categories["Закуски"].id,
                name="Хрустящие Кольца Кальмара",
                description="Золотистые кольца кальмара в легкой панировке. Подаются с дольками лимона и соусом тар-тар.",
                price=65000,
                image_url="/img/food_calamari_1777161651963.png",
                is_active=True
            ),

            # ПИЦЦА
            MenuItem(
                category_id=categories["Пицца"].id,
                name="Пицца Маргарита",
                description="Аутентичная неаполитанская пицца с томатным соусом Сан-Марцано, свежей моцареллой фиор ди латте и базиликом на тонком тесте.",
                price=68000,
                image_url="/img/food_pizza_margherita_1777160580440.png",
                is_active=True
            ),
            MenuItem(
                category_id=categories["Пицца"].id,
                name="Пицца Пепперони",
                description="Классическая пицца с пикантной колбаской пепперони, тягучей моцареллой и фирменным томатным соусом.",
                price=79000,
                image_url="/img/food_pizza_pepperoni_1777161664205.png",
                is_active=True
            ),
            MenuItem(
                category_id=categories["Пицца"].id,
                name="Пицца Четыре Сыра",
                description="Идеальное сочетание горгонзолы, пармезана, моцареллы и эмменталя на тонком хрустящем тесте без томатного соуса.",
                price=88000,
                image_url="/img/food_pizza_quattro_1777161676909.png",
                is_active=True
            ),

            # ГОРЯЧИЕ БЛЮДА
            MenuItem(
                category_id=categories["Горячие блюда"].id,
                name="Спагетти Карбонара",
                description="Итальянская паста с хрустящей панчеттой, сыром пекорино романо и густым яичным соусом. Без сливок!",
                price=62000,
                image_url="/img/food_pasta_carbonara_1777160592450.png",
                is_active=True
            ),
            MenuItem(
                category_id=categories["Горячие блюда"].id,
                name="Стейк из лосося",
                description="Нежный стейк норвежского лосося, приготовленный на гриле, подается с зеленой спаржей и лимонно-масляным соусом.",
                price=165000,
                image_url="/img/food_salmon_steak_1777160620169.png",
                is_active=True
            ),
            MenuItem(
                category_id=categories["Горячие блюда"].id,
                name="Бургер Шеф-повара",
                description="Сочная котлета из мраморной говядины, сыр чеддер, хрустящий бекон и фирменный соус на булочке бриошь.",
                price=69000,
                image_url="/img/food_burger_1777161693665.png",
                is_active=True
            ),
            MenuItem(
                category_id=categories["Горячие блюда"].id,
                name="Стейк Рибай",
                description="Премиальный отруб мраморной говядины прожарки Medium Rare с веточкой розмарина и чесночным маслом.",
                price=320000,
                image_url="/img/food_ribeye_1777161708011.png",
                is_active=True
            ),

            # ДЕСЕРТЫ
            MenuItem(
                category_id=categories["Десерты"].id,
                name="Нью-Йоркский Чизкейк",
                description="Воздушный чизкейк из сливочного сыра на песочной основе, политый домашним клубничным конфитюром.",
                price=38000,
                image_url="/img/food_cheesecake_1777160645386.png",
                is_active=True
            ),
            MenuItem(
                category_id=categories["Десерты"].id,
                name="Классический Тирамису",
                description="Нежный итальянский десерт на основе сыра маскарпоне и печенья савоярди, пропитанного кофе эспрессо.",
                price=42000,
                image_url="/img/food_tiramisu_1777161721890.png",
                is_active=True
            ),
            MenuItem(
                category_id=categories["Десерты"].id,
                name="Воздушные Панкейки",
                description="Пышные американские блинчики с кленовым сиропом, свежими лесными ягодами и сахарной пудрой.",
                price=35000,
                image_url="/img/food_pancakes_1777161737616.png",
                is_active=True
            ),

            # НАПИТКИ
            MenuItem(
                category_id=categories["Напитки"].id,
                name="Цитрусовый Лимонад",
                description="Освежающий крафтовый лимонад со льдом, свежей мятой и дольками лимона. Идеально утоляет жажду.",
                price=28000,
                image_url="/img/food_lemonade_1777160658264.png",
                is_active=True
            ),
            MenuItem(
                category_id=categories["Напитки"].id,
                name="Капучино",
                description="Идеальный баланс крепкого эспрессо и нежной молочной пенки. Подается с авторским латте-артом.",
                price=22000,
                image_url="/img/food_cappuccino_1777161749469.png",
                is_active=True
            ),
        ]

        for item in items:
            db.add(item)
        db.commit()

        print(f"Added {len(items)} menu items.")
        print("Database successfully prepared for demonstration!")

    except Exception as e:
        print(f"Error occurred: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
