"use client";

interface CardFiltersProps {
  filters: { color?: string; card_type?: string; rarity?: string };
  onChange: (filters: { color?: string; card_type?: string; rarity?: string }) => void;
}

const COLORS = ["Red", "Blue", "Yellow", "Green", "Black", "Purple", "White"];
const TYPES = ["Digimon", "Tamer", "Option", "Digi-Egg"];
const RARITIES = ["Common", "Uncommon", "Rare", "Super Rare", "Secret Rare"];

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs transition-colors ${
        active
          ? "bg-[var(--accent)] text-white"
          : "bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
      }`}
    >
      {label}
    </button>
  );
}

export default function CardFilters({ filters, onChange }: CardFiltersProps) {
  function toggle(key: "color" | "card_type" | "rarity", value: string) {
    onChange({
      ...filters,
      [key]: filters[key] === value ? undefined : value,
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {COLORS.map((c) => (
        <FilterChip key={c} label={c} active={filters.color === c} onClick={() => toggle("color", c)} />
      ))}
      <span className="mx-1 self-center text-[var(--border)]">|</span>
      {TYPES.map((t) => (
        <FilterChip key={t} label={t} active={filters.card_type === t} onClick={() => toggle("card_type", t)} />
      ))}
      <span className="mx-1 self-center text-[var(--border)]">|</span>
      {RARITIES.map((r) => (
        <FilterChip key={r} label={r} active={filters.rarity === r} onClick={() => toggle("rarity", r)} />
      ))}
    </div>
  );
}
