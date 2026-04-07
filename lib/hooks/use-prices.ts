"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { CardPrice } from "@/lib/types";

const supabase = createClient();

export function usePrices() {
  return useQuery<CardPrice[]>({
    queryKey: ["prices"],
    queryFn: async () => {
      // Supabase defaults to 1000 rows — paginate to get all prices
      const all: CardPrice[] = [];
      const pageSize = 1000;
      let offset = 0;
      while (true) {
        const { data, error } = await supabase
          .from("card_prices")
          .select("*")
          .range(offset, offset + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...(data as CardPrice[]));
        if (data.length < pageSize) break;
        offset += pageSize;
      }
      return all;
    },
  });
}

export function useCardPrice(cardNumber: string | null) {
  return useQuery<CardPrice | null>({
    queryKey: ["prices", cardNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("card_prices")
        .select("*")
        .eq("card_number", cardNumber!)
        .maybeSingle();
      if (error) throw error;
      return data as CardPrice | null;
    },
    enabled: !!cardNumber,
  });
}
