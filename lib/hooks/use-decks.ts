"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Deck, DeckCard } from "@/lib/types";

const supabase = createClient();

export function useDecks() {
  return useQuery<Deck[]>({
    queryKey: ["decks"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase.from("decks").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Deck[];
    },
  });
}

export function useDeck(deckId: string) {
  return useQuery<Deck>({
    queryKey: ["decks", deckId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("decks").select("*").eq("id", deckId).eq("user_id", user.id).single();
      if (error) throw error;
      return data as Deck;
    },
  });
}

export function useDeckCards(deckId: string) {
  return useQuery<DeckCard[]>({
    queryKey: ["deck-cards", deckId],
    queryFn: async () => {
      const { data, error } = await supabase.from("deck_cards").select("*").eq("deck_id", deckId);
      if (error) throw error;
      return data as DeckCard[];
    },
  });
}

export function useAllDeckCards() {
  return useQuery<DeckCard[]>({
    queryKey: ["deck-cards", "all"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data: decks, error: decksError } = await supabase.from("decks").select("id").eq("user_id", user.id);
      if (decksError) throw decksError;
      if (decks.length === 0) return [];
      const deckIds = decks.map((d) => d.id);
      const { data, error } = await supabase.from("deck_cards").select("*").in("deck_id", deckIds);
      if (error) throw error;
      return data as DeckCard[];
    },
  });
}

export function useCreateDeck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("decks").insert({ user_id: user.id, name, description: description || null }).select().single();
      if (error) throw error;
      return data as Deck;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["decks"] }); },
  });
}

export function useDeleteDeck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (deckId: string) => {
      const { error } = await supabase.from("decks").delete().eq("id", deckId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["decks"] }); },
  });
}

export function useUpdateDeckCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ deckId, cardNumber, quantity }: { deckId: string; cardNumber: string; quantity: number }) => {
      if (quantity <= 0) {
        const { error } = await supabase.from("deck_cards").delete().eq("deck_id", deckId).eq("card_number", cardNumber);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("deck_cards").upsert({ deck_id: deckId, card_number: cardNumber, quantity });
        if (error) throw error;
      }
    },
    onSuccess: (_, { deckId }) => {
      queryClient.invalidateQueries({ queryKey: ["deck-cards", deckId] });
      queryClient.invalidateQueries({ queryKey: ["deck-cards", "all"] });
    },
  });
}
