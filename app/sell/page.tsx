"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useCollection } from "@/lib/hooks/use-collection";
import { useAllDeckCards } from "@/lib/hooks/use-decks";
import { usePrices } from "@/lib/hooks/use-prices";
import { useSellList } from "@/lib/hooks/use-sell-list";
import { usePriceHistory } from "@/lib/hooks/use-price-history";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { buildSellableCards, findSpikedCards, isOutlierLow } from "@/lib/sell-utils";
import { timeAgo } from "@/lib/utils";
import SellSummary from "@/components/sell/sell-summary";
import SellCardRow from "@/components/sell/sell-card-row";
import PriceSpikeCards from "@/components/sell/price-spike-cards";
import SellFilterChips from "@/components/sell/sell-filter-chips";
import type { SellFilter } from "@/components/sell/sell-filter-chips";
import CardPanel from "@/components/cards/card-panel";
import Link from "next/link";
import { TrendingUp, Clock, LogIn, Download } from "lucide-react";
import { generateSellCsv, downloadCsv } from "@/lib/export-csv";
import type { Card, SellableCard } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

const supabase = createClient();

export default function SellPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const supabaseAuth = createClient();
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const searchParams = useSearchParams();
  const initialFilter = (searchParams.get("filter") as SellFilter) || "all";
  const [filter, setFilter] = useState<SellFilter>(initialFilter);

  const { data: collection } = useCollection();
  const { data: allDeckCards } = useAllDeckCards();
  const { data: prices } = usePrices();
  const { data: sellList } = useSellList();
  const { data: priceHistory } = usePriceHistory(7);

  useEffect(() => {
    supabaseAuth.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthChecked(true);
    });
  }, [supabaseAuth.auth]);

  // Fetch card data for all owned cards + sell list cards
  const ownedCardNumbers = collection?.map((c) => c.card_number) ?? [];
  const sellListCardNumbers = sellList?.map((s) => s.card_number) ?? [];
  const allRelevantCardNumbers = [...new Set([...ownedCardNumbers, ...sellListCardNumbers])];

  const { data: cards } = useQuery<Card[]>({
    queryKey: ["sell-cards", allRelevantCardNumbers],
    queryFn: async () => {
      if (allRelevantCardNumbers.length === 0) return [];
      const { data, error } = await supabase.from("cards").select("*").in("card_number", allRelevantCardNumbers);
      if (error) throw error;
      return data as Card[];
    },
    enabled: allRelevantCardNumbers.length > 0,
  });

  const sellableCards = useMemo(() => {
    if (!cards || !collection || !allDeckCards || !prices) return [];
    return buildSellableCards(
      cards, collection, allDeckCards, prices,
      sellList ?? [], priceHistory ?? []
    );
  }, [cards, collection, allDeckCards, prices, sellList, priceHistory]);

  const spikedCards = useMemo(() => {
    if (!cards || !collection || !prices || !priceHistory) return [];
    return findSpikedCards(cards, collection, prices, priceHistory, sellList ?? []);
  }, [cards, collection, prices, priceHistory, sellList]);

  // Build spiked-only cards (owned cards that spiked but aren't surplus or on sell list)
  const spikedOnlyCards = useMemo(() => {
    const sellableSet = new Set(sellableCards.map((c) => c.card.base_card_number));
    return spikedCards
      .filter((s) => !sellableSet.has(s.card.base_card_number))
      .map((s): SellableCard => ({
        card: s.card,
        owned: s.owned,
        needed: 0,
        surplus: 0,
        price: s.price,
        total_value: (s.price.price_low ?? s.price.price_trend) ? s.owned * (s.price.price_low ?? s.price.price_trend ?? 0) : null,
        source: "surplus",
        spike_pct: s.spike_pct,
        outlier_low: isOutlierLow(s.price),
      }));
  }, [spikedCards, sellableCards]);

  // Filter logic
  const filteredCards = useMemo(() => {
    switch (filter) {
      case "surplus":
        return sellableCards.filter((c) => c.source === "surplus" || c.source === "both");
      case "sell-list":
        return sellableCards.filter((c) => c.source === "sell-list" || c.source === "both");
      case "spiked": {
        const spikedSellable = sellableCards.filter((c) => c.spike_pct !== null);
        return [...spikedSellable, ...spikedOnlyCards].sort(
          (a, b) => (b.total_value ?? -1) - (a.total_value ?? -1)
        );
      }
      default:
        return sellableCards;
    }
  }, [sellableCards, spikedOnlyCards, filter]);

  const filterCounts = useMemo(() => {
    const spikedInSellable = sellableCards.filter((c) => c.spike_pct !== null).length;
    return {
      all: sellableCards.length,
      surplus: sellableCards.filter((c) => c.source === "surplus" || c.source === "both").length,
      sellList: sellableCards.filter((c) => c.source === "sell-list" || c.source === "both").length,
      spiked: spikedInSellable + spikedOnlyCards.length,
    };
  }, [sellableCards, spikedOnlyCards]);

  const totalSurplus = sellableCards.reduce((sum, s) => sum + s.surplus, 0);
  const totalValue = sellableCards.reduce((sum, s) => sum + (s.total_value ?? 0), 0);

  const latestFetch = prices?.reduce((latest, p) => {
    return !latest || p.fetched_at > latest ? p.fetched_at : latest;
  }, "" as string);

  const handleCardClick = useCallback((card: Card) => { setSelectedCard(card); }, []);

  const handleExport = useCallback(() => {
    if (filteredCards.length === 0) return;
    const csv = generateSellCsv(filteredCards);
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(csv, `cardboard-sell-export-${date}.csv`);
  }, [filteredCards]);

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

      {sellableCards.length > 0 && (
        <div className="flex items-start justify-between">
          <SellSummary surplusCount={totalSurplus} totalValue={totalValue > 0 ? totalValue : null} />
          <button
            onClick={handleExport}
            disabled={filteredCards.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--elevated)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={15} />
            Export CSV
          </button>
        </div>
      )}

      {latestFetch && (
        <p className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <Clock size={12} />
          Prices updated {timeAgo(latestFetch)}
        </p>
      )}

      <PriceSpikeCards spikedCards={spikedCards} onCardClick={handleCardClick} />

      {(sellableCards.length > 0 || spikedCards.length > 0) && (
        <>
          {spikedCards.length > 0 && <div className="border-t border-[var(--border)]" />}
          <SellFilterChips active={filter} onChange={setFilter} counts={filterCounts} />
        </>
      )}

      {filteredCards.length === 0 && sellableCards.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <TrendingUp size={40} className="mb-3 text-[var(--border)]" />
          <p className="text-sm text-[var(--text-muted)]">No surplus cards to sell.</p>
          <p className="text-xs text-[var(--text-dim)]">Cards beyond your playset limit or deck needs will appear here.</p>
        </div>
      )}

      {filteredCards.length === 0 && sellableCards.length > 0 && (
        <p className="py-8 text-center text-sm text-[var(--text-muted)]">No cards match this filter.</p>
      )}

      <div className="space-y-2">
        {filteredCards.map((item) => (
          <SellCardRow key={item.card.card_number} item={item} onClick={() => handleCardClick(item.card)} />
        ))}
      </div>

      <CardPanel card={selectedCard} onClose={() => setSelectedCard(null)} onCardSelect={setSelectedCard} />
    </div>
  );
}
