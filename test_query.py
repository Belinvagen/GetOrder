import sys, os
sys.path.insert(0, os.path.abspath("."))
from app.database import SessionLocal
from app.models import MenuItem

def test(text_lower):
    db = SessionLocal()
    menu_items = db.query(MenuItem).filter(MenuItem.is_active == True).all()
    matched = None
    best_score = 0
    for mi in menu_items:
        name_lower = mi.name.lower()
        words = [w for w in name_lower.split() if len(w) >= 4]
        for w in words:
            stem = w[:len(w)-1] if len(w) > 4 else w
            if stem in text_lower and len(stem) > best_score:
                matched = mi
                best_score = len(stem)
    if matched:
        print(f"Matched {matched.name} (score {best_score}) for '{text_lower}'")
    else:
        print(f"No match for '{text_lower}'")

test("расскажи про пиццу маргариту")
test("что за тирамису")
test("как выглядит стейк")
test("добавь цезарь")
