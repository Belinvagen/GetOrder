"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import { telegramAuth } from "@/lib/api";

const BOT_USERNAME = "GetOrderProjectTGBot";

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export default function TelegramLogin() {
  const { isAuthenticated, user, login, logout } = useAuthStore();
  const widgetRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Force re-mount tracking for SPA navigations
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleTelegramAuth = useCallback(async (tgUser: TelegramUser) => {
    setLoading(true);
    setError("");
    try {
      const response = await telegramAuth(tgUser);
      login(response.user, response.access_token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка авторизации");
    } finally {
      setLoading(false);
    }
  }, [login]);

  useEffect(() => {
    if (isAuthenticated || !mounted) return;

    // Set global callback
    (window as any).onTelegramAuth = handleTelegramAuth;

    // Inject widget script into container
    const container = widgetRef.current;
    if (!container) return;

    // Clear previous widget
    container.innerHTML = "";

    // Use a unique timestamp to force re-creation
    const script = document.createElement("script");
    script.src = `https://telegram.org/js/telegram-widget.js?${Date.now()}`;
    script.setAttribute("data-telegram-login", BOT_USERNAME);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "12");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    script.async = true;
    container.appendChild(script);

    return () => {
      delete (window as any).onTelegramAuth;
    };
  }, [isAuthenticated, mounted, handleTelegramAuth]);

  if (isAuthenticated && user) {
    return (
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-accent to-accent-secondary flex items-center justify-center text-white font-bold text-sm">
              {user.name.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-foreground">{user.name}</p>
              <p className="text-xs text-text-muted">{user.phone || "Telegram User"}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="text-xs text-text-muted hover:text-danger transition-colors"
          >
            Выйти
          </button>
        </div>

        {/* Points & discount */}
        <div className="flex gap-3">
          <div className="flex-1 rounded-lg bg-accent/10 p-3 text-center">
            <p className="text-lg font-bold text-accent-light">{user.points}</p>
            <p className="text-[10px] text-text-muted uppercase tracking-wider">Баллы</p>
          </div>
          <div className="flex-1 rounded-lg bg-success/10 p-3 text-center">
            <p className="text-lg font-bold text-success">{user.discount}%</p>
            <p className="text-[10px] text-text-muted uppercase tracking-wider">Скидка</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {loading && (
        <div className="flex items-center justify-center gap-2 py-2 text-sm text-text-muted">
          <span className="h-4 w-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          Авторизация...
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-danger/10 border border-danger/20 p-3 text-sm text-danger text-center">
          {error}
        </div>
      )}

      {/* Telegram Widget renders here */}
      <div ref={widgetRef} className="flex justify-center min-h-[40px]" />
    </div>
  );
}
