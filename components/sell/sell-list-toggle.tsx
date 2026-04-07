"use client";

import { useState, useEffect } from "react";
import { useSellList, useAddToSellList, useRemoveFromSellList } from "@/lib/hooks/use-sell-list";
import { createClient } from "@/lib/supabase/client";
import { ClipboardList, Check, Loader2 } from "lucide-react";

interface SellListToggleProps {
  cardNumber: string;
}

export default function SellListToggle({ cardNumber }: SellListToggleProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { data: sellList } = useSellList();
  const addMutation = useAddToSellList();
  const removeMutation = useRemoveFromSellList();

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      setIsAuthenticated(!!user);
    });
  }, []);

  const isOnList = sellList?.some((s) => s.card_number === cardNumber) ?? false;
  const isPending = addMutation.isPending || removeMutation.isPending;

  const handleToggle = () => {
    if (isPending) return;
    if (isOnList) {
      removeMutation.mutate(cardNumber);
    } else {
      addMutation.mutate(cardNumber);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`mt-3 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
        isOnList
          ? "bg-[var(--purple-translucent)] text-[var(--purple)] border border-[var(--purple-border)]"
          : "bg-[var(--elevated)] text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--surface)]"
      }`}
    >
      {isPending ? (
        <Loader2 size={15} className="animate-spin" />
      ) : isOnList ? (
        <Check size={15} />
      ) : (
        <ClipboardList size={15} />
      )}
      {isOnList ? "On sell list" : "Add to sell list"}
    </button>
  );
}
