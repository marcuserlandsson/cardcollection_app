"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Card, Expansion } from "@/lib/types";

const supabase = createClient();

export function useExpansions() {
  return useQuery<Expansion[]>({
    queryKey: ["expansions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cards")
        .select("expansion")
        .order("expansion", { ascending: false });

      if (error) throw error;

      const counts = new Map<string, number>();
      for (const row of data) {
        counts.set(row.expansion, (counts.get(row.expansion) || 0) + 1);
      }

      return Array.from(counts.entries()).map(([code, card_count]) => ({
        code,
        name: code,
        card_count,
      }));
    },
  });
}

export function useCardsByExpansion(expansion: string | null) {
  return useQuery<Card[]>({
    queryKey: ["cards", "expansion", expansion],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("expansion", expansion!)
        .order("card_number");

      if (error) throw error;
      return data as Card[];
    },
    enabled: !!expansion,
  });
}

export function useCardSearch(query: string) {
  return useQuery<Card[]>({
    queryKey: ["cards", "search", query],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .or(`name.ilike.%${query}%,card_number.ilike.%${query}%`)
        .order("card_number")
        .limit(100);

      if (error) throw error;
      return data as Card[];
    },
    enabled: query.length >= 2,
  });
}

export function useCardsFiltered(filters: {
  color?: string;
  card_type?: string;
  rarity?: string;
  expansion?: string;
}) {
  return useQuery<Card[]>({
    queryKey: ["cards", "filtered", filters],
    queryFn: async () => {
      let q = supabase.from("cards").select("*");

      if (filters.color) q = q.eq("color", filters.color);
      if (filters.card_type) q = q.eq("card_type", filters.card_type);
      if (filters.rarity) q = q.eq("rarity", filters.rarity);
      if (filters.expansion) q = q.eq("expansion", filters.expansion);

      const { data, error } = await q.order("card_number").limit(200);

      if (error) throw error;
      return data as Card[];
    },
    enabled: Object.values(filters).some(Boolean),
  });
}

export function useCard(cardNumber: string | null) {
  return useQuery<Card>({
    queryKey: ["cards", cardNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("card_number", cardNumber!)
        .single();

      if (error) throw error;
      return data as Card;
    },
    enabled: !!cardNumber,
  });
}
