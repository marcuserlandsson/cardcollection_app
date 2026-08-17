import type { DeckCardWithCard, DeckIssue, DeckRules } from "@/lib/games/types";

type Rules = Omit<DeckRules, "validate">;

/**
 * Validates a deck against a game's declarative rules.
 *
 * Cards whose card_type belongs to a zone are counted against that zone only;
 * everything else counts toward the main deck. A card's own max_copies tightens
 * the game's copyLimit (Cyberpunk Legends carry max_copies = 1).
 */
export function validateDeck(rules: Rules, cards: DeckCardWithCard[]): DeckIssue[] {
  const issues: DeckIssue[] = [];

  const zoneOf = new Map<string, string>();
  for (const zone of rules.zones) {
    for (const type of zone.cardTypes) zoneOf.set(type, zone.key);
  }

  let mainCount = 0;
  const byZone = new Map<string, DeckCardWithCard[]>();
  for (const entry of cards) {
    const zoneKey = zoneOf.get(entry.card.card_type);
    if (zoneKey === undefined) {
      mainCount += entry.quantity;
    } else {
      const bucket = byZone.get(zoneKey) ?? [];
      bucket.push(entry);
      byZone.set(zoneKey, bucket);
    }
  }

  if (mainCount < rules.mainMin) {
    issues.push({
      severity: "error",
      message: `Deck has ${mainCount} cards, minimum is ${rules.mainMin}.`,
    });
  } else if (mainCount > rules.mainMax) {
    issues.push({
      severity: "error",
      message: `Deck has ${mainCount} cards, maximum is ${rules.mainMax}.`,
    });
  }

  for (const zone of rules.zones) {
    const entries = byZone.get(zone.key) ?? [];
    const count = entries.reduce((sum, e) => sum + e.quantity, 0);
    if (count < zone.min || count > zone.max) {
      const bound = zone.min === zone.max ? `exactly ${zone.min}` : `${zone.min}–${zone.max}`;
      issues.push({
        severity: "error",
        message: `${zone.label}: ${count} cards, must be ${bound}.`,
      });
    }
    if (zone.uniqueNames) {
      const names = entries.flatMap((e) => Array(e.quantity).fill(e.card.name) as string[]);
      const duplicated = [...new Set(names.filter((n, i) => names.indexOf(n) !== i))];
      for (const name of duplicated) {
        issues.push({
          severity: "error",
          message: `${zone.label} must have unique names — "${name}" appears more than once.`,
        });
      }
    }
  }

  for (const entry of cards) {
    const limit = Math.min(entry.card.max_copies, rules.copyLimit);
    if (entry.quantity > limit) {
      issues.push({
        severity: "error",
        message: `"${entry.card.name}": ${entry.quantity} copies, maximum is ${limit}.`,
      });
    }
  }

  return issues;
}
