"use client";

import Link from "next/link";
import type { Restaurant } from "@/lib/api";

const trafficLabels: Record<string, { label: string; className: string; emoji: string }> = {
  green: { label: "Свободно", className: "traffic-green", emoji: "🟢" },
  yellow: { label: "Умеренно", className: "traffic-yellow", emoji: "🟡" },
  red: { label: "Занято", className: "traffic-red", emoji: "🔴" },
};

export default function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  const traffic = trafficLabels[restaurant.traffic_light] || trafficLabels.green;

  return (
    <Link href={`/restaurant/${restaurant.id}`} className="block">
      <div className="glass-card p-5 h-full flex flex-col gap-3 cursor-pointer group">
        {/* Header with logo/cover */}
        <div className="relative h-36 rounded-xl bg-gradient-to-br from-accent/20 to-accent-secondary/20 flex items-center justify-center overflow-hidden">
          {restaurant.cover_url ? (
            <img
              src={restaurant.cover_url}
              alt={restaurant.name}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : restaurant.logo_url ? (
            <img
              src={restaurant.logo_url}
              alt={restaurant.name}
              className="h-20 w-20 object-contain group-hover:scale-110 transition-transform duration-300"
            />
          ) : (
            <span className="text-5xl group-hover:scale-110 transition-transform duration-300">
              🍽️
            </span>
          )}

          {/* Logo overlay when cover exists */}
          {restaurant.cover_url && restaurant.logo_url && (
            <div className="absolute bottom-2 left-2 h-10 w-10 rounded-lg bg-background/80 backdrop-blur-sm border border-border/30 flex items-center justify-center overflow-hidden">
              <img src={restaurant.logo_url} alt="" className="h-full w-full object-cover rounded-lg" />
            </div>
          )}

          {/* Traffic light badge */}
          <div className="absolute top-3 right-3 flex items-center gap-2 rounded-full bg-background/70 backdrop-blur-sm px-3 py-1.5">
            <div className={`h-2.5 w-2.5 rounded-full ${traffic.className}`} />
            <span className="text-xs font-medium text-foreground/80">
              {traffic.label}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col gap-1.5">
          <h3 className="text-lg font-bold text-foreground group-hover:text-accent-light transition-colors">
            {restaurant.name}
          </h3>
          {restaurant.description && (
            <p className="text-sm text-text-muted line-clamp-2">
              {restaurant.description}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 text-xs text-text-muted pt-2 border-t border-border/30">
          <span>📍</span>
          <span className="truncate">{restaurant.address || "Адрес не указан"}</span>
        </div>
      </div>
    </Link>
  );
}
