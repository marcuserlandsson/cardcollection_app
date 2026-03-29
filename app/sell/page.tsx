"use client";

import { useState, useCallback } from "react";
import { useCollection } from "@/lib/hooks/use-collection";
import { useAllDeckCards } from "@/lib/hooks/use-decks";
import { usePrices } from "@/lib/hooks/use-prices";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { buildSellableCards, timeAgo } from "@/lib/utils";
import SellSummary from "@/components/sell/sell-summary";
import SellCardRow from "@/components/sell/sell-card-row";
import CardPanel from "@/components/cards/card-panel";
import type { Card } from "@/lib/types";

const supabase = createClient();

export default function SellPage() {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const { data: collection } = useCollection();
  const { data: allDeckCards } = useAllDeckCards();
  const { data: prices } = usePrices();

  const cardNumbers = collection?.map((c) => c.card_number) ?? [];
  const { data: cards } = useQuery<Card[]>({
    queryKey: ["sell-cards", cardNumbers],
    queryFn: async () => {
      if (cardNumbers.length === 0) return [];
      const { data, error } = await supabase.from("cards").select("*").in("card_number", cardNumbers);
      if (error) throw error;
      return data as Card[];
    },
    enabled: cardNumbers.length > 0,
  });

  const sellableCards = cards && collection && allDeckCards && prices
    ? buildSellableCards(cards, collection, allDeckCards ?? [], prices)
    : [];

  const totalSurplus = sellableCards.reduce((sum, s) => sum + s.surplus, 0);
  const totalValue = sellableCards.reduce((sum, s) => sum + (s.total_value ?? 0), 0);

  const latestFetch = prices?.reduce((latest, p) => {
    return !latest || p.fetched_at > latest ? p.fetched_at : latest;
  }, "" as string);

  const handleCardClick = useCallback((card: Card) => { setSelectedCard(card); }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Sell Advisor</h1>
      {sellableCards.length > 0 && <SellSummary surplusCount={totalSurplus} totalValue={totalValue > 0 ? totalValue : null} />}
      {latestFetch && <p className="text-xs text-[var(--text-secondary)]">Prices updated {timeAgo(latestFetch)}</p>}
      {sellableCards.length === 0 && (
        <p className="py-12 text-center text-[var(--text-secondary)]">No surplus cards to sell. Cards beyond your playset limit (4) or deck needs will appear here.</p>
      )}
      <div className="space-y-2">
        {sellableCards.map((item) => (
          <SellCardRow key={item.card.card_number} item={item} onClick={() => handleCardClick(item.card)} />
        ))}
      </div>
      <CardPanel card={selectedCard} onClose={() => setSelectedCard(null)} />
    </div>
  );
}
