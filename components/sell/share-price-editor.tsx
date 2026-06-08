"use client";

import type { SellableCard } from "@/lib/types";

interface SharePriceEditorProps {
  items: SellableCard[];
  prices: Record<string, string>;
  onChange: (cardNumber: string, value: string) => void;
}

export default function SharePriceEditor({ items, prices, onChange }: SharePriceEditorProps) {
  return (
    <div>
      <p className="mb-1 text-xs text-[var(--text-muted)]">Asking price per card</p>
      <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--elevated)] p-2">
        {items.map((item) => {
          const market = item.price?.price_low ?? item.price?.price_trend ?? null;
          return (
            <div key={item.card.card_number} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-[var(--text-primary)]">
                  {item.card.name}
                  {item.card.variant_name !== "Regular" && (
                    <span className="text-[var(--text-muted)]"> · {item.card.variant_name}</span>
                  )}
                </p>
                <p className="text-[10px] text-[var(--text-dim)]">
                  {item.card.card_number}
                  {market !== null && ` · mkt €${market.toFixed(2)}`}
                </p>
              </div>
              <div className="flex flex-none items-center gap-1 rounded-lg border border-[var(--border-light)] bg-[var(--surface)] px-2 py-1">
                <span className="text-xs text-[var(--text-muted)]">€</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={prices[item.card.card_number] ?? ""}
                  onChange={(e) => onChange(item.card.card_number, e.target.value)}
                  placeholder={market !== null ? market.toFixed(2) : "—"}
                  aria-label={`Asking price for ${item.card.name}`}
                  className="w-16 bg-transparent text-right text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-dim)]"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
