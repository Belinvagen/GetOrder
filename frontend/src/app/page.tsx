"use client";

import { useEffect, useState } from "react";
import { fetchRestaurants, type Restaurant } from "@/lib/api";
import RestaurantCard from "@/components/RestaurantCard";

export default function HomePage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRestaurants()
      .then(setRestaurants)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Hero */}
      <div className="mb-10 text-center space-y-4">
        <h1 className="text-4xl sm:text-5xl font-extrabold">
          <span className="bg-gradient-to-r from-accent via-accent-light to-accent-secondary bg-clip-text text-transparent">
            Закажи заранее
          </span>
          <br />
          <span className="text-foreground text-3xl sm:text-4xl">
            забери без ожидания
          </span>
        </h1>
        <p className="text-text-muted text-lg max-w-md mx-auto">
          Выберите ресторан, соберите заказ и укажите время — всё будет готово к вашему приходу
        </p>
      </div>

      {/* Restaurant Grid */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-5 space-y-4">
              <div className="skeleton h-36 rounded-xl" />
              <div className="skeleton h-5 w-3/4 rounded" />
              <div className="skeleton h-4 w-1/2 rounded" />
            </div>
          ))}
        </div>
      ) : restaurants.length === 0 ? (
        <div className="text-center py-20">
          <span className="text-5xl mb-4 block">🍽️</span>
          <h2 className="text-xl font-semibold text-foreground">Рестораны не найдены</h2>
          <p className="text-text-muted mt-2">Скоро здесь появятся партнёры</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((r, idx) => (
            <div
              key={r.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${idx * 100}ms`, animationFillMode: "backwards" }}
            >
              <RestaurantCard restaurant={r} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
