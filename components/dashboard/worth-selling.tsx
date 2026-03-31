"use client";

import Link from "next/link";
import { useCollection } from "@/lib/hooks/use-collection";
import { useAllDeckCards } from "@/lib/hooks/use-decks";
import { usePrices } from "@/lib/hooks/use-prices";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { buildSellableCards, formatPrice } from "@/lib/utils";
import CardImage from "@/components/cards/card-image";
import { TrendingUp, PackageMinus, Coins } from "lucide-react";
import type { Card } from "@/lib/types";

const supabase = createClient();

export default function WorthSelling() {
  const { data: collection } = useCollection();
  const { data: allDeckCards } = useAllDeckCards();
  const { data: prices } = usePrices();

  const cardNumbers = collection?.map((c) => c.card_number) ?? [];
  const { data: cards } = useQuery<Card[]>({
    queryKey: ["dashboard-cards", cardNumbers],
    queryFn: async () => {
      if (cardNumbers.length === 0) return [];
      const { data, error } = await supabase.from("cards").select("*").in("card_number", cardNumbers);
      if (error) throw error;
      return data as Card[];
    },
    enabled: cardNumbers.length > 0,
  });

  const sellableCards =
    cards && collection && allDeckCards && prices
      ? buildSellableCards(cards, collection, allDeckCards, prices)
      : [];

  const top5 = sellableCards.slice(0, 5);

  if (top5.length === 0) {
    return (
      <div className="rounded-xl bg-[var(--surface)] p-5">
        <h2 className="text-sm font-semibold">Worth Selling</h2>
        <div className="mt-4 flex flex-col items-center py-4">
          <TrendingUp size={28} className="text-[var(--border)]" />
          <p className="mt-2 text-xs text-[var(--text-muted)]">No surplus cards to sell.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[var(--surface)] p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Worth Selling</h2>
        <Link href="/sell" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
          View all
        </Link>
      </div>
      <div className="mt-3 space-y-2">
        {top5.map((item) => (
          <Link
            key={item.card.card_number}
            href="/sell"
            className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-[var(--elevated)]"
          >
            <div className="relative h-10 w-7 flex-shrink-0 overflow-hidden rounded border border-[var(--border)]">
              <CardImage cardNumber={item.card.card_number} alt={item.card.name} imageUrl={item.card.image_url} fill sizes="28px" className="object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{item.card.name}</p>
              <p className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                <PackageMinus size={10} />
                x{item.surplus} surplus
              </p>
            </div>
            <div className="text-right">
              <p className="flex items-center gap-1 text-sm font-bold text-[var(--yellow)]">
                <Coins size={12} />
                {formatPrice(item.total_value)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
