import { describe, it, expect } from "vitest";
import {
  totalOwnedByBase,
  pickRepresentativeVariant,
  unitPrice,
  buildDeckNeedSections,
  buildWishlistNeeds,
  buildBuyList,
} from "@/lib/need-utils";
import type {
  Card,
  CardPrice,
  CollectionEntry,
  Deck,
  DeckCard,
  WishlistEntry,
} from "@/lib/types";

function makeCard(
  card_number: string,
  name: string,
  variant_name = "Regular",
  base_card_number = card_number,
): Card {
  return {
    card_number,
    name,
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
    max_copies: 4,
    last_updated: "",
    base_card_number,
    variant_name,
  };
}

function makePrice(card_number: string, price_low: number | null, price_trend: number | null = null): CardPrice {
  return { card_number, price_avg: null, price_low, price_trend, fetched_at: "" };
}

function makeDeck(id: string, updated_at: string): Deck {
  return { id, user_id: "u", name: `Deck ${id}`, description: null, created_at: "", updated_at };
}

function coll(card_number: string, quantity: number): CollectionEntry {
  return { user_id: "u", card_number, quantity, updated_at: "" };
}

function dcard(deck_id: string, card_number: string, quantity: number): DeckCard {
  return { deck_id, card_number, quantity };
}

function wish(card_number: string, quantity: number): WishlistEntry {
  return { user_id: "u", card_number, quantity, added_at: "" };
}

describe("unitPrice", () => {
  it("prefers price_low, falls back to price_trend, else null", () => {
    expect(unitPrice(makePrice("a", 2, 5))).toBe(2);
    expect(unitPrice(makePrice("a", null, 5))).toBe(5);
    expect(unitPrice(makePrice("a", null, null))).toBeNull();
    expect(unitPrice(null)).toBeNull();
  });
});

describe("totalOwnedByBase", () => {
  it("sums owned quantities across a base's variants", () => {
    const cards = [
      makeCard("BT9-009", "WarGreymon", "Regular", "BT9-009"),
      makeCard("BT9-009_P1", "WarGreymon", "Alt Art", "BT9-009"),
    ];
    const collection = [coll("BT9-009", 2), coll("BT9-009_P1", 1)];
    const map = totalOwnedByBase(cards, collection);
    expect(map.get("BT9-009")).toBe(3);
  });

  it("ignores collection entries whose card is not loaded", () => {
    const map = totalOwnedByBase([makeCard("A", "A")], [coll("A", 1), coll("MISSING", 5)]);
    expect(map.get("A")).toBe(1);
    expect(map.has("MISSING")).toBe(false);
  });
});

describe("pickRepresentativeVariant", () => {
  it("prefers the Regular variant", () => {
    const variants = [makeCard("X_P1", "X", "Alt Art", "X"), makeCard("X", "X", "Regular", "X")];
    expect(pickRepresentativeVariant(variants).card_number).toBe("X");
  });

  it("falls back to lowest card_number when no Regular exists", () => {
    const variants = [makeCard("X_P2", "X", "Alt B", "X"), makeCard("X_P1", "X", "Alt A", "X")];
    expect(pickRepresentativeVariant(variants).card_number).toBe("X_P1");
  });

  it("throws when given an empty array", () => {
    expect(() => pickRepresentativeVariant([])).toThrow();
  });
});

