"use client";

import Link from "next/link";
import { useDecks, useAllDeckCards } from "@/lib/hooks/use-decks";
import { getBaseCardNumber } from "@/lib/utils";

interface CardDeckUsageProps {
  cardNumber: string;
}

export default function CardDeckUsage({ cardNumber }: CardDeckUsageProps) {
  const { data: decks } = useDecks();
  const { data: allDeckCards } = useAllDeckCards();

  if (!decks || !allDeckCards) return null;

  const baseCardNumber = getBaseCardNumber(cardNumber);

  const usages = allDeckCards
    .filter((dc) => dc.card_number === baseCardNumber)
    .map((dc) => {
      const deck = decks.find((d) => d.id === dc.deck_id);
      return deck ? { deckId: deck.id, deckName: deck.name, quantity: dc.quantity } : null;
    })
    .filter(Boolean) as { deckId: string; deckName: string; quantity: number }[];

  return (
    <div className="mt-3 rounded-lg bg-[var(--elevated)] p-3">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Used in Decks</div>
      {usages.length === 0 ? (
        <p className="text-xs text-[var(--text-dim)]">Not used in any deck</p>
      ) : (
        <div className="space-y-1.5">
          {usages.map((usage) => (
            <Link
              key={usage.deckId}
              href={`/decks/${usage.deckId}`}
              className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-[var(--surface)]"
            >
              <span className="text-[var(--text-secondary)]">{usage.deckName}</span>
              <span className="text-xs font-medium text-[var(--accent)]">x{usage.quantity}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
