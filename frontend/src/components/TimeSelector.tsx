"use client";

import { useState } from "react";

interface Props {
  value: number; // minutes
  onChange: (minutes: number) => void;
}

const presets = [
  { label: "15 мин", value: 15 },
  { label: "30 мин", value: 30 },
  { label: "45 мин", value: 45 },
  { label: "1 час", value: 60 },
];

export default function TimeSelector({ value, onChange }: Props) {
  const [customMode, setCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const isPreset = presets.some((p) => p.value === value);

  const handleCustomSubmit = () => {
    const v = parseInt(customValue, 10);
    if (v > 0 && v <= 180) {
      onChange(v);
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-text-muted">
        ⏰ Время прибытия (через)
      </label>

      {/* Preset buttons */}
      <div className="grid grid-cols-4 gap-2">
        {presets.map((preset) => (
          <button
            key={preset.value}
            onClick={() => {
              onChange(preset.value);
              setCustomMode(false);
            }}
            className={`rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 ${
              value === preset.value && !customMode
                ? "bg-accent text-white shadow-lg shadow-accent/25"
                : "bg-surface border border-border/50 text-text-muted hover:text-foreground hover:border-accent/30"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom input toggle */}
      <button
        onClick={() => setCustomMode(!customMode)}
        className={`w-full rounded-xl py-2.5 text-sm font-medium transition-all duration-200 ${
          customMode || (!isPreset && value > 0)
            ? "bg-accent/15 text-accent-light border border-accent/30"
            : "bg-surface border border-border/50 text-text-muted hover:text-foreground hover:border-accent/30"
        }`}
      >
        {customMode ? "Своё время" : "⌨️ Указать своё время"}
      </button>

      {/* Custom input */}
      {customMode && (
        <div className="flex gap-2 animate-fade-in-up">
          <input
            type="number"
            min={1}
            max={180}
            placeholder="Минуты (1–180)"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            className="flex-1 rounded-xl bg-surface border border-border/50 px-4 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/25 transition-all"
          />
          <button
            onClick={handleCustomSubmit}
            className="btn-accent rounded-xl px-5 py-2.5 text-sm"
          >
            ОК
          </button>
        </div>
      )}

      {/* Selected display */}
      {value > 0 && (
        <p className="text-xs text-success flex items-center gap-1.5">
          <span>✓</span>
          Вы придёте через {value} мин
        </p>
      )}
    </div>
  );
}
