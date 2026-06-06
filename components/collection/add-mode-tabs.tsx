"use client";

export type AddMode = "search" | "checklist" | "paste";

const TABS: { id: AddMode; label: string }[] = [
  { id: "search", label: "Search & add" },
  { id: "checklist", label: "Set checklist" },
  { id: "paste", label: "Paste list" },
];

interface AddModeTabsProps {
  mode: AddMode;
  onChange: (mode: AddMode) => void;
}

export default function AddModeTabs({ mode, onChange }: AddModeTabsProps) {
  return (
    <div className="flex gap-5 border-b border-[var(--border)]">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`-mb-px border-b-2 pb-2 text-sm font-medium transition-colors ${
            mode === tab.id
              ? "border-[var(--text-primary)] text-[var(--text-primary)]"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
