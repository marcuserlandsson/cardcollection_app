import { describe, it, expect } from "vitest";
import { surplusForCard, filterChecklistCards, checklistStats } from "@/lib/collection-entry";
import type { Card } from "@/lib/types";

function makeCard(card_number: string, max_copies = 4): Card {
  return {
    card_number,
    name: card_number,
    expansion: "BT09",
    card_type: "Digimon",
    color: "Red",
    rarity: "C",
    dp: null,
    play_cost: null,
    level: null,
    evolution_cost: null,
    image_url: null,
    pretty_url: null,
    max_copies,
    last_updated: "",
    base_card_number: card_number,
    variant_name: "Regular",
  };
}

describe("surplusForCard", () => {
  it("returns 0 when owned is at or below max copies", () => {
    expect(surplusForCard(4, 4)).toBe(0);
    expect(surplusForCard(2, 4)).toBe(0);
  });
  it("returns the count above max copies", () => {
    expect(surplusForCard(7, 4)).toBe(3);
  });
  it("never goes negative", () => {
    expect(surplusForCard(0, 4)).toBe(0);
  });
});

describe("filterChecklistCards", () => {
  const cards = [makeCard("BT9-001"), makeCard("BT9-002"), makeCard("BT9-003")];
  const owned = new Map<string, number>([
    ["BT9-001", 2],
    ["BT9-002", 6],
  ]);

  it("returns all cards for 'all'", () => {
    expect(filterChecklistCards(cards, owned, "all")).toHaveLength(3);
  });
  it("returns only owned cards for 'owned'", () => {
    expect(filterChecklistCards(cards, owned, "owned").map((c) => c.card_number)).toEqual(["BT9-001", "BT9-002"]);
  });
  it("returns only unowned cards for 'missing'", () => {
    expect(filterChecklistCards(cards, owned, "missing").map((c) => c.card_number)).toEqual(["BT9-003"]);
  });
  it("returns only cards above max copies for 'surplus'", () => {
    expect(filterChecklistCards(cards, owned, "surplus").map((c) => c.card_number)).toEqual(["BT9-002"]);
  });
});

describe("checklistStats", () => {
  it("counts distinct owned, total, and total surplus copies", () => {
    const cards = [makeCard("BT9-001"), makeCard("BT9-002"), makeCard("BT9-003")];
    const owned = new Map<string, number>([
      ["BT9-001", 2],
      ["BT9-002", 6],
    ]);
    expect(checklistStats(cards, owned)).toEqual({ owned: 2, total: 3, surplus: 2 });
  });
});
