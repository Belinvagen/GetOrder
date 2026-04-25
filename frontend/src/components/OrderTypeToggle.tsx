"use client";

interface Props {
  value: "takeout" | "dine_in";
  onChange: (value: "takeout" | "dine_in") => void;
}

export default function OrderTypeToggle({ value, onChange }: Props) {
  return (
    <div className="flex rounded-xl bg-surface border border-border/50 p-1">
      <button
        onClick={() => onChange("takeout")}
        className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-3 px-4 text-sm font-semibold transition-all duration-300 ${
          value === "takeout"
            ? "bg-accent text-white shadow-lg shadow-accent/25"
            : "text-text-muted hover:text-foreground"
        }`}
      >
        <span className="text-lg">🥡</span>
        <span>С собой</span>
      </button>
      <button
        onClick={() => onChange("dine_in")}
        className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-3 px-4 text-sm font-semibold transition-all duration-300 ${
          value === "dine_in"
            ? "bg-accent text-white shadow-lg shadow-accent/25"
            : "text-text-muted hover:text-foreground"
        }`}
      >
        <span className="text-lg">🍽️</span>
        <span>В зале</span>
      </button>
    </div>
  );
}
