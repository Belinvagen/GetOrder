"use client";

import { useEffect, useState } from "react";
import { fetchMenu, type FullMenu } from "@/lib/api";
import CategoryNav from "@/components/CategoryNav";
import MenuItemCard from "@/components/MenuItemCard";
import CartButton from "@/components/CartButton";

const RESTAURANT_ID = 1;

export default function HomePage() {
  const [menu, setMenu] = useState<FullMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);

  useEffect(() => {
    fetchMenu(RESTAURANT_ID)
      .then((data) => {
        setMenu(data);
        if (data.categories.length > 0) {
          setActiveCategoryId(data.categories[0].id);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <div className="skeleton h-10 w-2/3 rounded-lg" />
        <div className="flex gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-10 w-24 rounded-full" />
          ))}
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="text-center py-20">
        <span className="text-5xl mb-4 block">🍽️</span>
        <h2 className="text-xl font-semibold text-foreground">Меню не найдено</h2>
        <p className="text-text-muted mt-2">Попробуйте позже</p>
      </div>
    );
  }

  const activeCategory = menu.categories.find((c) => c.id === activeCategoryId);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-32">
      {/* Header */}
      <div className="mb-6 space-y-2">
        <h1 className="text-3xl font-extrabold text-foreground">
          {menu.restaurant_name}
        </h1>
        <p className="text-text-muted text-sm">
          Выберите блюда и закажите заранее — всё будет готово к вашему приходу
        </p>
      </div>

      {/* Category navigation */}
      {menu.categories.length > 0 && (
        <div className="mb-6">
          <CategoryNav
            categories={menu.categories.map((c) => ({ id: c.id, name: c.name }))}
            activeId={activeCategoryId}
            onSelect={setActiveCategoryId}
          />
        </div>
      )}

      {/* Menu items */}
      {activeCategory && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            {activeCategory.name}
            <span className="text-xs font-normal text-text-muted">
              ({activeCategory.items.filter((i) => i.is_active).length} доступно)
            </span>
          </h2>

          {activeCategory.items.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-text-muted">В этой категории пока нет блюд</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...activeCategory.items]
                .sort((a, b) => Number(b.is_active) - Number(a.is_active))
                .map((item, idx) => (
                  <div
                    key={item.id}
                    className="animate-fade-in-up"
                    style={{
                      animationDelay: `${idx * 60}ms`,
                      animationFillMode: "backwards",
                    }}
                  >
                    <MenuItemCard
                      item={item}
                      restaurantId={menu.restaurant_id}
                      restaurantName={menu.restaurant_name}
                    />
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Floating cart */}
      <CartButton />
    </div>
  );
}
