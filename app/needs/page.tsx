"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useCollection } from "@/lib/hooks/use-collection";
import { useDecks, useAllDeckCards } from "@/lib/hooks/use-decks";
import { usePrices } from "@/lib/hooks/use-prices";
import { useWishlist } from "@/lib/hooks/use-wishlist";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { buildDeckNeedSections, buildWishlistNeeds, buildBuyList } from "@/lib/need-utils";
import { generateBuyCsv, downloadCsv } from "@/lib/export-csv";
import DeckNeedSectionView from "@/components/needs/deck-need-section";
import WishlistSection from "@/components/needs/wishlist-section";
import CopyBuyListButton from "@/components/needs/copy-buy-list-button";
import CardPanel from "@/components/cards/card-panel";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import { ShoppingCart, LogIn, Download } from "lucide-react";
import type { Card } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

const supabase = createClient();

export default function NeedsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const supabaseAuth = createClient();

  const { data: collection } = useCollection();
  const { data: decks } = useDecks();
  const { data: allDeckCards } = useAllDeckCards();
  const { data: prices } = usePrices();
  const { data: wishlist } = useWishlist();

  useEffect(() => {
    supabaseAuth.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthChecked(true);
    });
  }, [supabaseAuth.auth]);

  // Fetch card data for every card referenced by deck_cards, wishlist, or collection.
  const referencedCardNumbers = useMemo(() => {
    const deckNums = allDeckCards?.map((d) => d.card_number) ?? [];
    const wishNums = wishlist?.map((w) => w.card_number) ?? [];
    const ownedNums = collection?.map((c) => c.card_number) ?? [];
    return [...new Set([...deckNums, ...wishNums, ...ownedNums])];
  }, [allDeckCards, wishlist, collection]);

  const { data: cards } = useQuery<Card[]>({
    queryKey: ["need-cards", referencedCardNumbers],
    queryFn: async () => {
      if (referencedCardNumbers.length === 0) return [];
      // Include sibling variants so base-level owned + representative selection are correct.
      const bases = await supabase.from("cards").select("base_card_number").in("card_number", referencedCardNumbers);
      if (bases.error) throw bases.error;
      const baseNumbers = [...new Set((bases.data ?? []).map((b) => b.base_card_number as string))];
      const lookup = baseNumbers.length > 0 ? baseNumbers : referencedCardNumbers;
      const { data, error } = await supabase.from("cards").select("*").in("base_card_number", lookup);
      if (error) throw error;
      return data as Card[];
    },
    enabled: referencedCardNumbers.length > 0,
  });

  const sections = useMemo(() => {
    if (!cards || !collection || !decks || !allDeckCards || !prices) return [];
    return buildDeckNeedSections(cards, collection, decks, allDeckCards, prices);
  }, [cards, collection, decks, allDeckCards, prices]);

  const wishlistNeeds = useMemo(() => {
    if (!cards || !collection || !wishlist || !prices) return [];
    return buildWishlistNeeds(cards, collection, wishlist, prices);
  }, [cards, collection, wishlist, prices]);

  const buyList = useMemo(() => buildBuyList(sections, wishlistNeeds), [sections, wishlistNeeds]);

  // Summary + actions show only when there is something to buy.
  const hasNeeds = buyList.items.length > 0;
  // Empty state shows only when the user has no decks and no wishlist at all.
  const isEmpty = sections.length === 0 && wishlistNeeds.length === 0;

  const handleCardClick = useCallback((card: Card) => setSelectedCard(card), []);

  const handleExport = useCallback(() => {
    if (buyList.items.length === 0) return;
    const csv = generateBuyCsv(buyList.items);
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(csv, `cardboard-need-export-${date}.csv`);
  }, [buyList]);

  if (authChecked && !user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <ShoppingCart size={40} className="text-[var(--border)]" />
        <p className="text-[var(--text-muted)]">Sign in to see what your decks need.</p>
        <Link href="/login" className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--background)] hover:bg-[var(--accent-hover)]">
          <LogIn size={15} />
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Need List</h1>

      {hasNeeds && (
        <div className="flex items-start justify-between">
          <div className="flex gap-6 px-1">
            <div>
              <div className="text-2xl font-bold text-[var(--yellow)]">{buyList.cardCount}</div>
              <div className="text-xs text-[var(--text-muted)]">Cards needed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[var(--green)]">{buyList.totalCost > 0 ? formatPrice(buyList.totalCost) : "—"}</div>
              <div className="text-xs text-[var(--text-muted)]">Est. cost</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CopyBuyListButton items={buyList.items} />
            <button
              onClick={handleExport}
              disabled={buyList.items.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--elevated)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download size={15} />
              Export CSV
            </button>
          </div>
        </div>
      )}

      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-16">
          <ShoppingCart size={40} className="mb-3 text-[var(--border)]" />
          <p className="text-sm text-[var(--text-muted)]">Nothing needed right now.</p>
          <p className="text-xs text-[var(--text-dim)]">Build a deck or add cards to your wishlist to see what you need.</p>
        </div>
      )}

      {sections.map((section) => (
        <DeckNeedSectionView key={section.deck.id} section={section} onCardClick={handleCardClick} />
      ))}

      <WishlistSection rows={wishlistNeeds} entries={wishlist ?? []} onCardClick={handleCardClick} />

      <CardPanel card={selectedCard} onClose={() => setSelectedCard(null)} onCardSelect={setSelectedCard} />
    </div>
  );
}
