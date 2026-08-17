"use client";

import { AlertTriangle, Check } from "lucide-react";
import { getGame, type GameId } from "@/lib/games";
import type { DeckCardWithCard } from "@/lib/games/types";

export default function DeckValidation({ game, cards }: { game: GameId; cards: DeckCardWithCard[] }) {
  // An empty deck is "not started", not "invalid" — don't scold on a new deck.
  if (cards.length === 0) return null;

  const { deck } = getGame(game);
  const issues = deck.validate(cards);

  if (issues.length === 0) {
    return (
      <div
        className="flex items-center gap-2 rounded-xl border p-3 text-sm font-medium"
        style={{ background: "var(--green-translucent)", borderColor: "var(--green-border)", color: "var(--green)" }}
      >
        <Check size={16} />
        Deck is legal.
      </div>
    );
  }

  return (
    <div
      className="space-y-1.5 rounded-xl border p-3 text-sm"
      style={{ background: "var(--yellow-translucent)", borderColor: "var(--yellow-border)", color: "var(--yellow)" }}
    >
      {issues.map((issue, i) => (
        <div key={i} className="flex items-start gap-2 font-medium">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{issue.message}</span>
        </div>
      ))}
    </div>
  );
}
