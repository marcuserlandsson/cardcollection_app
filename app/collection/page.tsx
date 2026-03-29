"use client";

import { useState, useCallback } from "react";
import { useCollection, useCollectionMap } from "@/lib/hooks/use-collection";
import CardSearchBar from "@/components/cards/card-search-bar";
import CardGrid from "@/components/cards/card-grid";
import CollectionSummary from "@/components/collection/collection-summary";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import CardPanel from "@/components/cards/card-panel";
import type { Card } from "@/lib/types";

const supabase = createClient();

export default function CollectionPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const { data: collection, isLoading } = useCollection();
  const quantities = useCollectionMap();

  const cardNumbers = collection?.map((c) => c.card_number) ?? [];
  const { data: ownedCards } = useQuery<Card[]>({
    queryKey: ["collection-cards", cardNumbers],
    queryFn: async () => {
      if (cardNumbers.length === 0) return [];
      const { data, error } = await supabase.from("cards").select("*").in("card_number", cardNumbers).order("card_number");
      if (error) throw error;
      return data as Card[];
    },
    enabled: cardNumbers.length > 0,
  });

  const filteredCards = ownedCards?.filter((card) => {
    if (searchQuery.length < 2) return true;
    const q = searchQuery.toLowerCase();
    return card.name.toLowerCase().includes(q) || card.card_number.toLowerCase().includes(q);
  });

  const handleSearch = useCallback((query: string) => { setSearchQuery(query); }, []);
  const handleCardClick = useCallback((card: Card) => { setSelectedCard(card); }, []);
  const handleClosePanel = useCallback(() => { setSelectedCard(null); }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My Collection</h1>
      <CollectionSummary />
      <CardSearchBar onSearch={handleSearch} />
      {isLoading && <p className="py-12 text-center text-[var(--text-secondary)]">Loading...</p>}
      {!isLoading && cardNumbers.length === 0 && (
        <p className="py-12 text-center text-[var(--text-secondary)]">No cards in your collection yet. Browse the database to add some!</p>
      )}
      {filteredCards && <CardGrid cards={filteredCards} quantities={quantities} onCardClick={handleCardClick} />}
      <CardPanel card={selectedCard} onClose={handleClosePanel} />
    </div>
  );
}
