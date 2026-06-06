"use client";

import { useState, useCallback } from "react";
import { useUpdateQuantity, useCollectionMap } from "@/lib/hooks/use-collection";
import { recordAdjustment, type SessionState } from "@/lib/session-tally";
import type { Card } from "@/lib/types";

export function useEntrySession() {
  const [session, setSession] = useState<SessionState>([]);
  const { mutate } = useUpdateQuantity();
  const owned = useCollectionMap();

  const adjust = useCallback(
    (card: Card, delta: number) => {
      const current = owned.get(card.card_number) ?? 0;
      const next = Math.max(0, current + delta);
      if (next === current) return;
      mutate({ cardNumber: card.card_number, quantity: next });
      setSession((s) =>
        recordAdjustment(
          s,
          { cardNumber: card.card_number, name: card.name, variantName: card.variant_name },
          next - current,
        ),
      );
    },
    [owned, mutate],
  );

  const undo = useCallback(
    (cardNumber: string) => {
      const itemToUndo = session.find((x) => x.cardNumber === cardNumber);
      if (itemToUndo) {
        const current = owned.get(cardNumber) ?? 0;
        mutate({ cardNumber, quantity: Math.max(0, current - itemToUndo.qtyAdded) });
      }
      setSession((s) => s.filter((x) => x.cardNumber !== cardNumber));
    },
    [session, owned, mutate],
  );

  return { session, adjust, undo };
}