describe("buildDeckNeedSections", () => {
  const cards = [
    makeCard("A", "Agumon"),
    makeCard("B", "Biyomon"),
  ];
  const prices = [makePrice("A", 1.5), makePrice("B", 10)];

  it("computes deckNeed = max(0, wants - owned) and drops satisfied rows", () => {
    const decks = [makeDeck("d1", "2026-01-01")];
    const deckCards = [dcard("d1", "A", 4), dcard("d1", "B", 2)];
    const collection = [coll("A", 1), coll("B", 2)]; // A short by 3, B satisfied
    const [section] = buildDeckNeedSections(cards, collection, decks, deckCards, prices);
    expect(section.rows.map((r) => [r.card.card_number, r.need, r.est_cost])).toEqual([
      ["A", 3, 4.5],
    ]);
  });

  it("computes have/want completion for the deck", () => {
    const decks = [makeDeck("d1", "2026-01-01")];
    const deckCards = [dcard("d1", "A", 4), dcard("d1", "B", 2)];
    const collection = [coll("A", 1), coll("B", 5)]; // have = min(1,4)+min(5,2)=1+2=3, want=6
    const [section] = buildDeckNeedSections(cards, collection, decks, deckCards, prices);
    expect(section.have).toBe(3);
    expect(section.want).toBe(6);
  });

  it("orders sections by deck updated_at descending", () => {
    const decks = [makeDeck("old", "2026-01-01"), makeDeck("new", "2026-02-01")];
    const deckCards = [dcard("old", "A", 4), dcard("new", "A", 4)];
    const sections = buildDeckNeedSections(cards, [], decks, deckCards, prices);
    expect(sections.map((s) => s.deck.id)).toEqual(["new", "old"]);
  });

  it("sorts rows within a section by est_cost descending", () => {
    const decks = [makeDeck("d1", "2026-01-01")];
    const deckCards = [dcard("d1", "A", 1), dcard("d1", "B", 1)]; // A=1.5, B=10
    const sections = buildDeckNeedSections(cards, [], decks, deckCards, prices);
    expect(sections[0].rows.map((r) => r.card.card_number)).toEqual(["B", "A"]);
  });

  it("sorts null-cost rows below priced rows", () => {
    const noPrice = makeCard("C", "Patamon");
    const decks = [makeDeck("d1", "2026-01-01")];
    const deckCards = [dcard("d1", "A", 1), dcard("d1", "B", 1), dcard("d1", "C", 1)];
    const sections = buildDeckNeedSections([...cards, noPrice], [], decks, deckCards, prices);
    expect(sections[0].rows.map((r) => r.card.card_number)).toEqual(["B", "A", "C"]);
  });

  it("retains a fully-satisfied deck with empty rows for the completion display", () => {
    const decks = [makeDeck("d1", "2026-01-01")];
    const deckCards = [dcard("d1", "A", 2)];
    const collection = [coll("A", 4)]; // owns more than needed
    const [section] = buildDeckNeedSections(cards, collection, decks, deckCards, prices);
    expect(section.rows).toHaveLength(0);
    expect(section.have).toBe(2);
    expect(section.want).toBe(2);
  });
});

describe("buildWishlistNeeds", () => {
  const cards = [makeCard("A", "Agumon"), makeCard("G_P1", "Greymon", "Alt Art", "G"), makeCard("G", "Greymon", "Regular", "G")];
  const prices = [makePrice("A", 1.5), makePrice("G_P1", 56)];

  it("computes target minus base-level owned and drops cleared rows", () => {
    const collection = [coll("A", 4)]; // A target 4 satisfied
    const wishlist = [wish("A", 4), wish("G_P1", 2)];
    const rows = buildWishlistNeeds(cards, collection, wishlist, prices);
    expect(rows.map((r) => [r.card.card_number, r.need])).toEqual([["G_P1", 2]]);
  });

  it("reduces wishlist need by copies owned of any variant of the base", () => {
    const collection = [coll("G", 1)]; // owning the Regular reduces the alt-art wishlist need
    const wishlist = [wish("G_P1", 3)];
    const rows = buildWishlistNeeds(cards, collection, wishlist, prices);
    expect(rows[0].need).toBe(2);
    expect(rows[0].est_cost).toBe(112); // 2 * 56
  });
});

describe("buildBuyList", () => {
  const cards = [makeCard("A", "Agumon")];

  it("deduplicates a shared card by taking the MAX need across decks and wishlist", () => {
    const decks = [makeDeck("d1", "2026-02-01"), makeDeck("d2", "2026-01-01")];
    const deckCards = [dcard("d1", "A", 2), dcard("d2", "A", 4)];
    const prices = [makePrice("A", 1.5)];
    const sections = buildDeckNeedSections(cards, [], decks, deckCards, prices);
    const wishlistNeeds = buildWishlistNeeds(cards, [], [wish("A", 3)], prices);
    const { items, cardCount, totalCost } = buildBuyList(sections, wishlistNeeds);
    expect(items).toHaveLength(1);
    expect(items[0].need).toBe(4); // max(2, 4, 3)
    expect(items[0].est_cost).toBe(6); // 4 * 1.5
    expect(cardCount).toBe(4);
    expect(totalCost).toBe(6);
  });

  it("skips null costs in totalCost but still counts cards", () => {
    const decks = [makeDeck("d1", "2026-01-01")];
    const deckCards = [dcard("d1", "A", 2)];
    const sections = buildDeckNeedSections(cards, [], decks, deckCards, []); // no prices
    const { items, cardCount, totalCost } = buildBuyList(sections, []);
    expect(items[0].est_cost).toBeNull();
    expect(cardCount).toBe(2);
    expect(totalCost).toBe(0);
  });
});
