"use client";

import { useEffect } from "react";
import CardImage from "@/components/cards/card-image";
import { formatPrice } from "@/lib/utils";
import { useCardPrice } from "@/lib/hooks/use-prices";
import { Coins } from "lucide-react";
import QuantityControl from "@/components/collection/quantity-control";
import type { Card } from "@/lib/types";

const COLOR_STYLES: Record<string, { color: string; bg: string }> = {
  Red: { color: "var(--red)", bg: "var(--red-translucent)" },
  Blue: { color: "var(--blue)", bg: "var(--blue-translucent)" },
  Yellow: { color: "var(--yellow)", bg: "var(--yellow-translucent)" },
  Green: { color: "var(--green)", bg: "var(--green-translucent)" },
  Black: { color: "var(--text-secondary)", bg: "var(--elevated)" },
  Purple: { color: "var(--purple)", bg: "var(--purple-translucent)" },
  White: { color: "var(--text-primary)", bg: "var(--elevated)" },
};

export default function CardPanel({ card, onClose }: { card: Card | null; onClose: () => void }) {
  const { data: price } = useCardPrice(card?.card_number ?? null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (!card) return null;

  const colorStyle = COLOR_STYLES[card.color] ?? { color: "var(--text-secondary)", bg: "var(--elevated)" };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-[var(--surface)] p-5 shadow-xl md:bottom-auto md:right-0 md:top-0 md:left-auto md:w-[400px] md:max-h-full md:rounded-none md:rounded-l-2xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--border)] md:hidden" />
        <div className="flex gap-4">
          <div className="relative h-[180px] w-[128px] flex-shrink-0 overflow-hidden rounded-lg border border-[var(--border)]">
            <CardImage cardNumber={card.card_number} alt={card.name} fill sizes="128px" className="object-cover" />
          </div>
          <div className="flex-1 space-y-2.5">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">{card.name}</h2>
            <p className="text-sm text-[var(--text-muted)]">{card.card_number}</p>
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-md px-2 py-0.5 text-xs font-medium" style={{ background: "var(--purple-translucent)", color: "var(--purple)" }}>{card.card_type}</span>
              {card.rarity && <span className="rounded-md px-2 py-0.5 text-xs font-medium" style={{ background: "var(--yellow-translucent)", color: "var(--yellow)" }}>{card.rarity}</span>}
              <span className="rounded-md px-2 py-0.5 text-xs font-medium" style={{ background: colorStyle.bg, color: colorStyle.color }}>{card.color}</span>
            </div>
          </div>
        </div>
        {(card.level !== null || card.play_cost !== null || card.dp !== null || card.evolution_cost !== null) && (
          <div className="mt-4 flex gap-2">
            {card.level !== null && (
              <div className="flex-1 rounded-lg bg-[var(--elevated)] px-3 py-2 text-center">
                <div className="text-sm font-bold text-[var(--text-primary)]">Lv.{card.level}</div>
                <div className="text-[10px] uppercase text-[var(--text-dim)]">Level</div>
              </div>
            )}
            {card.play_cost !== null && (
              <div className="flex-1 rounded-lg bg-[var(--elevated)] px-3 py-2 text-center">
                <div className="text-sm font-bold text-[var(--text-primary)]">{card.play_cost}</div>
                <div className="text-[10px] uppercase text-[var(--text-dim)]">Cost</div>
              </div>
            )}
            {card.dp !== null && (
              <div className="flex-1 rounded-lg bg-[var(--elevated)] px-3 py-2 text-center">
                <div className="text-sm font-bold text-[var(--text-primary)]">{card.dp}</div>
                <div className="text-[10px] uppercase text-[var(--text-dim)]">DP</div>
              </div>
            )}
            {card.evolution_cost !== null && (
              <div className="flex-1 rounded-lg bg-[var(--elevated)] px-3 py-2 text-center">
                <div className="text-sm font-bold text-[var(--text-primary)]">{card.evolution_cost}</div>
                <div className="text-[10px] uppercase text-[var(--text-dim)]">Evo</div>
              </div>
            )}
          </div>
        )}
        <div className="mt-4 rounded-lg bg-[var(--elevated)] p-3">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">My Collection</div>
          <QuantityControl cardNumber={card.card_number} />
        </div>
        <div className="mt-3 rounded-lg bg-[var(--elevated)] p-3">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Cardmarket Price</div>
          <div className="flex items-baseline gap-3">
            <span className="flex items-center gap-1.5 text-lg font-bold text-[var(--green)]">
              <Coins size={16} />
              {formatPrice(price?.price_trend ?? null)}
            </span>
            {price?.price_low !== null && price?.price_low !== undefined && (
              <span className="text-xs text-[var(--text-muted)]">Low: {formatPrice(price.price_low)}</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
