"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { CardPrice } from "@/lib/types";

const supabase = createClient();

export function usePrices() {
  return useQuery<CardPrice[]>({
    queryKey: ["prices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("card_prices").select("*");
      if (error) throw error;
      return data as CardPrice[];
    },
  });
}

export function useCardPrice(cardNumber: string | null) {
  return useQuery<CardPrice | null>({
    queryKey: ["prices", cardNumber],
    queryFn: async () => {
      const { data, error } = await supabase.from("card_prices").select("*").eq("card_number", cardNumber!).maybeSingle();
      if (error) throw error;
      return data as CardPrice | null;
    },
    enabled: !!cardNumber,
  });
}
