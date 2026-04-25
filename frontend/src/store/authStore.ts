"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/lib/api";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  orderIds: number[];
  addOrderId: (id: number) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      orderIds: [],

      login: (user, token) =>
        set({ user, token, isAuthenticated: true }),

      logout: () =>
        set({ user: null, token: null, isAuthenticated: false }),

      addOrderId: (id) => {
        const ids = get().orderIds;
        if (!ids.includes(id)) {
          set({ orderIds: [...ids, id] });
        }
      },
    }),
    {
      name: "getorder-auth",
    }
  )
);
