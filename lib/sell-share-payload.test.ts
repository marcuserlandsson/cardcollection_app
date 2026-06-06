import { describe, it, expect } from "vitest";
import { buildSharePayload } from "@/lib/sell-share-payload";
import type { Card, CardPrice, SellableCard } from "@/lib/types";

function makeCard(card_number: string, name: string, variant_name = "Regular", image_url: string | null = null): Card {
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
    image_url,
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

describe("buildSharePayload", () => {
  it("maps a card using surplus quantity and the low price", () => {
    const items = [
      makeSellable({ card: makeCard("BT9-009", "WarGreymon", "Regular", "http://img/wg.png"), owned: 5, surplus: 3, price: makePrice(19.99) }),
    ];
    expect(buildSharePayload(items)).toEqual([
      { card_number: "BT9-009", name: "WarGreymon", variant_name: "Regular", image_url: "http://img/wg.png", quantity: 3, price: 19.99 },
    ]);
  });

  it("falls back to owned quantity and price_trend", () => {
    const items = [
      makeSellable({ card: makeCard("BT9-007", "Agumon"), owned: 2, surplus: 0, price: makePrice(null, 1.25) }),
    ];
    expect(buildSharePayload(items)[0]).toMatchObject({ quantity: 2, price: 1.25 });
  });

  it("passes through variant name and null price/image", () => {
    const items = [
      makeSellable({ card: makeCard("BT9-008", "Greymon", "Alt Art", null), owned: 1, surplus: 1, price: null }),
    ];
    expect(buildSharePayload(items)[0]).toEqual({
      card_number: "BT9-008",
      name: "Greymon",
      variant_name: "Alt Art",
      image_url: null,
      quantity: 1,
      price: null,
    });
  });

  it("returns an empty array for empty input", () => {
    expect(buildSharePayload([])).toEqual([]);
  });
});
