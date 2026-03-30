"use client";

import { useCollection } from "@/lib/hooks/use-collection";
import { useAllDeckCards } from "@/lib/hooks/use-decks";
import { usePrices } from "@/lib/hooks/use-prices";
import { buildSellableCards, formatPrice } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Layers, Fingerprint, TrendingUp, CircleDollarSign } from "lucide-react";
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
      const price = priceMap.get(c.card_number);
      return sum + (price ? price * c.quantity : 0);
    }, 0);
  }

  const sellableCards =
    cards && collection && allDeckCards && prices
      ? buildSellableCards(cards, collection, allDeckCards, prices)
      : [];
  const surplusValue = sellableCards.reduce((sum, s) => sum + (s.total_value ?? 0), 0);

  const stats = [
    { label: "Total Cards", value: totalCards, icon: Layers, color: "var(--accent)" },
    { label: "Unique", value: uniqueCards, icon: Fingerprint, color: "var(--blue)" },
    {
      label: "Collection Value",
      value: collectionValue !== null ? formatPrice(collectionValue) : "—",
      icon: TrendingUp,
      color: "var(--green)",
    },
    {
      label: "Surplus Value",
      value: surplusValue > 0 ? formatPrice(surplusValue) : "—",
      icon: CircleDollarSign,
      color: "var(--yellow)",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:flex">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="flex flex-1 items-center gap-3 rounded-xl bg-[var(--surface)] p-4">
            <div
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--elevated)]"
              style={{ color: stat.color }}
            >
              <Icon size={18} />
            </div>
            <div>
              <div className="text-lg font-bold">{stat.value}</div>
              <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{stat.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
