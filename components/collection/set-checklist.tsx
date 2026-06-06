"use client";

import { useState } from "react";
import CardGrid from "@/components/cards/card-grid";
import EntryCardRow from "@/components/collection/entry-card-row";
import { useExpansions, useCardsByExpansion } from "@/lib/hooks/use-cards";
import { useCollectionMap } from "@/lib/hooks/use-collection";
import { filterChecklistCards, checklistStats, type ChecklistFilter } from "@/lib/collection-entry";
import type { CardView } from "@/components/cards/view-toggle";
import type { Card } from "@/lib/types";

const FILTERS: { id: ChecklistFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "missing", label: "Missing" },
  { id: "owned", label: "Owned" },
  { id: "surplus", label: "Surplus" },
];

interface SetChecklistProps {
  view: CardView;
  onAdjust: (card: Card, delta: number) => void;
}

export default function SetChecklist({ view, onAdjust }: SetChecklistProps) {
  const { data: expansions } = useExpansions();
  const [expansion, setExpansion] = useState<string | null>(null);
  const [filter, setFilter] = useState<ChecklistFilter>("all");
  const { data: cards, isLoading } = useCardsByExpansion(expansion);
  const owned = useCollectionMap();

  const allCards = cards ?? [];
  const stats = checklistStats(allCards, owned);
  const visible = filterChecklistCards(allCards, owned, filter);
  const pct = stats.total > 0 ? Math.round((stats.owned / stats.total) * 100) : 0;

  return (
    <div className="space-y-3">
      <select
        value={expansion ?? ""}
        onChange={(e) => setExpansion(e.target.value || null)}
        className="w-full rounded-lg border border-[var(--border-light)] bg-[var(--elevated)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-border)]"
      >
        <option value="">Choose an expansion…</option>
        {expansions?.map((exp) => (
          <option key={exp.code} value={exp.code}>
            {exp.name} ({exp.card_count})
          </option>
        ))}
      </select>

      {expansion && (
        <>
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>
              <strong className="text-[var(--text-primary)]">{stats.owned}</strong> / {stats.total} owned
            </span>
            <span>{stats.surplus} surplus</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--elevated)]">
            <div className="h-full rounded-full bg-[var(--blue)] opacity-60" style={{ width: `${pct}%` }} />
          </div>

          <div className="flex gap-4 border-b border-[var(--border)]">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`-mb-px border-b-2 pb-1.5 text-sm transition-colors ${
                  filter === f.id
                    ? "border-[var(--text-primary)] text-[var(--text-primary)]"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {isLoading && <p className="py-12 text-center text-sm text-[var(--text-muted)]">Loading…</p>}

          {!isLoading && view === "list" && (
            <div className="divide-y divide-[var(--border)]">
              {visible.map((card) => (
                <EntryCardRow
                  key={card.card_number}
                  card={card}
                  owned={owned.get(card.card_number) ?? 0}
                  onAdjust={onAdjust}
                />
              ))}
              {visible.length === 0 && (
                <p className="py-12 text-center text-sm text-[var(--text-muted)]">No cards match this filter.</p>
              )}
            </div>
          )}

          {!isLoading && view === "grid" && (
            <CardGrid cards={visible} quantities={owned} onCardClick={(card) => onAdjust(card, 1)} />
          )}
        </>
      )}
    </div>
  );
}
