"use client";

import { useState } from "react";
import { useCreateDeck, useUpdateDeckCard } from "@/lib/hooks/use-decks";
import { parseCardList } from "@/lib/import-parser";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Plus, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

const supabase = createClient();

interface DeckFormProps {
  onCreated: () => void;
  onCancel: () => void;
}

export default function DeckForm({ onCreated, onCancel }: DeckFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cardList, setCardList] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { mutateAsync: createDeck, isPending } = useCreateDeck();
  const updateDeckCard = useUpdateDeckCard();

  const { data: knownCards } = useQuery<Set<string>>({
    queryKey: ["all-card-numbers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cards").select("card_number");
      if (error) throw error;
      return new Set((data as { card_number: string }[]).map((c) => c.card_number));
    },
    staleTime: 5 * 60 * 1000,
    enabled: showImport,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const deck = await createDeck({ name: name.trim(), description: description.trim() || undefined });

    if (cardList.trim()) {
      setIsImporting(true);
      const result = parseCardList(cardList);
      const validCards = knownCards
        ? result.parsed.filter((c) => knownCards.has(c.cardNumber))
        : result.parsed;

      for (const entry of validCards) {
        await updateDeckCard.mutateAsync({
          deckId: deck.id,
          cardNumber: entry.cardNumber,
          quantity: entry.quantity,
        });
      }
      setIsImporting(false);
    }

    onCreated();
  }

  const busy = isPending || isImporting;

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Deck name" className="w-full rounded-xl border border-[var(--border-light)] bg-[var(--elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" autoFocus />
      <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="w-full rounded-xl border border-[var(--border-light)] bg-[var(--elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" />
      <button
        type="button"
        onClick={() => setShowImport(!showImport)}
        className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
      >
        {showImport ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        Import card list
      </button>
      {showImport && (
        <textarea
          value={cardList}
          onChange={(e) => setCardList(e.target.value)}
          placeholder={"BT1-001 3\nBT1-002 x2\nBT3-015\n# One card per line"}
          className="h-36 w-full resize-none rounded-xl border border-[var(--border-light)] bg-[var(--elevated)] p-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-dim)] focus:border-[var(--accent-border)] focus:outline-none"
        />
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={!name.trim() || busy} className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--background)] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          {isImporting ? "Importing..." : isPending ? "Creating..." : cardList.trim() ? "Create & Import" : "Create Deck"}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className="rounded-lg border border-[var(--border-light)] bg-[var(--elevated)] px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-border)] disabled:opacity-50">Cancel</button>
      </div>
    </form>
  );
}
