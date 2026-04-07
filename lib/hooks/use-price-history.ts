"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { PriceHistoryEntry } from "@/lib/types";

const supabase = createClient();

export function usePriceHistory(days: number = 7) {
  return useQuery<PriceHistoryEntry[]>({
    queryKey: ["price-history", days],
    queryFn: async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffStr = cutoff.toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from("card_price_history")
        .select("*")
        .gte("recorded_at", cutoffStr);
      if (error) throw error;
      return data as PriceHistoryEntry[];
    },
    staleTime: 1000 * 60 * 30, // 30 minutes — history doesn't change often
  });
}
