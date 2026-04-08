"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ImageOff, X, Coins, AlertTriangle } from "lucide-react";
import { formatPrice, getCardImageUrl } from "@/lib/utils";
import { useCardPrice } from "@/lib/hooks/use-prices";
import { usePriceHistory } from "@/lib/hooks/use-price-history";
import { computeSpikePct, isOutlierLow } from "@/lib/sell-utils";
import { usePanelContext } from "@/contexts/panel-context";
import QuantityControl from "@/components/collection/quantity-control";
import CardSiblings from "@/components/cards/card-siblings";
import CardDeckUsage from "@/components/cards/card-deck-usage";
import CardExpansions from "@/components/cards/card-expansions";
import SellListToggle from "@/components/sell/sell-list-toggle";
import type { Card } from "@/lib/types";
import PriceSparkline from "@/components/cards/price-sparkline";

const COLOR_STYLES: Record<string, { color: string; bg: string }> = {
  Red: { color: "var(--red)", bg: "var(--red-translucent)" },
  Blue: { color: "var(--blue)", bg: "var(--blue-translucent)" },
  Yellow: { color: "var(--yellow)", bg: "var(--yellow-translucent)" },
  Green: { color: "var(--green)", bg: "var(--green-translucent)" },
  Black: { color: "var(--text-secondary)", bg: "var(--elevated)" },
  Purple: { color: "var(--purple)", bg: "var(--purple-translucent)" },
  White: { color: "var(--text-primary)", bg: "var(--elevated)" },
};

export default function CardPanel({ card, onClose, onCardSelect }: { card: Card | null; onClose: () => void; onCardSelect?: (card: Card) => void }) {
  const { data: price } = useCardPrice(card?.card_number ?? null);
  const { data: priceHistory7d } = usePriceHistory(7);
  const { data: priceHistory30d } = usePriceHistory(30);
  const spikePct = (() => {
    if (!card || !price?.price_trend || !priceHistory7d) return null;
    const base = card.base_card_number;
    const history = priceHistory7d.filter((h) => h.card_number === base);
    return computeSpikePct(price, history);
  })();
  const cardHistory30d = useMemo(() => {
    if (!card || !priceHistory30d) return [];
    const base = card.base_card_number;
    return priceHistory30d.filter((h) => h.card_number === base);
  }, [card, priceHistory30d]);
  const { openPanel, closePanel } = usePanelContext();
  const [imageError, setImageError] = useState(false);
  const prevCardRef = useRef<string | null>(null);

  const currentCardNumber = card?.card_number ?? null;
  if (currentCardNumber !== prevCardRef.current) {
    prevCardRef.current = currentCardNumber;
    if (imageError) setImageError(false);
  }

  useEffect(() => {
    if (card) {
      openPanel();
    } else {
      closePanel();
    }
  }, [card, openPanel, closePanel]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const isOpen = !!card;
  const colorStyle = card ? (COLOR_STYLES[card.color] ?? { color: "var(--text-secondary)", bg: "var(--elevated)" }) : null;
  const displayImageUrl = card ? (card.image_url || getCardImageUrl(card.base_card_number)) : "";

  return (
    <>
      {/* Mobile overlay only */}
      {isOpen && <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={onClose} />}

      {/* Panel — always rendered, slides in/out via translateX on desktop, translateY on mobile */}
      <div
        className={`fixed z-50 overflow-y-auto bg-[var(--surface)] p-5 shadow-xl transition-transform duration-300 ease-in-out
          bottom-0 left-0 right-0 max-h-[80vh] rounded-t-2xl
          md:bottom-0 md:top-0 md:left-auto md:right-0 md:w-[400px] md:max-h-full md:rounded-none md:border-l md:border-[var(--border)]
          ${isOpen ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-y-0 md:translate-x-full"}`}
      >
        {/* Mobile drag handle */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--border)] md:hidden" />

        {/* Desktop close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 hidden rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--elevated)] md:block"
        >
          <X size={18} />
        </button>

        {!card ? null : <>
        {/* Card Header */}
        <div className="flex gap-4">
          <div className="relative h-[180px] w-[128px] flex-shrink-0 overflow-hidden rounded-lg border border-[var(--border)]">
            {imageError ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-[var(--elevated)] text-[var(--text-dim)]">
                <ImageOff size={20} />
                <span className="text-[10px]">{card.card_number}</span>
              </div>
            ) : (
              <Image
                key={displayImageUrl}
                src={displayImageUrl}
                alt={card.name}
                fill
                sizes="128px"
                className="object-cover"
                onError={() => setImageError(true)}
              />
            )}
          </div>
          <div className="flex-1 space-y-2.5">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">{card.name}</h2>
            <p className="text-sm text-[var(--text-muted)]">{card.card_number}</p>
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-md px-2 py-0.5 text-xs font-medium" style={{ background: "var(--purple-translucent)", color: "var(--purple)" }}>{card.card_type}</span>
              {card.rarity && <span className="rounded-md px-2 py-0.5 text-xs font-medium" style={{ background: "var(--yellow-translucent)", color: "var(--yellow)" }}>{card.rarity}</span>}
              <span className="rounded-md px-2 py-0.5 text-xs font-medium" style={{ background: colorStyle!.bg, color: colorStyle!.color }}>{card.color}</span>
              {card.variant_name !== "Regular" && (
                <span className="rounded-md px-2 py-0.5 text-xs font-medium" style={{ background: "var(--accent-translucent)", color: "var(--accent)" }}>{card.variant_name}</span>
              )}
            </div>
          </div>
        </div>

        {/* Stats Row */}
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

        {/* Siblings */}
        <CardSiblings
          card={card}
          onSiblingSelect={(sibling) => { if (onCardSelect) onCardSelect(sibling); }}
        />

        {/* Collection */}
        <div className="mt-3 rounded-lg bg-[var(--elevated)] p-3">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">My Collection</div>
          <QuantityControl cardNumber={card.card_number} />
        </div>

        {/* Sell List */}
        <SellListToggle cardNumber={card.card_number} />

        {/* Deck Usage */}
        <CardDeckUsage cardNumber={card.card_number} />

        {/* Expansions */}
        <CardExpansions cardNumber={card.base_card_number} />

        {/* Price */}
        <div className="mt-3 rounded-lg bg-[var(--elevated)] p-3">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Market Price</div>
          <div className="flex items-baseline gap-3">
            <span className="flex items-center gap-1.5 text-lg font-bold text-[var(--green)]">
              <Coins size={16} />
              {formatPrice(price?.price_low ?? null)}
            </span>
            {price && isOutlierLow(price) && (
              <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-[var(--yellow)] bg-[var(--yellow-translucent)]" title="Lowest listing is significantly below the median — may be mispriced or damaged">
                <AlertTriangle size={10} />
                Outlier?
              </span>
            )}
            {spikePct !== null && (
              <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-bold text-[var(--green)] bg-[var(--green-translucent)]">
                ↑ {Math.round(spikePct * 100)}%
              </span>
            )}
          </div>
          {price?.price_trend !== null && price?.price_trend !== undefined && (
            <p className="mt-1 text-xs text-[var(--text-muted)]">Trend: {formatPrice(price.price_trend)}</p>
          )}
          <PriceSparkline history={cardHistory30d} />
        </div>
        </>}
      </div>
    </>
  );
}
