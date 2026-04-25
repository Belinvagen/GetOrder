"use client";

import { useEffect, useState } from "react";
import { fetchMenu, fetchRestaurant, type FullMenu, type Restaurant } from "@/lib/api";
import CategoryNav from "@/components/CategoryNav";
import MenuItemCard from "@/components/MenuItemCard";
import CartButton from "@/components/CartButton";

const RESTAURANT_ID = 1;

export default function HomePage() {
  const [menu, setMenu] = useState<FullMenu | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      fetchMenu(RESTAURANT_ID),
      fetchRestaurant(RESTAURANT_ID).catch(() => null),
    ])
      .then(([menuData, restData]) => {
        setMenu(menuData);
        setRestaurant(restData);
        if (menuData.categories.length > 0) {
          setActiveCategoryId(menuData.categories[0].id);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <div className="flex items-center gap-4">
          <div className="skeleton h-16 w-16 rounded-2xl" />
          <div className="space-y-2 flex-1">
            <div className="skeleton h-8 w-2/3 rounded-lg" />
            <div className="skeleton h-4 w-1/2 rounded-lg" />
          </div>
        </div>
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
      {/* Header with logo */}
      <div className="mb-6 flex items-center gap-4">
        {/* Restaurant logo */}
        <div className="h-16 w-16 flex-shrink-0 rounded-2xl border border-border bg-surface flex items-center justify-center overflow-hidden shadow-sm">
          {restaurant?.logo_url ? (
            <img
              src={restaurant.logo_url}
              alt={menu.restaurant_name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-3xl">🍔</span>
          )}
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-foreground">
            {menu.restaurant_name}
          </h1>
          <p className="text-text-muted text-sm">
            Выберите блюда и закажите заранее
          </p>
          {restaurant?.address && (
            <p className="text-xs text-text-muted flex items-center gap-1">
              📍 {restaurant.address}
            </p>
          )}
        </div>
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
