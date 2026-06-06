"use client";

import { useState, useCallback } from "react";
import CardSearchBar from "@/components/cards/card-search-bar";
import CardGrid from "@/components/cards/card-grid";
import EntryCardRow from "@/components/collection/entry-card-row";
import { useCardSearch } from "@/lib/hooks/use-cards";
import { useCollectionMap } from "@/lib/hooks/use-collection";
import type { CardView } from "@/components/cards/view-toggle";
import type { Card } from "@/lib/types";

interface EntrySearchProps {
  view: CardView;
  onAdjust: (card: Card, delta: number) => void;
}

export default function EntrySearch({ view, onAdjust }: EntrySearchProps) {
  const [query, setQuery] = useState("");
  const { data: results, isLoading } = useCardSearch(query);
  const owned = useCollectionMap();
  const handleSearch = useCallback((q: string) => setQuery(q), []);

  return (
    <div className="space-y-3">
      <CardSearchBar onSearch={handleSearch} />

      {query.length < 2 && (
        <p className="py-12 text-center text-sm text-[var(--text-muted)]">
          Start typing a card name or number to add cards.
        </p>
      )}

      {query.length >= 2 && isLoading && (
        <p className="py-12 text-center text-sm text-[var(--text-muted)]">Searching…</p>
      )}

      {query.length >= 2 && results && view === "list" && (
        <div className="divide-y divide-[var(--border)]">
          {results.map((card) => (
            <EntryCardRow
              key={card.card_number}
              card={card}
              owned={owned.get(card.card_number) ?? 0}
              onAdjust={onAdjust}
            />
          ))}
          {results.length === 0 && (
            <p className="py-12 text-center text-sm text-[var(--text-muted)]">No cards found.</p>
          )}
        </div>
      )}

      {query.length >= 2 && results && view === "grid" && (
        <CardGrid cards={results} quantities={owned} onCardClick={(card) => onAdjust(card, 1)} />
      )}
    </div>
  );
}
