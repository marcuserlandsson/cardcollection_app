"use client";

import { useCollection } from "@/lib/hooks/use-collection";
import { useAllDeckCards } from "@/lib/hooks/use-decks";
import { usePrices } from "@/lib/hooks/use-prices";
import { formatPrice, getBaseCardNumber } from "@/lib/utils";
import { buildSellableCards } from "@/lib/sell-utils";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Card } from "@/lib/types";

const supabase = createClient();

export default function DashboardStats() {
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

  const totalCards = collection?.reduce((sum, c) => sum + c.quantity, 0) ?? 0;
  const uniqueCards = collection?.length ?? 0;

  let collectionValue: number | null = null;
  if (collection && prices) {
    const priceMap = new Map(prices.map((p) => [p.card_number, p.price_trend]));
    collectionValue = collection.reduce((sum, c) => {
      const price = priceMap.get(getBaseCardNumber(c.card_number));
      return sum + (price ? price * c.quantity : 0);
    }, 0);
  }

  const sellableCards =
    cards && collection && allDeckCards && prices
      ? buildSellableCards(cards, collection, allDeckCards, prices, [], [])
      : [];
  const surplusValue = sellableCards.reduce((sum, s) => sum + (s.total_value ?? 0), 0);

  const formattedCollectionValue = collectionValue !== null ? formatPrice(collectionValue) : "—";
  const formattedSurplusValue = surplusValue > 0 ? formatPrice(surplusValue) : null;

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-[var(--surface)] p-5">
        <div className="text-xs font-medium text-[var(--text-muted)]">Collection Value</div>
        <div className="mt-1 text-3xl font-bold">{formattedCollectionValue}</div>
        {formattedSurplusValue && (
          <div className="mt-1 text-xs text-[var(--green)]">+{formattedSurplusValue} surplus</div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-[var(--surface)] p-4">
          <div className="text-lg font-bold">{totalCards}</div>
          <div className="text-xs text-[var(--text-muted)]">Total cards</div>
        </div>
        <div className="rounded-xl bg-[var(--surface)] p-4">
          <div className="text-lg font-bold">{uniqueCards}</div>
          <div className="text-xs text-[var(--text-muted)]">Unique</div>
        </div>
        <div className="rounded-xl bg-[var(--surface)] p-4">
          <div className="text-lg font-bold">{sellableCards.length}</div>
          <div className="text-xs text-[var(--text-muted)]">To sell</div>
        </div>
      </div>
    </div>
  );
}
