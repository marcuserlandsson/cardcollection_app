"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useGame } from "@/contexts/game-context";
import type { CollectionEntry } from "@/lib/types";

const supabase = createClient();

export function useCollection() {
  const { gameId } = useGame();
  return useQuery<CollectionEntry[]>({
    queryKey: ["collection", gameId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("collection")
        .select("*, cards!inner(game)")
        .eq("user_id", user.id)
        .eq("cards.game", gameId);
      if (error) throw error;
      // Drop the joined column so the row shape stays CollectionEntry.
      return (data ?? []).map((row) => ({
        user_id: row.user_id,
        card_number: row.card_number,
        quantity: row.quantity,
        updated_at: row.updated_at,
      })) as CollectionEntry[];
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
  const { gameId } = useGame();
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
    // Optimistic update so useCollectionMap reflects the change immediately,
    // keeping rapid +/- entry and the session tray consistent with the DB
    // during the refetch window.
    onMutate: async ({ cardNumber, quantity }) => {
      await queryClient.cancelQueries({ queryKey: ["collection", gameId] });
      const previous = queryClient.getQueryData<CollectionEntry[]>(["collection", gameId]);
      queryClient.setQueryData<CollectionEntry[]>(["collection", gameId], (old) => {
        const entries = old ?? [];
        const rest = entries.filter((e) => e.card_number !== cardNumber);
        if (quantity <= 0) return rest;
        const existing = entries.find((e) => e.card_number === cardNumber);
        return [
          ...rest,
          {
            user_id: existing?.user_id ?? "",
            card_number: cardNumber,
            quantity,
            updated_at: new Date().toISOString(),
          },
        ];
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["collection", gameId], context.previous);
      }
    },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: ["collection", gameId] }); },
  });
}
