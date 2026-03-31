"use client";

import { use, useState, useCallback } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useDeck, useDeckCards, useDeleteDeck } from "@/lib/hooks/use-decks";
import { useCollectionMap } from "@/lib/hooks/use-collection";
import { createClient } from "@/lib/supabase/client";
import DeckCardRow from "@/components/decks/deck-card-row";
import CardSearchBar from "@/components/cards/card-search-bar";
import CardGrid from "@/components/cards/card-grid";
import CardPanel from "@/components/cards/card-panel";
import ImportModal from "@/components/collection/import-modal";
import { ArrowLeft, Plus, Trash2, AlertTriangle, Check, SquareStack, Upload } from "lucide-react";
import type { Card } from "@/lib/types";
import { useRouter } from "next/navigation";

const supabase = createClient();

export default function DeckDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: deckId } = use(params);
  const router = useRouter();
  const [addingCards, setAddingCards] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const { data: deck } = useDeck(deckId);
  const { data: deckCards } = useDeckCards(deckId);
  const quantities = useCollectionMap();
  const { mutate: deleteDeck } = useDeleteDeck();

  const cardNumbers = deckCards?.map((dc) => dc.card_number) ?? [];
  const { data: cardsInDeck } = useQuery<Card[]>({
    queryKey: ["deck-detail-cards", cardNumbers],
    queryFn: async () => {
      if (cardNumbers.length === 0) return [];
      const { data, error } = await supabase.from("cards").select("*").in("card_number", cardNumbers).order("card_number");
      if (error) throw error;
      return data as Card[];
    },
    enabled: cardNumbers.length > 0,
  });

  const { data: searchResults } = useQuery<Card[]>({
    queryKey: ["deck-add-search", searchQuery],
    queryFn: async () => {
      const { data, error } = await supabase.from("cards").select("*").or(`name.ilike.%${searchQuery}%,card_number.ilike.%${searchQuery}%`).order("card_number").limit(50);
      if (error) throw error;
      return data as Card[];
    },
    enabled: addingCards && searchQuery.length >= 2,
  });

  const deckCardMap = new Map(deckCards?.map((dc) => [dc.card_number, dc.quantity]) ?? []);

  const missingCount = cardsInDeck?.reduce((count, card) => {
    const needed = deckCardMap.get(card.card_number) ?? 0;
    const owned = quantities.get(card.card_number) ?? 0;
    return count + Math.max(0, needed - owned);
  }, 0) ?? 0;

  const handleSearch = useCallback((query: string) => { setSearchQuery(query); }, []);
  const handleCardClick = useCallback((card: Card) => { setSelectedCard(card); }, []);
  const handleDelete = useCallback(() => {
    if (confirm("Delete this deck?")) {
      deleteDeck(deckId, { onSuccess: () => router.push("/decks") });
    }
  }, [deleteDeck, deckId, router]);

  if (!deck) return <p className="py-12 text-center text-[var(--text-muted)]">Loading...</p>;

  return (
    <div className="space-y-4">
      <Link href="/decks" className="flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] hover:underline">
        <ArrowLeft size={14} />
        Decks
      </Link>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{deck.name}</h1>
          {deck.description && <p className="text-sm text-[var(--text-secondary)]">{deck.description}</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setImportOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-[var(--elevated)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">
            <Upload size={14} />
            Import
          </button>
          <button onClick={() => setAddingCards(!addingCards)} className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-[var(--background)] hover:bg-[var(--accent-hover)]">
            {addingCards ? <><Check size={14} /> Done</> : <><Plus size={14} /> Add Cards</>}
          </button>
          <button onClick={handleDelete} className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors" style={{ background: "var(--red-translucent)", borderColor: "var(--red-border)", color: "var(--danger)" }}>
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>
      {missingCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl border p-3 text-sm font-medium" style={{ background: "var(--red-translucent)", borderColor: "var(--red-border)", color: "var(--danger)" }}>
          <AlertTriangle size={16} />
          Missing {missingCount} card{missingCount !== 1 ? "s" : ""} to complete this deck.
        </div>
      )}
      {addingCards && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Search Cards to Add</h2>
          <CardSearchBar onSearch={handleSearch} />
          {searchResults && <CardGrid cards={searchResults} quantities={quantities} onCardClick={handleCardClick} />}
        </div>
      )}
      <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        Deck Cards ({cardNumbers.length} unique, {deckCards?.reduce((s, dc) => s + dc.quantity, 0) ?? 0} total)
      </h2>
      {cardsInDeck && cardsInDeck.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <SquareStack size={40} className="mb-3 text-[var(--border)]" />
          <p className="text-sm text-[var(--text-muted)]">No cards in this deck yet.</p>
          <p className="text-xs text-[var(--text-dim)]">Click &quot;Add Cards&quot; to search and add.</p>
        </div>
      )}
      <div className="space-y-2">
        {cardsInDeck?.map((card) => (
          <DeckCardRow key={card.card_number} card={card} deckId={deckId} quantityInDeck={deckCardMap.get(card.card_number) ?? 0} quantityOwned={quantities.get(card.card_number) ?? 0} />
        ))}
      </div>
      <CardPanel card={selectedCard} onClose={() => setSelectedCard(null)} onCardSelect={setSelectedCard} />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} deckId={deckId} />
    </div>
  );
}
