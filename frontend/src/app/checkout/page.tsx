"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { createOrder, formatPrice } from "@/lib/api";
import OrderTypeToggle from "@/components/OrderTypeToggle";
import TimeSelector from "@/components/TimeSelector";
import TelegramLogin from "@/components/TelegramLogin";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, restaurantId, restaurantName, totalAmount, updateQuantity, removeItem, clearCart } = useCartStore();
  const { isAuthenticated, user, addOrderId } = useAuthStore();

  const [orderType, setOrderType] = useState<"takeout" | "dine_in">("takeout");
  const [arrivalMinutes, setArrivalMinutes] = useState(30);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ id: number; posMessage: string | null } | null>(null);

  const handleSubmit = async () => {
    if (!isAuthenticated || !user) {
      setError("Пожалуйста, войдите через Telegram");
      return;
    }
    if (items.length === 0) return;
    if (!restaurantId) return;

    setSubmitting(true);
    setError("");

    try {
      const arrivalTime = new Date(
        Date.now() + arrivalMinutes * 60 * 1000
      ).toISOString();

      const response = await createOrder({
        user_id: user.id,
        restaurant_id: restaurantId,
        type: orderType,
        arrival_time: arrivalTime,
        items: items.map((i) => ({
          menu_item_id: i.menuItemId,
          name: i.name,
          quantity: i.quantity,
          price: i.price,
        })),
      });

      addOrderId(response.id);
      setSuccess({ id: response.id, posMessage: response.pos_message });
      clearCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка при создании заказа");
    } finally {
      setSubmitting(false);
    }
  };

  // Success screen
  if (success) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center space-y-6">
        <div className="animate-fade-in-up">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-extrabold text-foreground">Заказ оформлен!</h1>
          <p className="text-text-muted mt-2">Заказ №{success.id} принят</p>

          {success.posMessage && (
            <div className="mt-4 glass-card p-4 inline-flex items-center gap-2 text-success">
              <span>📡</span>
              <span className="font-semibold">{success.posMessage}</span>
            </div>
          )}

          <div className="flex gap-3 justify-center mt-8">
            <button
              onClick={() => router.push("/orders")}
              className="btn-accent rounded-xl px-6 py-3"
            >
              📋 Мои заказы
            </button>
            <button
              onClick={() => router.push("/")}
              className="rounded-xl border border-border/50 px-6 py-3 text-sm font-semibold text-text-muted hover:text-foreground hover:border-accent/30 transition-all"
            >
              🏠 На главную
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty cart
  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center space-y-4">
        <div className="text-6xl">🛒</div>
        <h1 className="text-2xl font-bold text-foreground">Корзина пуста</h1>
        <p className="text-text-muted">Выберите блюда из меню ресторана</p>
        <button
          onClick={() => router.push("/")}
          className="btn-accent rounded-xl px-6 py-3 mt-4"
        >
          Перейти к ресторанам
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8 space-y-6">
      <h1 className="text-2xl font-extrabold text-foreground">Оформление заказа</h1>

      {/* Restaurant */}
      <div className="glass-card p-4 flex items-center gap-3">
        <span className="text-2xl">🍽️</span>
        <div>
          <p className="font-semibold text-foreground">{restaurantName}</p>
          <p className="text-xs text-text-muted">Ваш заказ из этого ресторана</p>
        </div>
      </div>

      {/* Order type toggle */}
      <OrderTypeToggle value={orderType} onChange={setOrderType} />

      {/* Time selector */}
      <TimeSelector value={arrivalMinutes} onChange={setArrivalMinutes} />

      {/* Cart items */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
          Ваш заказ
        </h2>

        {items.map((item) => (
          <div
            key={item.menuItemId}
            className="glass-card p-3 flex items-center justify-between gap-3"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate text-sm">{item.name}</p>
              <p className="text-xs text-accent-light">{formatPrice(item.price)}</p>
            </div>

            {/* Quantity controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                className="h-8 w-8 rounded-lg bg-surface hover:bg-surface-hover border border-border/50 text-foreground flex items-center justify-center text-sm font-bold transition-all"
              >
                −
              </button>
              <span className="w-6 text-center font-semibold text-sm">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                className="h-8 w-8 rounded-lg bg-accent/15 hover:bg-accent/25 text-accent-light flex items-center justify-center text-sm font-bold transition-all"
              >
                +
              </button>
              <button
                onClick={() => removeItem(item.menuItemId)}
                className="h-8 w-8 rounded-lg hover:bg-danger/15 text-text-muted hover:text-danger flex items-center justify-center text-xs transition-all ml-1"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="glass-card p-4 flex items-center justify-between">
        <span className="text-lg font-bold text-foreground">Итого</span>
        <span className="text-xl font-extrabold bg-gradient-to-r from-accent to-accent-secondary bg-clip-text text-transparent">
          {formatPrice(totalAmount())}
        </span>
      </div>

      {/* Telegram auth section */}
      <TelegramLogin />

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-danger/10 border border-danger/20 p-3 text-sm text-danger text-center">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={submitting || !isAuthenticated}
        className="btn-accent w-full rounded-xl py-4 text-lg font-bold disabled:opacity-40"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Отправляем...
          </span>
        ) : (
          `Оформить заказ — ${formatPrice(totalAmount())}`
        )}
      </button>
    </div>
  );
}
