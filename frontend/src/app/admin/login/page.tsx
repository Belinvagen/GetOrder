"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { adminLogin, adminRegister } from "@/lib/api";
import { useAdminStore } from "@/store/adminStore";

type Tab = "login" | "register";

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, isLoggedIn } = useAdminStore();

  const [tab, setTab] = useState<Tab>("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Login fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Register fields
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");

  // If already logged in, redirect
  useEffect(() => {
    if (isLoggedIn) {
      router.push("/admin");
    }
  }, [isLoggedIn, router]);

  if (isLoggedIn) {
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await adminLogin(username, password);
      login(data.access_token, data.restaurant_id);
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await adminRegister({
        username: regUsername,
        password: regPassword,
        restaurant_name: restaurantName,
        description,
        address,
      });
      login(data.access_token, data.restaurant_id);
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl bg-surface border border-border/50 px-4 py-3 text-foreground placeholder:text-text-muted/50 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/25 transition-all";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="text-5xl">{tab === "login" ? "🔒" : "🏪"}</div>
          <h1 className="text-3xl font-extrabold text-foreground">
            {tab === "login" ? "Панель управления" : "Регистрация ресторана"}
          </h1>
          <p className="text-text-muted text-sm">
            {tab === "login"
              ? "Войдите как администратор ресторана"
              : "Создайте аккаунт и добавьте свой ресторан"}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 bg-surface/50 p-1 rounded-xl">
          <button
            onClick={() => { setTab("login"); setError(""); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              tab === "login"
                ? "bg-accent text-white shadow-lg"
                : "text-text-muted hover:text-foreground"
            }`}
          >
            Вход
          </button>
          <button
            onClick={() => { setTab("register"); setError(""); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              tab === "register"
                ? "bg-accent text-white shadow-lg"
                : "text-text-muted hover:text-foreground"
            }`}
          >
            Регистрация
          </button>
        </div>

        {/* Login Form */}
        {tab === "login" && (
          <form onSubmit={handleLogin} className="glass-card p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-muted">Логин</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="burger_admin"
                required
                className={inputClass}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-muted">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={inputClass}
              />
            </div>

            {error && (
              <div className="rounded-xl bg-danger/10 border border-danger/20 p-3 text-sm text-danger text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-accent w-full rounded-xl py-3.5 text-base font-bold"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Вход...
                </span>
              ) : (
                "Войти"
              )}
            </button>
          </form>
        )}

        {/* Register Form */}
        {tab === "register" && (
          <form onSubmit={handleRegister} className="glass-card p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-muted">Логин</label>
              <input
                type="text"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                placeholder="my_restaurant"
                required
                minLength={3}
                className={inputClass}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-muted">Пароль</label>
              <input
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="Минимум 6 символов"
                required
                minLength={6}
                className={inputClass}
              />
            </div>

            <hr className="border-border/30" />

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-muted">🏪 Название ресторана</label>
              <input
                type="text"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                placeholder="Мой ресторан"
                required
                className={inputClass}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-muted">📝 Описание</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Кратко о вашем заведении"
                className={inputClass}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-muted">📍 Адрес</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="ул. Пушкина 42, Бишкек"
                className={inputClass}
              />
            </div>

            {error && (
              <div className="rounded-xl bg-danger/10 border border-danger/20 p-3 text-sm text-danger text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-accent w-full rounded-xl py-3.5 text-base font-bold"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Создание...
                </span>
              ) : (
                "Создать ресторан"
              )}
            </button>
          </form>
        )}

        {/* Hints */}
        <p className="text-center text-xs text-text-muted/50">
          {tab === "login"
            ? "Тестовые: burger_admin / admin123 или sushi_admin / admin123"
            : "После регистрации вы сможете добавить меню и управлять заказами"}
        </p>
      </div>
    </div>
  );
}
