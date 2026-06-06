"use client";

import { Minus, Plus } from "lucide-react";
import CardImage from "@/components/cards/card-image";
import type { Card } from "@/lib/types";

interface EntryCardRowProps {
  card: Card;
  owned: number;
  onAdjust: (card: Card, delta: number) => void;
}

export default function EntryCardRow({ card, owned, onAdjust }: EntryCardRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-[var(--elevated)]">
      <div className="relative h-14 w-10 flex-none overflow-hidden rounded">
        <CardImage
          cardNumber={card.card_number}
          alt={card.name}
          imageUrl={card.image_url}
          fill
          sizes="40px"
          className="object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--text-primary)]">{card.name}</p>
        <p className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          {card.card_number}
          {card.variant_name !== "Regular" && (
            <span className="rounded-full border border-[var(--border-light)] px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)]">
              {card.variant_name}
            </span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => onAdjust(card, -1)}
          disabled={owned === 0}
          aria-label={`Remove one ${card.name}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-light)] bg-[var(--elevated)] text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-border)] hover:text-[var(--text-primary)] disabled:opacity-30"
        >
          <Minus size={14} />
        </button>
        <span className="min-w-[2ch] text-center text-base font-bold">{owned}</span>
        <button
          onClick={() => onAdjust(card, 1)}
          aria-label={`Add one ${card.name}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--background)] transition-colors hover:bg-[var(--accent-hover)]"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
