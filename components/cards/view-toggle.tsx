"use client";

import { List, LayoutGrid } from "lucide-react";

export type CardView = "list" | "grid";

interface ViewToggleProps {
  view: CardView;
  onChange: (view: CardView) => void;
}

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-[var(--border-light)] bg-[var(--elevated)] p-0.5">
      <button
        onClick={() => onChange("list")}
        aria-label="List view"
        className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
          view === "list"
            ? "bg-[var(--surface)] text-[var(--text-primary)]"
            : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        }`}
      >
        <List size={15} />
      </button>
      <button
        onClick={() => onChange("grid")}
        aria-label="Grid view"
        className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
          view === "grid"
            ? "bg-[var(--surface)] text-[var(--text-primary)]"
            : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        }`}
      >
        <LayoutGrid size={15} />
      </button>
    </div>
  );
}
