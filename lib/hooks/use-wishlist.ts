"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { WishlistEntry } from "@/lib/types";

const supabase = createClient();

export function useWishlist() {
  return useQuery<WishlistEntry[]>({
    queryKey: ["wishlist"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("wishlist")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data as WishlistEntry[];
    },
  });
}

export function useSetWishlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ cardNumber, quantity }: { cardNumber: string; quantity: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("wishlist").upsert(
        {
          user_id: user.id,
          card_number: cardNumber,
          quantity,
        },
        { onConflict: "user_id,card_number" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
  });
}

export function useRemoveFromWishlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (cardNumber: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("wishlist")
        .delete()
        .eq("user_id", user.id)
        .eq("card_number", cardNumber);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
  });
}
