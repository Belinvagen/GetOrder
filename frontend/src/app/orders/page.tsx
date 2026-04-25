"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { fetchOrder, formatPrice, type OrderResponse } from "@/lib/api";

const statusConfig: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  pending: { label: "Ожидает", emoji: "⏳", color: "text-warning", bg: "bg-warning/10" },
  cooking: { label: "Готовится", emoji: "🍳", color: "text-accent-light", bg: "bg-accent/10" },
  ready: { label: "Готово", emoji: "✅", color: "text-success", bg: "bg-success/10" },
  completed: { label: "Завершён", emoji: "📦", color: "text-text-muted", bg: "bg-surface" },
};

export default function OrdersPage() {
  const router = useRouter();
  const { isAuthenticated, orderIds } = useAuthStore();
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    if (orderIds.length === 0) {
      setLoading(false);
      return;
    }

    try {
      const results = await Promise.allSettled(
        orderIds.map((id) => fetchOrder(id))
      );
      const loaded = results
        .filter((r): r is PromiseFulfilledResult<OrderResponse> => r.status === "fulfilled")
        .map((r) => r.value)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setOrders(loaded);
    } catch (err) {
      console.error("Failed to load orders", err);
    } finally {
      setLoading(false);
    }
  }, [orderIds]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8 space-y-4">
        <div className="skeleton h-8 w-48 rounded-lg" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-foreground">Мои заказы</h1>
        <button
          onClick={loadOrders}
          className="text-xs text-accent-light hover:text-accent transition-colors font-medium"
        >
          🔄 Обновить
        </button>
      </div>

      {!isAuthenticated && (
        <div className="glass-card p-5 text-center space-y-3">
          <span className="text-4xl block">🔐</span>
          <p className="text-text-muted">Войдите через Telegram, чтобы видеть свои заказы</p>
          <button
            onClick={() => router.push("/checkout")}
            className="btn-accent rounded-xl px-5 py-2.5 text-sm"
          >
            Войти
          </button>
        </div>
      )}

      {orders.length === 0 && isAuthenticated ? (
        <div className="text-center py-16 space-y-3">
          <span className="text-5xl block">📋</span>
          <h2 className="text-lg font-semibold text-foreground">Заказов пока нет</h2>
          <p className="text-text-muted text-sm">Оформите первый заказ из любого ресторана</p>
          <button
            onClick={() => router.push("/")}
            className="btn-accent rounded-xl px-5 py-2.5 text-sm mt-2"
          >
            К ресторанам
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order, idx) => {
            const status = statusConfig[order.status] || statusConfig.pending;
            const items = (() => {
              try {
                return JSON.parse(order.items_json) as Array<{
                  name: string;
                  quantity: number;
                  price: number;
                  subtotal: number;
                }>;
              } catch {
                return [];
              }
            })();

            return (
              <div
                key={order.id}
                className="glass-card p-4 space-y-3 animate-fade-in-up"
                style={{
                  animationDelay: `${idx * 80}ms`,
                  animationFillMode: "backwards",
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-text-muted">
                      #{order.id}
                    </span>
                    <span className="text-xs text-text-muted">
                      {order.type === "takeout" ? "🥡 С собой" : "🍽️ В зале"}
                    </span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${status.color} ${status.bg}`}
                  >
                    <span>{status.emoji}</span>
                    <span>{status.label}</span>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-1">
                  {items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-foreground/80">
                        {item.name} × {item.quantity}
                      </span>
                      <span className="text-text-muted">
                        {formatPrice(item.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-border/30">
                  <span className="text-xs text-text-muted">
                    {new Date(order.created_at).toLocaleString("ru-RU", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Asia/Bishkek",
                    })}
                  </span>
                  <span className="font-bold text-foreground">
                    {formatPrice(order.total_amount)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
