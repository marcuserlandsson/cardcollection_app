"use client";

import Image from "next/image";
import { useCardSiblings } from "@/lib/hooks/use-cards";
import type { Card } from "@/lib/types";

interface CardSiblingsProps {
  card: Card;
  onSiblingSelect: (card: Card) => void;
}

export default function CardSiblings({ card, onSiblingSelect }: CardSiblingsProps) {
  const { data: siblings } = useCardSiblings(card.base_card_number);

  if (!siblings || siblings.length <= 1) return null;

  return (
    <div className="mt-3 rounded-lg bg-[var(--elevated)] p-3">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Other Versions</div>
      <div className="flex gap-2">
        {siblings
          .filter((s) => s.card_number !== card.card_number)
          .map((sibling) => (
            <button
              key={sibling.card_number}
              onClick={() => onSiblingSelect(sibling)}
              className="relative h-[50px] w-[36px] flex-shrink-0 overflow-hidden rounded border-2 border-[var(--border)] transition-colors hover:border-[var(--accent)]"
              title={sibling.variant_name}
            >
              <Image
                src={sibling.image_url || `https://images.digimoncard.io/images/cards/${sibling.base_card_number}.jpg`}
                alt={sibling.variant_name}
                fill
                sizes="36px"
                className="object-cover"
              />
            </button>
          ))}
      </div>
    </div>
  );
}
