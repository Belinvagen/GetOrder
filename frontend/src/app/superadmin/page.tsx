"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { AdminAccount } from "@/lib/api";
import {
  adminLogin,
  getSuperadminAccounts,
  createSuperadminAccount,
  toggleAccountActive,
  resetAccountPassword,
  resetTelegramPairing,
} from "@/lib/api";

type Tab = "accounts";

export default function SuperAdminPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Login state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  // Create account modal
  const [showCreate, setShowCreate] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRestName, setNewRestName] = useState("");
  const [newRestDesc, setNewRestDesc] = useState("");
  const [newRestAddr, setNewRestAddr] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Password reset modal
  const [resetResult, setResetResult] = useState<{ username: string; password: string } | null>(null);

  // Confirm toggle modal
  const [confirmToggle, setConfirmToggle] = useState<AdminAccount | null>(null);

  const loadAccounts = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getSuperadminAccounts(token);
      setAccounts(data);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    // Check localStorage for saved token
    const saved = localStorage.getItem("superadmin_token");
    if (saved) {
      setToken(saved);
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) loadAccounts();
  }, [token, loadAccounts]);

  const handleLogin = async () => {
    setLoginError("");
    setLoggingIn(true);
    try {
      const data = await adminLogin(username, password);
      // Decode JWT to check is_superadmin
      const payload = JSON.parse(atob(data.access_token.split(".")[1]));
      if (!payload.is_superadmin) {
        setLoginError("У вас нет прав суперадмина");
        setLoggingIn(false);
        return;
      }
      localStorage.setItem("superadmin_token", data.access_token);
      setToken(data.access_token);
    } catch {
      setLoginError("Неверный логин или пароль");
    }
    setLoggingIn(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("superadmin_token");
    setToken(null);
    setAccounts([]);
  };

  const handleCreate = async () => {
    if (!token || !newUsername.trim() || !newPassword.trim() || !newRestName.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      await createSuperadminAccount(
        {
          username: newUsername.trim(),
          password: newPassword.trim(),
          restaurant_name: newRestName.trim(),
          restaurant_description: newRestDesc.trim() || undefined,
          restaurant_address: newRestAddr.trim() || undefined,
        },
        token
      );
      setShowCreate(false);
      setNewUsername("");
      setNewPassword("");
      setNewRestName("");
      setNewRestDesc("");
      setNewRestAddr("");
      loadAccounts();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Ошибка");
    }
    setCreating(false);
  };

  const handleToggle = async (acc: AdminAccount) => {
    if (!token) return;
    try {
      await toggleAccountActive(acc.admin_id, token);
      setConfirmToggle(null);
      loadAccounts();
    } catch {
      /* ignore */
    }
  };

  const handleResetPassword = async (acc: AdminAccount) => {
    if (!token) return;
    try {
      const result = await resetAccountPassword(acc.admin_id, token);
      setResetResult({ username: acc.username, password: result.new_password });
    } catch {
      /* ignore */
    }
  };

  const handleResetTelegram = async (acc: AdminAccount) => {
    if (!token || !acc.restaurant_id) return;
    try {
      await resetTelegramPairing(acc.restaurant_id, token);
      loadAccounts();
    } catch {
      /* ignore */
    }
  };

  // ─── Not logged in ──────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <span className="text-5xl">🛡️</span>
            <h1 className="text-2xl font-bold text-foreground">Суперадмин</h1>
            <p className="text-sm text-text-muted">GetOrder — Управление платформой</p>
          </div>

          <div className="glass-card p-6 space-y-4">
            {loginError && (
              <div className="rounded-xl bg-danger/10 border border-danger/20 p-3 text-sm text-danger text-center">
                {loginError}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-muted">Логин</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="root"
                className="w-full rounded-xl bg-surface border border-border/50 px-4 py-3 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-muted">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="••••••"
                className="w-full rounded-xl bg-surface border border-border/50 px-4 py-3 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-all"
              />
            </div>
            <button
              onClick={handleLogin}
              disabled={loggingIn || !username.trim() || !password.trim()}
              className="w-full btn-accent rounded-xl py-3 text-sm font-semibold disabled:opacity-40"
            >
              {loggingIn ? "Вхожу..." : "Войти"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Logged in — Dashboard ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🛡️</span>
            <h1 className="text-lg font-bold text-foreground">
              Super<span className="text-accent-light">Admin</span>
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-text-muted hover:text-foreground px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover transition-all"
          >
            🚪 Выйти
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4">
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{accounts.filter((a) => !a.is_superadmin).length}</p>
            <p className="text-xs text-text-muted mt-1">Ресторанов</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-success">{accounts.filter((a) => a.is_active && !a.is_superadmin).length}</p>
            <p className="text-xs text-text-muted mt-1">Активных</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-accent-light">{accounts.filter((a) => a.has_telegram && !a.is_superadmin).length}</p>
            <p className="text-xs text-text-muted mt-1">Telegram</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">👥 Аккаунты ресторанов</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-accent rounded-xl px-5 py-2.5 text-sm font-semibold"
          >
            + Добавить ресторан
          </button>
        </div>

        {/* Account table */}
        {loading ? (
          <div className="text-center py-16 text-text-muted">Загрузка...</div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Логин</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Ресторан</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-text-muted uppercase tracking-wider">Статус</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-text-muted uppercase tracking-wider">TG</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {accounts
                    .filter((a) => !a.is_superadmin)
                    .map((acc) => (
                      <tr key={acc.admin_id} className={`transition-colors hover:bg-surface/50 ${!acc.is_active ? "opacity-50" : ""}`}>
                        <td className="px-4 py-3">
                          <span className="font-mono font-semibold text-foreground">{acc.username}</span>
                        </td>
                        <td className="px-4 py-3 text-text-muted">{acc.restaurant_name || "—"}</td>
                        <td className="px-4 py-3 text-center">
                          {acc.is_active ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-success bg-success/10 px-2.5 py-1 rounded-full">
                              🟢 Активен
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-danger bg-danger/10 px-2.5 py-1 rounded-full">
                              🔴 Отключён
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {acc.has_telegram ? (
                            <button
                              onClick={() => handleResetTelegram(acc)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-danger bg-danger/10 px-2.5 py-1 rounded-lg hover:bg-danger/20 transition-all"
                              title="Нажмите чтобы сбросить привязку"
                            >
                              Отвязать
                            </button>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleResetPassword(acc)}
                              className="text-xs text-text-muted hover:text-accent-light px-2 py-1.5 rounded-lg hover:bg-accent/10 transition-all"
                              title="Сбросить пароль"
                            >
                              🔑
                            </button>
                            <button
                              onClick={() => setConfirmToggle(acc)}
                              className={`text-xs px-2 py-1.5 rounded-lg transition-all ${
                                acc.is_active
                                  ? "text-text-muted hover:text-danger hover:bg-danger/10"
                                  : "text-text-muted hover:text-success hover:bg-success/10"
                              }`}
                              title={acc.is_active ? "Деактивировать" : "Активировать"}
                            >
                              {acc.is_active ? "⛔" : "✅"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {accounts.filter((a) => !a.is_superadmin).length === 0 && (
              <div className="text-center py-16 space-y-3">
                <span className="text-5xl">📋</span>
                <p className="text-text-muted">Аккаунтов пока нет. Добавьте первый ресторан!</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ─── Create Account Modal ──────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="glass-card p-6 max-w-md w-full mx-4 space-y-4 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-foreground">➕ Новый ресторан</h3>

            {createError && (
              <div className="rounded-xl bg-danger/10 border border-danger/20 p-3 text-sm text-danger">
                {createError}
              </div>
            )}

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-muted">Логин администратора *</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="restaurant_admin"
                  className="w-full rounded-xl bg-surface border border-border/50 px-4 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-muted">Пароль *</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="admin123"
                  className="w-full rounded-xl bg-surface border border-border/50 px-4 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-muted">Название ресторана *</label>
                <input
                  type="text"
                  value={newRestName}
                  onChange={(e) => setNewRestName(e.target.value)}
                  placeholder="Мой Ресторан"
                  className="w-full rounded-xl bg-surface border border-border/50 px-4 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-muted">Описание</label>
                <input
                  type="text"
                  value={newRestDesc}
                  onChange={(e) => setNewRestDesc(e.target.value)}
                  placeholder="Описание ресторана"
                  className="w-full rounded-xl bg-surface border border-border/50 px-4 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-muted">Адрес</label>
                <input
                  type="text"
                  value={newRestAddr}
                  onChange={(e) => setNewRestAddr(e.target.value)}
                  placeholder="ул. Примерная 1, Бишкек"
                  className="w-full rounded-xl bg-surface border border-border/50 px-4 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-all"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleCreate}
                disabled={creating || !newUsername.trim() || !newPassword.trim() || !newRestName.trim()}
                className="flex-1 btn-accent rounded-xl py-3 text-sm font-semibold disabled:opacity-40"
              >
                {creating ? "Создаю..." : "Создать"}
              </button>
              <button
                onClick={() => { setShowCreate(false); setCreateError(""); }}
                className="flex-1 rounded-xl bg-surface hover:bg-surface-hover text-text-muted font-semibold py-3 text-sm transition-all"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Confirm Toggle Modal ──────────────────────────────────────────── */}
      {confirmToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setConfirmToggle(null)}>
          <div className="glass-card p-6 max-w-sm w-full mx-4 space-y-4 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-foreground">
              {confirmToggle.is_active ? "⛔ Деактивировать аккаунт?" : "✅ Активировать аккаунт?"}
            </h3>
            <p className="text-sm text-text-muted">
              {confirmToggle.is_active ? (
                <>
                  Аккаунт <strong className="text-foreground">{confirmToggle.username}</strong> ({confirmToggle.restaurant_name}) будет отключён.
                  Администратор не сможет войти в систему.
                </>
              ) : (
                <>
                  Аккаунт <strong className="text-foreground">{confirmToggle.username}</strong> ({confirmToggle.restaurant_name}) будет восстановлен.
                </>
              )}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleToggle(confirmToggle)}
                className={`flex-1 rounded-xl font-semibold py-3 text-sm transition-all ${
                  confirmToggle.is_active
                    ? "bg-danger/15 hover:bg-danger/25 text-danger"
                    : "bg-success/15 hover:bg-success/25 text-success"
                }`}
              >
                {confirmToggle.is_active ? "Деактивировать" : "Активировать"}
              </button>
              <button
                onClick={() => setConfirmToggle(null)}
                className="flex-1 rounded-xl bg-surface hover:bg-surface-hover text-text-muted font-semibold py-3 text-sm transition-all"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Password Reset Result Modal ───────────────────────────────────── */}
      {resetResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setResetResult(null)}>
          <div className="glass-card p-6 max-w-sm w-full mx-4 space-y-4 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-foreground">🔑 Пароль сброшен</h3>
            <div className="rounded-xl bg-surface p-4 space-y-2">
              <p className="text-sm text-text-muted">
                Логин: <strong className="text-foreground font-mono">{resetResult.username}</strong>
              </p>
              <p className="text-sm text-text-muted">
                Новый пароль: <strong className="text-accent-light font-mono text-base">{resetResult.password}</strong>
              </p>
            </div>
            <p className="text-xs text-text-muted">⚠️ Скопируйте пароль — он больше не будет показан!</p>
            <button
              onClick={() => setResetResult(null)}
              className="w-full rounded-xl bg-surface hover:bg-surface-hover text-foreground font-semibold py-3 text-sm transition-all"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
