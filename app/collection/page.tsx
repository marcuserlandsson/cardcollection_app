"use client";

import { useState, useCallback, useEffect } from "react";
import { useCollection, useCollectionMap } from "@/lib/hooks/use-collection";
import CardSearchBar from "@/components/cards/card-search-bar";
import CardGrid from "@/components/cards/card-grid";
import CollectionSummary from "@/components/collection/collection-summary";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import CardPanel from "@/components/cards/card-panel";
import Link from "next/link";
import { Layers, LogIn } from "lucide-react";
import type { Card } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

const supabase = createClient();

export default function CollectionPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const supabaseAuth = createClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const { data: collection, isLoading } = useCollection();
  const quantities = useCollectionMap();

  useEffect(() => {
    supabaseAuth.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthChecked(true);
    });
  }, [supabaseAuth.auth]);

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

  if (authChecked && !user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Layers size={40} className="text-[var(--border)]" />
        <p className="text-[var(--text-muted)]">Sign in to access your collection.</p>
        <Link href="/login" className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--background)] hover:bg-[var(--accent-hover)]">
          <LogIn size={15} />
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My Collection</h1>
      <CollectionSummary />
      <CardSearchBar onSearch={handleSearch} />
      {isLoading && <p className="py-12 text-center text-[var(--text-muted)]">Loading...</p>}
      {!isLoading && cardNumbers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <Layers size={40} className="mb-3 text-[var(--border)]" />
          <p className="text-sm text-[var(--text-muted)]">No cards in your collection yet.</p>
          <p className="text-xs text-[var(--text-dim)]">Browse the database to add some!</p>
        </div>
      )}
      {filteredCards && <CardGrid cards={filteredCards} quantities={quantities} onCardClick={handleCardClick} />}
      <CardPanel card={selectedCard} onClose={handleClosePanel} />
    </div>
  );
}
