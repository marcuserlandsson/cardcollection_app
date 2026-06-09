import { describe, it, expect } from "vitest";
import { formatBuyListText } from "@/lib/buy-list-text";
import type { BuyListItem, Card, CardPrice } from "@/lib/types";

function makeCard(card_number: string, name: string, variant_name = "Regular"): Card {
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
    base_card_number: card_number,
    variant_name,
  };
}

function makePrice(price_low: number | null, price_trend: number | null = null): CardPrice {
  return { card_number: "x", price_avg: null, price_low, price_trend, fetched_at: "" };
}

function item(partial: Partial<BuyListItem> & { card: Card }): BuyListItem {
  return { need: 1, price: null, est_cost: null, ...partial };
}

describe("formatBuyListText", () => {
  it("formats a card with need, name, number, and per-unit price", () => {
    const items = [item({ card: makeCard("BT9-009", "WarGreymon"), need: 3, price: makePrice(19.99) })];
    expect(formatBuyListText(items)).toBe("3x WarGreymon (BT9-009) — €19.99 each");
  });

  it("appends variant name only for non-Regular variants", () => {
    const items = [item({ card: makeCard("BT9-008", "Greymon", "Alt Art"), need: 1, price: makePrice(56) })];
    expect(formatBuyListText(items)).toBe("1x Greymon · Alt Art (BT9-008) — €56.00 each");
  });

  it("omits the price segment when there is no price", () => {
    const items = [item({ card: makeCard("BT9-010", "Tyrannomon"), need: 2, price: null })];
    expect(formatBuyListText(items)).toBe("2x Tyrannomon (BT9-010)");
  });

  it("falls back to price_trend when price_low is null", () => {
    const items = [item({ card: makeCard("BT9-011", "Meramon"), need: 1, price: makePrice(null, 4.25) })];
    expect(formatBuyListText(items)).toBe("1x Meramon (BT9-011) — €4.25 each");
  });

  it("joins multiple cards with newlines", () => {
    const items = [
      item({ card: makeCard("BT9-009", "WarGreymon"), need: 3, price: makePrice(19.99) }),
      item({ card: makeCard("BT9-007", "Agumon"), need: 2, price: makePrice(1.5) }),
    ];
    expect(formatBuyListText(items)).toBe(
      "3x WarGreymon (BT9-009) — €19.99 each\n2x Agumon (BT9-007) — €1.50 each",
    );
  });

  it("returns an empty string for an empty list", () => {
    expect(formatBuyListText([])).toBe("");
  });
});
