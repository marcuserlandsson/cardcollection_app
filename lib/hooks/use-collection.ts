"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { CollectionEntry } from "@/lib/types";

const supabase = createClient();

export function useCollection() {
  return useQuery<CollectionEntry[]>({
    queryKey: ["collection"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase.from("collection").select("*").eq("user_id", user.id);
      if (error) throw error;
      return data as CollectionEntry[];
    },
  });
}

export function useCollectionQuantity(cardNumber: string) {
  const { data: collection } = useCollection();
  return collection?.find((c) => c.card_number === cardNumber)?.quantity ?? 0;
}

export function useCollectionMap() {
  const { data: collection } = useCollection();
  const map = new Map<string, number>();
  if (collection) {
    for (const entry of collection) {
      map.set(entry.card_number, entry.quantity);
    }
  }
  return map;
}

export function useUpdateQuantity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ cardNumber, quantity }: { cardNumber: string; quantity: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      if (quantity <= 0) {
        const { error } = await supabase.from("collection").delete().eq("user_id", user.id).eq("card_number", cardNumber);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("collection").upsert({
          user_id: user.id, card_number: cardNumber, quantity, updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["collection"] }); },
  });
}
