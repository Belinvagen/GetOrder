"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCartStore } from "@/store/cartStore";
import { formatPrice } from "@/lib/api";

export default function CartButton() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const totalItems = useCartStore((s) => s.totalItems());
  const totalAmount = useCartStore((s) => s.totalAmount());

  if (!mounted || totalItems === 0) return null;

  return (
    <Link href="/checkout" className="block">
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <button className="btn-accent flex items-center gap-3 rounded-2xl px-6 py-4 text-base shadow-2xl shadow-accent/30">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
            {totalItems}
          </span>
          <span className="font-semibold">Корзина</span>
          <span className="ml-2 font-bold">{formatPrice(totalAmount)}</span>
        </button>
      </div>
    </Link>
  );
}
