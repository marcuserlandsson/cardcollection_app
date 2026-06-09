"use client";

import { useState, useEffect } from "react";
import { useWishlist, useSetWishlist, useRemoveFromWishlist } from "@/lib/hooks/use-wishlist";
import { createClient } from "@/lib/supabase/client";
import { Star, Check, Loader2 } from "lucide-react";

interface WishlistToggleProps {
  cardNumber: string;
  maxCopies: number;
}

export default function WishlistToggle({ cardNumber, maxCopies }: WishlistToggleProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { data: wishlist } = useWishlist();
  const setMutation = useSetWishlist();
  const removeMutation = useRemoveFromWishlist();

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      setIsAuthenticated(!!user);
    });
  }, []);

  const isOnList = wishlist?.some((w) => w.card_number === cardNumber) ?? false;
  const isPending = setMutation.isPending || removeMutation.isPending;

  const handleToggle = () => {
    if (isPending) return;
    if (isOnList) {
      removeMutation.mutate(cardNumber);
    } else {
      setMutation.mutate({ cardNumber, quantity: maxCopies });
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
        <Star size={15} />
      )}
      {isOnList ? "On wishlist" : "Add to wishlist"}
    </button>
  );
}
