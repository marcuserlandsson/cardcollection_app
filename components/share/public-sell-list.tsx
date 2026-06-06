"use client";

import { useState } from "react";
import CardImage from "@/components/cards/card-image";
import ViewToggle, { type CardView } from "@/components/cards/view-toggle";
import { formatPrice } from "@/lib/utils";
import type { SellSharePayloadItem } from "@/lib/types";

interface PublicSellListProps {
  items: SellSharePayloadItem[];
}

export default function PublicSellList({ items }: PublicSellListProps) {
  const [view, setView] = useState<CardView>("list");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-muted)]">{items.length} cards available</p>
        <ViewToggle view={view} onChange={setView} />
      </div>

      {view === "list" && (
        <div className="divide-y divide-[var(--border)]">
          {items.map((item) => (
            <div key={item.card_number} className="flex items-center gap-3 py-2">
              <div className="relative h-12 w-9 flex-none overflow-hidden rounded">
                <CardImage
                  cardNumber={item.card_number}
                  alt={item.name}
                  imageUrl={item.image_url}
                  fill
                  sizes="36px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--text-primary)]">{item.name}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {item.card_number}
                  {item.variant_name !== "Regular" && ` · ${item.variant_name}`}
                </p>
              </div>
              <span className="text-xs text-[var(--text-muted)]">{item.quantity}×</span>
              <span className="min-w-[64px] text-right text-sm font-bold text-[var(--green)]">
                {item.price !== null ? formatPrice(item.price) : "—"}
              </span>
            </div>
          ))}
        </div>
      )}

      {view === "grid" && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {items.map((item) => (
            <div
              key={item.card_number}
              className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]"
            >
              <div className="relative aspect-[5/7]">
                <CardImage
                  cardNumber={item.card_number}
                  alt={item.name}
                  imageUrl={item.image_url}
                  fill
                  sizes="(max-width: 768px) 33vw, 20vw"
                  className="object-cover"
                />
                <span className="absolute right-1 top-1 rounded-full border border-[var(--border-light)] bg-[var(--elevated)] px-2 py-0.5 text-xs font-bold text-[var(--text-primary)]">
                  {item.quantity}×
                </span>
              </div>
              <div className="p-2">
                <p className="truncate text-xs font-medium">{item.name}</p>
                <p className="text-xs font-bold text-[var(--green)]">
                  {item.price !== null ? formatPrice(item.price) : "—"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
