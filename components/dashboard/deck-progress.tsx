"use client";

import Link from "next/link";
import { useDecks, useDeckCards } from "@/lib/hooks/use-decks";
import { useCollectionMap } from "@/lib/hooks/use-collection";
import { SquareStack } from "lucide-react";
import type { Deck } from "@/lib/types";

function DeckProgressRow({ deck }: { deck: Deck }) {
  const { data: deckCards } = useDeckCards(deck.id);
  const quantities = useCollectionMap();

  const totalNeeded = deckCards?.reduce((sum, dc) => sum + dc.quantity, 0) ?? 0;
  const totalOwned = deckCards?.reduce((sum, dc) => {
    const owned = quantities.get(dc.card_number) ?? 0;
    return sum + Math.min(owned, dc.quantity);
  }, 0) ?? 0;
  const completionPercent = totalNeeded > 0 ? Math.round((totalOwned / totalNeeded) * 100) : 0;

  return (
    <Link
      href={`/decks/${deck.id}`}
      className="block rounded-lg p-2.5 transition-colors hover:bg-[var(--elevated)]"
    >
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium truncate">{deck.name}</span>
        <span
          className={`ml-2 text-xs font-medium ${
            completionPercent === 100 ? "text-[var(--green)]" : "text-[var(--text-secondary)]"
          }`}
        >
          {completionPercent}%
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--elevated)]">
        <div
          className={`h-full rounded-full transition-all ${
            completionPercent === 100 ? "bg-[var(--green)]" : "bg-[var(--blue)] opacity-50"
          }`}
          style={{ width: `${completionPercent}%` }}
        />
      </div>
    </Link>
  );
}

export default function DeckProgress() {
  const { data: decks } = useDecks();

  if (!decks || decks.length === 0) {
    return (
      <div className="rounded-xl bg-[var(--surface)] p-5">
        <h2 className="text-sm font-semibold">Deck Progress</h2>
        <div className="mt-4 flex flex-col items-center py-4">
          <SquareStack size={28} className="text-[var(--border)]" />
          <p className="mt-2 text-xs text-[var(--text-muted)]">No decks yet.</p>
          <Link
            href="/decks"
            className="mt-2 text-xs font-medium text-[var(--accent)] hover:underline"
          >
            Create a deck
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[var(--surface)] p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Deck Progress</h2>
        <Link href="/decks" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
          View all
        </Link>
      </div>
      <div className="mt-3 space-y-1">
        {decks.map((deck) => (
          <DeckProgressRow key={deck.id} deck={deck} />
        ))}
      </div>
    </div>
  );
}
