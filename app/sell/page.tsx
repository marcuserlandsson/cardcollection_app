"use client";

import { useState, useCallback, useEffect } from "react";
import { useCollection } from "@/lib/hooks/use-collection";
import { useAllDeckCards } from "@/lib/hooks/use-decks";
import { usePrices } from "@/lib/hooks/use-prices";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/utils";
import { buildSellableCards } from "@/lib/sell-utils";
import SellSummary from "@/components/sell/sell-summary";
import SellCardRow from "@/components/sell/sell-card-row";
import CardPanel from "@/components/cards/card-panel";
import Link from "next/link";
import { TrendingUp, Clock, LogIn } from "lucide-react";
import type { Card } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

const supabase = createClient();

export default function SellPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const supabaseAuth = createClient();
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const { data: collection } = useCollection();
  const { data: allDeckCards } = useAllDeckCards();
  const { data: prices } = usePrices();

  useEffect(() => {
    supabaseAuth.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthChecked(true);
    });
  }, [supabaseAuth.auth]);

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
    ? buildSellableCards(cards, collection, allDeckCards ?? [], prices, [], [])
    : [];

  const totalSurplus = sellableCards.reduce((sum, s) => sum + s.surplus, 0);
  const totalValue = sellableCards.reduce((sum, s) => sum + (s.total_value ?? 0), 0);

  const latestFetch = prices?.reduce((latest, p) => {
    return !latest || p.fetched_at > latest ? p.fetched_at : latest;
  }, "" as string);

  const handleCardClick = useCallback((card: Card) => { setSelectedCard(card); }, []);

  if (authChecked && !user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <TrendingUp size={40} className="text-[var(--border)]" />
        <p className="text-[var(--text-muted)]">Sign in to access the sell advisor.</p>
        <Link href="/login" className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--background)] hover:bg-[var(--accent-hover)]">
          <LogIn size={15} />
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Sell Advisor</h1>
      {sellableCards.length > 0 && <SellSummary surplusCount={totalSurplus} totalValue={totalValue > 0 ? totalValue : null} />}
      {latestFetch && (
        <p className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <Clock size={12} />
          Prices updated {timeAgo(latestFetch)}
        </p>
      )}
      {sellableCards.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <TrendingUp size={40} className="mb-3 text-[var(--border)]" />
          <p className="text-sm text-[var(--text-muted)]">No surplus cards to sell.</p>
          <p className="text-xs text-[var(--text-dim)]">Cards beyond your playset limit or deck needs will appear here.</p>
        </div>
      )}
      <div className="space-y-2">
        {sellableCards.map((item) => (
          <SellCardRow key={item.card.card_number} item={item} onClick={() => handleCardClick(item.card)} />
        ))}
      </div>
      <CardPanel card={selectedCard} onClose={() => setSelectedCard(null)} onCardSelect={setSelectedCard} />
    </div>
  );
}
