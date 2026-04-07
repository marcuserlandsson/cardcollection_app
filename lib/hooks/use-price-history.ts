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

      // Paginate to handle >1000 rows (4000+ cards × N days)
      const all: PriceHistoryEntry[] = [];
      const pageSize = 1000;
      let offset = 0;
      while (true) {
        const { data, error } = await supabase
          .from("card_price_history")
          .select("*")
          .gte("recorded_at", cutoffStr)
          .range(offset, offset + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...(data as PriceHistoryEntry[]));
        if (data.length < pageSize) break;
        offset += pageSize;
      }
      return all;
    },
    staleTime: 1000 * 60 * 30,
  });
}
