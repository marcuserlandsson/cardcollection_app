"use client";

import { Check } from "lucide-react";
import { useGame } from "@/contexts/game-context";

interface CardFiltersProps {
  filters: { color?: string; card_type?: string; rarity?: string };
  onChange: (filters: { color?: string; card_type?: string; rarity?: string }) => void;
}

export default function CardFilters({ filters, onChange }: CardFiltersProps) {
  const { game } = useGame();

  function toggle(key: "color" | "card_type" | "rarity", value: string) {
    onChange({
      ...filters,
      [key]: filters[key] === value ? undefined : value,
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {game.colors.map((c) => {
          const active = filters.color === c.label;
          return (
            <button
              key={c.label}
              onClick={() => toggle("color", c.label)}
              className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors"
              style={{
                background: active ? c.bg : "var(--elevated)",
                borderColor: active ? c.border : "var(--border-light)",
                color: active ? c.color : "var(--text-secondary)",
              }}
            >
              {active && <Check size={12} />}
              {c.label}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {game.cardTypes.map((t) => {
          const active = filters.card_type === t.label;
          const Icon = t.icon;
          return (
            <button
              key={t.label}
              onClick={() => toggle("card_type", t.label)}
              className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors"
              style={{
                background: active ? "var(--accent-translucent)" : "var(--elevated)",
                borderColor: active ? "var(--accent-border)" : "var(--border-light)",
                color: active ? "var(--accent)" : "var(--text-secondary)",
              }}
            >
              <Icon size={12} />
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {game.rarities.map((r) => {
          const active = filters.rarity === r;
          return (
            <button
              key={r}
              onClick={() => toggle("rarity", r)}
              className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors"
              style={{
                background: active ? "var(--yellow-translucent)" : "var(--elevated)",
                borderColor: active ? "var(--yellow-border)" : "var(--border-light)",
                color: active ? "var(--yellow)" : "var(--text-secondary)",
              }}
            >
              {active && <Check size={12} />}
              {r}
            </button>
          );
        })}
      </div>
    </div>
  );
}
