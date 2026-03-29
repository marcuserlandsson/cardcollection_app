"use client";

import Image from "next/image";
import { getCardImageUrl } from "@/lib/utils";
import { useUpdateDeckCard } from "@/lib/hooks/use-decks";
import { Minus, Plus } from "lucide-react";
import type { Card } from "@/lib/types";

interface DeckCardRowProps {
  card: Card;
  deckId: string;
  quantityInDeck: number;
  quantityOwned: number;
}

export default function DeckCardRow({ card, deckId, quantityInDeck, quantityOwned }: DeckCardRowProps) {
  const { mutate: updateDeckCard } = useUpdateDeckCard();
  const isMissing = quantityOwned < quantityInDeck;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="relative h-16 w-11 flex-shrink-0 overflow-hidden rounded-md border border-[var(--border)]">
        <Image src={getCardImageUrl(card.card_number)} alt={card.name} fill sizes="44px" className="object-cover" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{card.name}</p>
        <p className="text-xs text-[var(--text-muted)]">{card.card_number}</p>
        <p className={`text-xs font-medium ${isMissing ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
          {isMissing ? `Missing ${quantityInDeck - quantityOwned} of ${quantityInDeck}` : `Owned ${quantityOwned} of ${quantityInDeck}`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => updateDeckCard({ deckId, cardNumber: card.card_number, quantity: quantityInDeck - 1 })} className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border-light)] bg-[var(--elevated)] text-[var(--text-secondary)] hover:border-[var(--accent-border)]">
          <Minus size={13} />
        </button>
        <span className="min-w-[2ch] text-center text-sm font-bold">{quantityInDeck}</span>
        <button onClick={() => updateDeckCard({ deckId, cardNumber: card.card_number, quantity: quantityInDeck + 1 })} className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--accent)] text-[var(--background)] hover:bg-[var(--accent-hover)]">
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}
