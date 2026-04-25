"use client";

import { useAuthStore } from "@/store/authStore";

export default function TelegramLogin() {
  const { isAuthenticated, user, login, logout } = useAuthStore();

  const handleMockLogin = () => {
    // Mock Telegram login — in production this would use the real Telegram Widget
    login(
      {
        id: 1,
        tg_id: 123456789,
        name: "Тест Пользователь",
        phone: "+77001234567",
        points: 150,
        discount: 5.0,
        created_at: new Date().toISOString(),
      },
      "mock-jwt-token-for-dev"
    );
  };

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
    <div className="glass-card p-5 space-y-4">
      <div className="text-center space-y-2">
        <div className="text-3xl">🔐</div>
        <h3 className="font-bold text-foreground">Войдите для быстрого заказа</h3>
        <p className="text-sm text-text-muted">
          Создайте аккаунт, чтобы не заполнять данные каждый раз и получать скидки
        </p>
      </div>

      <button
        onClick={handleMockLogin}
        className="w-full flex items-center justify-center gap-3 rounded-xl bg-[#2AABEE] hover:bg-[#229ED9] text-white font-semibold py-3.5 px-4 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#2AABEE]/20"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
        Войти через Telegram
      </button>
    </div>
  );
}
