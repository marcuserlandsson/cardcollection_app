import type { Expansion } from "@/lib/types";

interface ExpansionGridProps {
  expansions: Expansion[];
  onSelect: (expansion: Expansion) => void;
}

export default function ExpansionGrid({ expansions, onSelect }: ExpansionGridProps) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {expansions.map((exp) => (
        <button
          key={exp.code}
          onClick={() => onSelect(exp)}
          className="rounded-lg bg-[var(--surface)] p-4 text-center transition-colors hover:bg-[var(--surface-hover)]"
        >
          <div className="text-sm font-bold text-[var(--accent)]">{exp.code}</div>
          <div className="mt-1 text-xs text-[var(--text-secondary)]">{exp.card_count} cards</div>
        </button>
      ))}
    </div>
  );
}
