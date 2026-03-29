"use client";

import { useState, useEffect } from "react";
import { useDecks, useAllDeckCards } from "@/lib/hooks/use-decks";
import { useCollection } from "@/lib/hooks/use-collection";
import DeckListCard from "@/components/decks/deck-list-card";
import DeckForm from "@/components/decks/deck-form";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { PlusCircle, SquareStack, LogIn } from "lucide-react";
import type { User } from "@supabase/supabase-js";

export default function DecksPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const supabaseAuth = createClient();
  const [showForm, setShowForm] = useState(false);
  const { data: decks, isLoading } = useDecks();
  const { data: allDeckCards } = useAllDeckCards();
  const { data: collection } = useCollection();

  useEffect(() => {
    supabaseAuth.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthChecked(true);
    });
  }, [supabaseAuth.auth]);

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

  if (authChecked && !user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <SquareStack size={40} className="text-[var(--border)]" />
        <p className="text-[var(--text-muted)]">Sign in to access your decks.</p>
        <Link href="/login" className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--background)] hover:bg-[var(--accent-hover)]">
          <LogIn size={15} />
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Decks</h1>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--background)] transition-colors hover:bg-[var(--accent-hover)]">
            <PlusCircle size={16} />
            New Deck
          </button>
        )}
      </div>
      {showForm && <DeckForm onCreated={() => setShowForm(false)} onCancel={() => setShowForm(false)} />}
      {isLoading && <p className="py-12 text-center text-[var(--text-muted)]">Loading...</p>}
      {!isLoading && decks && decks.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-16">
          <SquareStack size={40} className="mb-3 text-[var(--border)]" />
          <p className="text-sm text-[var(--text-muted)]">No decks yet.</p>
          <p className="text-xs text-[var(--text-dim)]">Create one to start planning!</p>
        </div>
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
