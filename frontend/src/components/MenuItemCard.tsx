"use client";

import { useEffect, useState } from "react";
import type { MenuItem as MenuItemType } from "@/lib/api";
import { formatPrice } from "@/lib/api";
import { useCartStore } from "@/store/cartStore";

interface Props {
  item: MenuItemType;
  restaurantId: number;
  restaurantName: string;
}

export default function MenuItemCard({ item, restaurantId, restaurantName }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);

  const inCart = mounted ? cartItems.find((ci) => ci.menuItemId === item.id) : undefined;
  const isStopped = !item.is_active;

  const handleAdd = () => {
    if (isStopped) return;
    addItem(
      { menuItemId: item.id, name: item.name, price: item.price },
      restaurantId,
      restaurantName
    );
  };

  return (
    <div
      className={`glass-card p-4 flex gap-4 ${
        isStopped ? "menu-item-stopped" : ""
      }`}
    >
      {/* Square image */}
      <div className="relative h-24 w-24 flex-shrink-0 rounded-xl bg-gradient-to-br from-accent/10 to-accent-secondary/10 flex items-center justify-center overflow-hidden">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="h-full w-full object-cover rounded-xl"
          />
        ) : (
          <span className="text-2xl">🍴</span>
        )}
        {isStopped && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/60">
            <span className="text-[10px] font-bold text-danger bg-danger/10 px-2 py-0.5 rounded-full">
              Нет в наличии
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <h4 className="font-semibold text-foreground truncate">{item.name}</h4>
          {item.description && (
            <p className="text-xs text-text-muted mt-0.5 line-clamp-2">
              {item.description}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm font-bold text-accent-light">
            {formatPrice(item.price)}
          </span>

          {!isStopped && (
            <button
              onClick={handleAdd}
              className="flex items-center gap-1.5 rounded-lg bg-accent/15 hover:bg-accent/25 text-accent-light px-3 py-1.5 text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <span className="text-base leading-none">+</span>
              {inCart ? (
                <span>{inCart.quantity}</span>
              ) : (
                <span>Добавить</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
