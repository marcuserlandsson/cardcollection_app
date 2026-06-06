import type { Card } from "@/lib/types";

export type ChecklistFilter = "all" | "missing" | "owned" | "surplus";

/** Copies beyond a single playset. Deck-independent (see plan note). */
export function surplusForCard(owned: number, maxCopies: number): number {
  return Math.max(0, owned - maxCopies);
}

export function filterChecklistCards(
  cards: Card[],
  ownedMap: Map<string, number>,
  filter: ChecklistFilter,
): Card[] {
  return cards.filter((card) => {
    const owned = ownedMap.get(card.card_number) ?? 0;
    switch (filter) {
      case "all":
        return true;
      case "owned":
        return owned > 0;
      case "missing":
        return owned === 0;
      case "surplus":
        return surplusForCard(owned, card.max_copies) > 0;
    }
  });
}

export interface ChecklistStats {
  owned: number; // distinct cards owned (qty > 0)
  total: number; // total cards in the set
  surplus: number; // total surplus copies across the set
}

export function checklistStats(cards: Card[], ownedMap: Map<string, number>): ChecklistStats {
  let owned = 0;
  let surplus = 0;
  for (const card of cards) {
    const qty = ownedMap.get(card.card_number) ?? 0;
    if (qty > 0) owned++;
    surplus += surplusForCard(qty, card.max_copies);
  }
  return { owned, total: cards.length, surplus };
}
