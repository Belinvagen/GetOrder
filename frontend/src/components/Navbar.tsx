"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCartStore } from "@/store/cartStore";

export default function Navbar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const totalItems = useCartStore((s) => s.totalItems());

  const links = [
    { href: "/", label: "Меню", icon: "🍽️" },
    { href: "/orders", label: "Мои заказы", icon: "📋" },
    { href: "/admin", label: "Админ", icon: "🛠️" },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl">🚀</span>
            <span className="text-xl font-bold bg-gradient-to-r from-accent to-accent-secondary bg-clip-text text-transparent">
              GetOrder
            </span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                  pathname === link.href
                    ? "bg-accent/15 text-accent-light"
                    : "text-text-muted hover:bg-surface-hover hover:text-foreground"
                }`}
              >
                <span className="text-base">{link.icon}</span>
                <span className="hidden sm:inline">{link.label}</span>
              </Link>
            ))}

            {/* Cart */}
            <Link
              href="/checkout"
              className={`relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                pathname === "/checkout"
                  ? "bg-accent/15 text-accent-light"
                  : "text-text-muted hover:bg-surface-hover hover:text-foreground"
              }`}
            >
              <span className="text-base">🛒</span>
              <span className="hidden sm:inline">Корзина</span>
              {mounted && totalItems > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                  {totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
