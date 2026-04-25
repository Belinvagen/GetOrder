"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  menuItemId: number;
  name: string;
  price: number; // tiyns
  quantity: number;
}

interface CartState {
  restaurantId: number | null;
  restaurantName: string;
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, restaurantId: number, restaurantName: string) => void;
  removeItem: (menuItemId: number) => void;
  updateQuantity: (menuItemId: number, quantity: number) => void;
  clearCart: () => void;
  totalAmount: () => number;
  totalItems: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      restaurantId: null,
      restaurantName: "",
      items: [],

      addItem: (item, restaurantId, restaurantName) => {
        const state = get();

        // If switching restaurants, clear the cart
        if (state.restaurantId !== null && state.restaurantId !== restaurantId) {
          set({
            restaurantId,
            restaurantName,
            items: [{ ...item, quantity: 1 }],
          });
          return;
        }

        const existing = state.items.find((i) => i.menuItemId === item.menuItemId);
        if (existing) {
          set({
            restaurantId,
            restaurantName,
            items: state.items.map((i) =>
              i.menuItemId === item.menuItemId
                ? { ...i, quantity: i.quantity + 1 }
                : i
            ),
          });
        } else {
          set({
            restaurantId,
            restaurantName,
            items: [...state.items, { ...item, quantity: 1 }],
          });
        }
      },

      removeItem: (menuItemId) => {
        const items = get().items.filter((i) => i.menuItemId !== menuItemId);
        if (items.length === 0) {
          set({ items: [], restaurantId: null, restaurantName: "" });
        } else {
          set({ items });
        }
      },

      updateQuantity: (menuItemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(menuItemId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.menuItemId === menuItemId ? { ...i, quantity } : i
          ),
        });
      },

      clearCart: () =>
        set({ items: [], restaurantId: null, restaurantName: "" }),

      totalAmount: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

      totalItems: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: "getorder-cart",
    }
  )
);
