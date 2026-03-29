"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useExpansions, useCardsByExpansion, useCardSearch, useCardsFiltered } from "@/lib/hooks/use-cards";
import CardSearchBar from "@/components/cards/card-search-bar";
import CardFilters from "@/components/cards/card-filters";
import CardGrid from "@/components/cards/card-grid";
import ExpansionGrid from "@/components/cards/expansion-grid";
import CardPanel from "@/components/cards/card-panel";
import type { Card, Expansion } from "@/lib/types";

export default function DatabasePage() {
  const searchParams = useSearchParams();
  const [showConfirmed, setShowConfirmed] = useState(false);

  useEffect(() => {
    if (searchParams.get("confirmed") === "true") {
      setShowConfirmed(true);
      const timeout = setTimeout(() => setShowConfirmed(false), 5000);
      return () => clearTimeout(timeout);
    }
  }, [searchParams]);

  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<{ color?: string; card_type?: string; rarity?: string }>({});
  const [selectedExpansion, setSelectedExpansion] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const { data: expansions, isLoading: loadingExpansions } = useExpansions();
  const { data: expansionCards, isLoading: loadingExpansionCards } = useCardsByExpansion(selectedExpansion);
  const { data: searchResults, isLoading: loadingSearch } = useCardSearch(searchQuery);
  const { data: filteredCards, isLoading: loadingFiltered } = useCardsFiltered(filters);

  const hasActiveSearch = searchQuery.length >= 2;
  const hasActiveFilters = Object.values(filters).some(Boolean);
  const showExpansions = !hasActiveSearch && !hasActiveFilters && !selectedExpansion;

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) setSelectedExpansion(null);
  }, []);

  const handleFilterChange = useCallback(
    (newFilters: { color?: string; card_type?: string; rarity?: string }) => {
      setFilters(newFilters);
      if (Object.values(newFilters).some(Boolean)) setSelectedExpansion(null);
    }, []
  );

  const handleExpansionSelect = useCallback((exp: Expansion) => {
    setSelectedExpansion(exp.code);
    setSearchQuery("");
    setFilters({});
  }, []);

  const handleCardClick = useCallback((card: Card) => { setSelectedCard(card); }, []);
  const handleClosePanel = useCallback(() => { setSelectedCard(null); }, []);

  const handleBack = useCallback(() => { setSelectedExpansion(null); }, []);

  let displayCards: Card[] | undefined;
  let isLoading = false;

  if (hasActiveSearch) { displayCards = searchResults; isLoading = loadingSearch; }
  else if (hasActiveFilters) { displayCards = filteredCards; isLoading = loadingFiltered; }
  else if (selectedExpansion) { displayCards = expansionCards; isLoading = loadingExpansionCards; }

  return (
    <div className="space-y-4">
      {showConfirmed && (
        <div className="flex items-center justify-between rounded-lg bg-[var(--success)]/15 border border-[var(--success)]/30 p-3 text-sm text-[var(--success)]">
          <span>Email confirmed! You are now signed in.</span>
          <button onClick={() => setShowConfirmed(false)} className="ml-2 hover:opacity-70">x</button>
        </div>
      )}
      <h1 className="text-2xl font-bold">Card Database</h1>
      <CardSearchBar onSearch={handleSearch} />
      <CardFilters filters={filters} onChange={handleFilterChange} />
      {selectedExpansion && !hasActiveSearch && !hasActiveFilters && (
        <button onClick={handleBack} className="text-sm text-[var(--accent)] hover:underline">← Back to expansions</button>
      )}
      {isLoading && <p className="py-12 text-center text-[var(--text-secondary)]">Loading...</p>}
      {showExpansions && !loadingExpansions && expansions && (
        <>
          <h2 className="text-sm font-medium text-[var(--text-secondary)]">BROWSE BY EXPANSION</h2>
          <ExpansionGrid expansions={expansions} onSelect={handleExpansionSelect} />
        </>
      )}
      {displayCards && !isLoading && <CardGrid cards={displayCards} onCardClick={handleCardClick} />}
      <CardPanel card={selectedCard} onClose={handleClosePanel} />
    </div>
  );
}
