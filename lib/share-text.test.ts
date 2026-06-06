import { describe, it, expect } from "vitest";
import { formatSellListText } from "@/lib/share-text";
import type { Card, CardPrice, SellableCard } from "@/lib/types";

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
  return {
    card_number: "x",
    price_avg: null,
    price_low,
    price_trend,
    fetched_at: "",
  };
}

function makeSellable(partial: Partial<SellableCard> & { card: Card }): SellableCard {
  return {
    owned: 0,
    needed: 4,
    surplus: 0,
    price: null,
    total_value: null,
    source: "surplus",
    spike_pct: null,
    outlier_low: false,
    ...partial,
  };
}

describe("formatSellListText", () => {
  it("uses surplus as the quantity when surplus > 0", () => {
    const items = [
      makeSellable({ card: makeCard("BT9-009", "WarGreymon"), owned: 5, surplus: 3, price: makePrice(19.99) }),
    ];
    expect(formatSellListText(items)).toBe("3x WarGreymon (BT9-009) — €19.99 each");
  });

  it("falls back to owned quantity when surplus is 0", () => {
    const items = [
      makeSellable({ card: makeCard("BT9-007", "Agumon"), owned: 2, surplus: 0, price: makePrice(1.5) }),
    ];
    expect(formatSellListText(items)).toBe("2x Agumon (BT9-007) — €1.50 each");
  });

  it("appends the variant name only for non-Regular variants", () => {
    const items = [
      makeSellable({ card: makeCard("BT9-008", "Greymon", "Alt Art"), owned: 1, surplus: 1, price: makePrice(56) }),
    ];
    expect(formatSellListText(items)).toBe("1x Greymon · Alt Art (BT9-008) — €56.00 each");
  });

  it("omits the price segment when there is no price", () => {
    const items = [
      makeSellable({ card: makeCard("BT9-010", "Tyrannomon"), owned: 1, surplus: 1, price: null }),
    ];
    expect(formatSellListText(items)).toBe("1x Tyrannomon (BT9-010)");
  });

  it("falls back to price_trend when price_low is null", () => {
    const items = [
      makeSellable({ card: makeCard("BT9-011", "Meramon"), owned: 1, surplus: 1, price: makePrice(null, 4.25) }),
    ];
    expect(formatSellListText(items)).toBe("1x Meramon (BT9-011) — €4.25 each");
  });

  it("joins multiple cards with newlines and emits no total or footer", () => {
    const items = [
      makeSellable({ card: makeCard("BT9-009", "WarGreymon"), owned: 3, surplus: 3, price: makePrice(19.99) }),
      makeSellable({ card: makeCard("BT9-007", "Agumon"), owned: 2, surplus: 2, price: makePrice(1.5) }),
    ];
    expect(formatSellListText(items)).toBe(
      "3x WarGreymon (BT9-009) — €19.99 each\n2x Agumon (BT9-007) — €1.50 each",
    );
  });

  it("returns an empty string for an empty list", () => {
    expect(formatSellListText([])).toBe("");
  });
});
