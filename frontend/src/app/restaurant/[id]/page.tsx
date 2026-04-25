"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchMenu, type FullMenu } from "@/lib/api";
import CategoryNav from "@/components/CategoryNav";
import MenuItemCard from "@/components/MenuItemCard";
import CartButton from "@/components/CartButton";

const trafficConfig: Record<string, { label: string; className: string }> = {
  green: { label: "🟢 Свободно", className: "text-success" },
  yellow: { label: "🟡 Умеренно", className: "text-warning" },
  red: { label: "🔴 Занято", className: "text-danger" },
};

export default function RestaurantPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [menu, setMenu] = useState<FullMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchMenu(id)
      .then((data) => {
        setMenu(data);
        if (data.categories.length > 0) {
          setActiveCategoryId(data.categories[0].id);
        }
      })
      .catch(() => router.push("/"))
      .finally(() => setLoading(false));
  }, [id, router]);

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

  if (!menu) return null;

  const activeCategory = menu.categories.find((c) => c.id === activeCategoryId);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-32">
      {/* Header */}
      <div className="mb-6 space-y-2">
        <button
          onClick={() => router.push("/")}
          className="text-sm text-text-muted hover:text-foreground transition-colors flex items-center gap-1"
        >
          ← Назад к ресторанам
        </button>
        <h1 className="text-3xl font-extrabold text-foreground">
          {menu.restaurant_name}
        </h1>
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
              {/* Active items first, then stopped */}
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
