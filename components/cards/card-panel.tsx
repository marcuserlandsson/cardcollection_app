"use client";

import { useEffect } from "react";
import Image from "next/image";
import { getCardImageUrl, formatPrice } from "@/lib/utils";
import { useCardPrice } from "@/lib/hooks/use-prices";
import QuantityControl from "@/components/collection/quantity-control";
import type { Card } from "@/lib/types";

interface CardPanelProps {
  card: Card | null;
  onClose: () => void;
}

export default function CardPanel({ card, onClose }: CardPanelProps) {
  const { data: price } = useCardPrice(card?.card_number ?? null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (!card) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-[var(--surface)] p-4 shadow-xl md:bottom-auto md:right-0 md:top-0 md:left-auto md:w-[400px] md:max-h-full md:rounded-none md:rounded-l-2xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--border)] md:hidden" />
        <div className="flex gap-4">
          <div className="relative h-[180px] w-[128px] flex-shrink-0 overflow-hidden rounded-lg">
            <Image src={getCardImageUrl(card.card_number)} alt={card.name} fill sizes="128px" className="object-cover" />
          </div>
          <div className="flex-1 space-y-2">
            <h2 className="text-lg font-bold">{card.name}</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              {card.card_number} · {card.card_type} · {card.color}
              {card.rarity && ` · ${card.rarity}`}
            </p>
            <div className="flex flex-wrap gap-2">
              {card.level !== null && <span className="rounded bg-[var(--background)] px-2 py-0.5 text-xs">Lv.{card.level}</span>}
              {card.play_cost !== null && <span className="rounded bg-[var(--background)] px-2 py-0.5 text-xs">Cost {card.play_cost}</span>}
              {card.dp !== null && <span className="rounded bg-[var(--background)] px-2 py-0.5 text-xs">{card.dp} DP</span>}
              {card.evolution_cost !== null && <span className="rounded bg-[var(--background)] px-2 py-0.5 text-xs">Evo {card.evolution_cost}</span>}
            </div>
          </div>
        </div>
        <div className="mt-4 rounded-lg bg-[var(--background)] p-3">
          <div className="mb-2 text-xs text-[var(--text-secondary)]">MY COLLECTION</div>
          <QuantityControl cardNumber={card.card_number} />
        </div>
        <div className="mt-3 rounded-lg bg-[var(--background)] p-3">
          <div className="mb-1 text-xs text-[var(--text-secondary)]">CARDMARKET PRICE</div>
          <div className="flex items-baseline gap-3">
            <span className="text-lg font-bold text-[var(--accent)]">{formatPrice(price?.price_trend ?? null)}</span>
            {price?.price_low !== null && price?.price_low !== undefined && (
              <span className="text-xs text-[var(--text-secondary)]">Low: {formatPrice(price.price_low)}</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
