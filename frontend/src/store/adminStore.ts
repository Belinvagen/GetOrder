"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AdminState {
  token: string | null;
  isLoggedIn: boolean;
  restaurantId: number | null; // auto-set from JWT, no manual selection
  login: (token: string, restaurantId: number) => void;
  logout: () => void;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      token: null,
      isLoggedIn: false,
      restaurantId: null,

      login: (token, restaurantId) =>
        set({ token, isLoggedIn: true, restaurantId }),

      logout: () =>
        set({ token: null, isLoggedIn: false, restaurantId: null }),
    }),
    { name: "getorder-admin" }
  )
);
