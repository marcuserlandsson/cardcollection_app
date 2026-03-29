"use client";

import { useState } from "react";
import { useDecks, useAllDeckCards } from "@/lib/hooks/use-decks";
import { useCollection } from "@/lib/hooks/use-collection";
import DeckListCard from "@/components/decks/deck-list-card";
import DeckForm from "@/components/decks/deck-form";

export default function DecksPage() {
  const [showForm, setShowForm] = useState(false);
  const { data: decks, isLoading } = useDecks();
  const { data: allDeckCards } = useAllDeckCards();
  const { data: collection } = useCollection();

  function getDeckStats(deckId: string) {
    const cards = allDeckCards?.filter((dc) => dc.deck_id === deckId) ?? [];
    const cardCount = cards.reduce((sum, dc) => sum + dc.quantity, 0);
    const collectionMap = new Map(collection?.map((c) => [c.card_number, c.quantity]) ?? []);
    let ownedCount = 0;
    let totalNeeded = 0;
    for (const dc of cards) {
      totalNeeded += dc.quantity;
      ownedCount += Math.min(collectionMap.get(dc.card_number) ?? 0, dc.quantity);
    }
    const completionPercent = totalNeeded > 0 ? Math.round((ownedCount / totalNeeded) * 100) : 100;
    return { cardCount, completionPercent };
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Decks</h1>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)]">New Deck</button>
        )}
      </div>
      {showForm && <DeckForm onCreated={() => setShowForm(false)} onCancel={() => setShowForm(false)} />}
      {isLoading && <p className="py-12 text-center text-[var(--text-secondary)]">Loading...</p>}
      {!isLoading && decks && decks.length === 0 && !showForm && (
        <p className="py-12 text-center text-[var(--text-secondary)]">No decks yet. Create one to start planning!</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {decks?.map((deck) => {
          const { cardCount, completionPercent } = getDeckStats(deck.id);
          return <DeckListCard key={deck.id} deck={deck} cardCount={cardCount} completionPercent={completionPercent} />;
        })}
      </div>
    </div>
  );
}
