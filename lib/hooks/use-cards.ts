"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Card, Expansion } from "@/lib/types";

const supabase = createClient();

export function useExpansions() {
  return useQuery<Expansion[]>({
    queryKey: ["expansions"],
    queryFn: async () => {
      // Count cards per expansion using the join table
      const pageSize = 1000;
      const allRows: { expansion: string }[] = [];
      let from = 0;

      while (true) {
        const { data, error } = await supabase
          .from("card_expansions")
          .select("expansion")
          .range(from, from + pageSize - 1);

        if (error) throw error;
        allRows.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }

      const counts = new Map<string, number>();
      for (const row of allRows) {
        counts.set(row.expansion, (counts.get(row.expansion) || 0) + 1);
      }

      return Array.from(counts.entries())
        .map(([code, card_count]) => ({
          code,
          name: code,
          card_count,
        }))
        .sort((a, b) => b.code.localeCompare(a.code));
    },
  });
}

export function useCardsByExpansion(expansion: string | null) {
  return useQuery<Card[]>({
    queryKey: ["cards", "expansion", expansion],
    queryFn: async () => {
      // Get card numbers from the join table, then fetch full card data
      const pageSize = 1000;
      const cardNumbers: string[] = [];
      let from = 0;

      while (true) {
        const { data, error } = await supabase
          .from("card_expansions")
          .select("card_number")
          .eq("expansion", expansion!)
          .range(from, from + pageSize - 1);

        if (error) throw error;
        cardNumbers.push(...data.map((r) => r.card_number));
        if (data.length < pageSize) break;
        from += pageSize;
      }

      if (cardNumbers.length === 0) return [];

      // Fetch full card data in batches (Supabase .in() has a limit)
      const allCards: Card[] = [];
      const inBatchSize = 200;
      for (let i = 0; i < cardNumbers.length; i += inBatchSize) {
        const batch = cardNumbers.slice(i, i + inBatchSize);
        const { data, error } = await supabase
          .from("cards")
          .select("*")
          .in("card_number", batch)
          .order("card_number");

        if (error) throw error;
        allCards.push(...(data as Card[]));
      }

      return allCards.sort((a, b) => a.card_number.localeCompare(b.card_number));
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

export function useExpansionMetadata() {
  return useQuery<Record<string, string>>({
    queryKey: ["expansion-metadata"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expansion_metadata")
        .select("expansion, set_image_url");

      if (error) throw error;

      const map: Record<string, string> = {};
      for (const row of data) {
        if (row.set_image_url) {
          map[row.expansion] = row.set_image_url;
        }
      }
      return map;
    },
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

export function useCardSiblings(baseCardNumber: string | null) {
  return useQuery<Card[]>({
    queryKey: ["card-siblings", baseCardNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("base_card_number", baseCardNumber!)
        .order("card_number");
      if (error) throw error;
      return data as Card[];
    },
    enabled: !!baseCardNumber,
  });
}

export function useCardExpansions(baseCardNumber: string | null) {
  return useQuery<{ card_number: string; expansion: string }[]>({
    queryKey: ["card-expansions", baseCardNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("card_expansions")
        .select("card_number, expansion")
        .eq("card_number", baseCardNumber!);
      if (error) throw error;
      return data as { card_number: string; expansion: string }[];
    },
    enabled: !!baseCardNumber,
  });
}
