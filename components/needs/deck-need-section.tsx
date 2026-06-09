import Link from "next/link";
import { Check } from "lucide-react";
import NeedCardRow from "@/components/needs/need-card-row";
import type { Card, DeckNeedSection } from "@/lib/types";

interface DeckNeedSectionProps {
  section: DeckNeedSection;
  onCardClick: (card: Card) => void;
}

export default function DeckNeedSectionView({ section, onCardClick }: DeckNeedSectionProps) {
  const { deck, have, want, rows } = section;
  const isComplete = rows.length === 0;
  const pct = want > 0 ? Math.round((have / want) * 100) : 100;

  return (
    <section className="space-y-2">
      <div className="flex items-end justify-between gap-3 border-b border-[var(--border)] pb-2">
        <Link href={`/decks/${deck.id}`} className="truncate text-base font-semibold text-[var(--text-primary)] hover:text-[var(--accent)]">
          {deck.name}
        </Link>
        <span className="flex items-center gap-1.5 whitespace-nowrap text-xs text-[var(--text-muted)]">
          {isComplete && <Check size={13} className="text-[var(--green)]" />}
          {have} / {want} cards
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--elevated)]">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            backgroundColor: isComplete ? "var(--green)" : "var(--blue)",
            opacity: isComplete ? 1 : 0.5,
          }}
        />
      </div>

      {!isComplete && (
        <div className="space-y-2 pt-1">
          {rows.map((row) => (
            <NeedCardRow key={row.card.card_number} item={row} onClick={() => onCardClick(row.card)} />
          ))}
        </div>
      )}
    </section>
  );
}
