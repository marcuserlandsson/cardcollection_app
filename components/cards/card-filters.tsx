"use client";

import { Swords, User, Zap, Egg, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface CardFiltersProps {
  filters: { color?: string; card_type?: string; rarity?: string };
  onChange: (filters: { color?: string; card_type?: string; rarity?: string }) => void;
}

const COLORS: { label: string; color: string; bg: string; border: string }[] = [
  { label: "Red", color: "var(--red)", bg: "var(--red-translucent)", border: "var(--red-border)" },
  { label: "Blue", color: "var(--blue)", bg: "var(--blue-translucent)", border: "var(--blue-border)" },
  { label: "Yellow", color: "var(--yellow)", bg: "var(--yellow-translucent)", border: "var(--yellow-border)" },
  { label: "Green", color: "var(--green)", bg: "var(--green-translucent)", border: "var(--green-border)" },
  { label: "Black", color: "var(--text-secondary)", bg: "var(--elevated)", border: "var(--border-light)" },
  { label: "Purple", color: "var(--purple)", bg: "var(--purple-translucent)", border: "var(--purple-border)" },
  { label: "White", color: "var(--text-primary)", bg: "var(--elevated)", border: "var(--border-light)" },
];

const TYPES: { label: string; icon: LucideIcon }[] = [
  { label: "Digimon", icon: Swords },
  { label: "Tamer", icon: User },
  { label: "Option", icon: Zap },
  { label: "Digi-Egg", icon: Egg },
];

const RARITIES = ["Common", "Uncommon", "Rare", "Super Rare", "Secret Rare"];

export default function CardFilters({ filters, onChange }: CardFiltersProps) {
  function toggle(key: "color" | "card_type" | "rarity", value: string) {
    onChange({
      ...filters,
      [key]: filters[key] === value ? undefined : value,
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {COLORS.map((c) => {
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
        {TYPES.map((t) => {
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
        {RARITIES.map((r) => {
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
