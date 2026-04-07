export type SellFilter = "all" | "surplus" | "sell-list" | "spiked";

interface SellFilterChipsProps {
  active: SellFilter;
  onChange: (filter: SellFilter) => void;
  counts: { all: number; surplus: number; sellList: number; spiked: number };
}

const FILTERS: { key: SellFilter; label: string; countKey: keyof SellFilterChipsProps["counts"] }[] = [
  { key: "all", label: "All", countKey: "all" },
  { key: "surplus", label: "Surplus", countKey: "surplus" },
  { key: "sell-list", label: "Sell List", countKey: "sellList" },
  { key: "spiked", label: "Spiked ↑", countKey: "spiked" },
];

export default function SellFilterChips({ active, onChange, counts }: SellFilterChipsProps) {
  return (
    <div className="flex gap-2">
      {FILTERS.map(({ key, label, countKey }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            active === key
              ? "bg-[var(--accent)] text-[var(--background)]"
              : "bg-[var(--elevated)] text-[var(--text-muted)] border border-[var(--border)] hover:bg-[var(--surface)]"
          }`}
        >
          {label}
          {counts[countKey] > 0 && (
            <span className={`ml-1.5 ${active === key ? "opacity-75" : "text-[var(--text-dim)]"}`}>
              {counts[countKey]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
