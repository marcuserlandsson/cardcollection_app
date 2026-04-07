"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { SellListEntry } from "@/lib/types";

const supabase = createClient();

export function useSellList() {
  return useQuery<SellListEntry[]>({
    queryKey: ["sell-list"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("sell_list")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data as SellListEntry[];
    },
  });
}

export function useAddToSellList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (cardNumber: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("sell_list").upsert({
        user_id: user.id,
        card_number: cardNumber,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sell-list"] });
    },
  });
}

export function useRemoveFromSellList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (cardNumber: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("sell_list")
        .delete()
        .eq("user_id", user.id)
        .eq("card_number", cardNumber);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sell-list"] });
    },
  });
}
