"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { buildSharePayload } from "@/lib/sell-share-payload";
import { generateShareToken } from "@/lib/share-token";
import type { SellShare, SellableCard } from "@/lib/types";

const supabase = createClient();

export function useSellShare() {
  return useQuery<SellShare | null>({
    queryKey: ["sell-share"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from("sell_shares")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return (data as SellShare | null) ?? null;
    },
  });
}

export function usePublishSellShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      title,
      contactNote,
      items,
      existingToken,
    }: {
      title: string;
      contactNote: string;
      items: SellableCard[];
      existingToken: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const token = existingToken ?? generateShareToken();
      const { error } = await supabase.from("sell_shares").upsert({
        user_id: user.id,
        token,
        title: title.trim() || null,
        contact_note: contactNote.trim() || null,
        payload: buildSharePayload(items),
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      return token;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sell-share"] }),
  });
}

export function useDeleteSellShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("sell_shares").delete().eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sell-share"] }),
  });
}
