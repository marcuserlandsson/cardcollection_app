import Link from "next/link";
import type { Deck } from "@/lib/types";

interface DeckListCardProps {
  deck: Deck;
  cardCount: number;
  completionPercent: number;
}

export default function DeckListCard({ deck, cardCount, completionPercent }: DeckListCardProps) {
  return (
    <Link href={`/decks/${deck.id}`} className="block rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors duration-150 hover:bg-[var(--elevated)]">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">{deck.name}</h3>
        <span className="text-xs text-[var(--text-muted)]">{cardCount} cards</span>
      </div>
      {deck.description && <p className="mt-1 text-sm text-[var(--text-secondary)]">{deck.description}</p>}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--text-muted)]">Completion</span>
          <span className={completionPercent === 100 ? "font-medium text-[var(--success)]" : "text-[var(--text-primary)]"}>{completionPercent}%</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--elevated)]">
          <div className={`h-full rounded-full transition-all ${completionPercent === 100 ? "bg-[var(--success)]" : "bg-[var(--blue)] opacity-50"}`} style={{ width: `${completionPercent}%` }} />
        </div>
      </div>
    </Link>
  );
}
