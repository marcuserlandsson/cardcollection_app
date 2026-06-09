"use client";

import CardImage from "@/components/cards/card-image";
import { formatPrice } from "@/lib/utils";
import { Coins, Minus, Plus, Trash2 } from "lucide-react";
import { useSetWishlist, useRemoveFromWishlist } from "@/lib/hooks/use-wishlist";
import type { NeededCard } from "@/lib/types";

interface WishlistRowProps {
  item: NeededCard;
  target: number;
  onClick: () => void;
}

export default function WishlistRow({ item, target, onClick }: WishlistRowProps) {
  const setMutation = useSetWishlist();
  const removeMutation = useRemoveFromWishlist();
  const unit = item.price?.price_low ?? item.price?.price_trend ?? null;
  const cardNumber = item.card.card_number;

  const setTarget = (quantity: number) => {
    if (quantity < 1) return;
    setMutation.mutate({ cardNumber, quantity });
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
      <button onClick={onClick} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <div className="relative h-16 w-11 flex-shrink-0 overflow-hidden rounded-md border border-[var(--border)]">
          <CardImage cardNumber={cardNumber} alt={item.card.name} imageUrl={item.card.image_url} fill sizes="44px" className="object-cover" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.card.name}</p>
          <p className="text-xs text-[var(--text-muted)]">{cardNumber}</p>
          <span className="mt-1 flex items-center gap-1 text-xs font-medium text-[var(--yellow)]">
            need {item.need} · own {item.owned}
          </span>
        </div>
      </button>

      <div className="flex flex-shrink-0 flex-col items-end gap-2">
        {unit !== null && (
          <p className="flex items-center gap-1 text-sm font-bold text-[var(--green)]">
            <Coins size={14} />
            {formatPrice(item.est_cost)}
          </p>
        )}
        <div className="flex items-center gap-1">
          <span className="mr-1 text-[10px] text-[var(--text-dim)]">want</span>
          <button
            onClick={() => setTarget(target - 1)}
            disabled={target <= 1 || setMutation.isPending}
            className="flex h-6 w-6 items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--elevated)] disabled:opacity-30"
            aria-label="Decrease target"
          >
            <Minus size={12} />
          </button>
          <span className="w-5 text-center text-sm font-medium">{target}</span>
          <button
            onClick={() => setTarget(target + 1)}
            disabled={setMutation.isPending}
            className="flex h-6 w-6 items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--elevated)] disabled:opacity-30"
            aria-label="Increase target"
          >
            <Plus size={12} />
          </button>
          <button
            onClick={() => removeMutation.mutate(cardNumber)}
            disabled={removeMutation.isPending}
            className="ml-1 flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--red-translucent)] hover:text-[var(--red)] disabled:opacity-30"
            aria-label="Remove from wishlist"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
