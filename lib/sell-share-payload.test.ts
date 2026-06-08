import { describe, it, expect } from "vitest";
import { buildSharePayload } from "@/lib/sell-share-payload";
import type { Card, SellableCard } from "@/lib/types";

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
  it("takes the price from the provided price map", () => {
    const card = makeCard("BT9-009", "WarGreymon", "Regular", "http://img/wg.png");
    const items = [makeSellable({ card, owned: 5, surplus: 3 })];
    expect(buildSharePayload(items, { "BT9-009": 12.5 })).toEqual([
      {
        card_number: "BT9-009",
        name: "WarGreymon",
        variant_name: "Regular",
        image_url: "http://img/wg.png",
        quantity: 3,
        price: 12.5,
      },
    ]);
  });

  it("uses null when the card is absent from the price map", () => {
    const items = [makeSellable({ card: makeCard("BT9-010", "Tyrannomon"), owned: 1, surplus: 1 })];
    expect(buildSharePayload(items, {})[0].price).toBeNull();
  });

  it("uses owned quantity when surplus is 0, and surplus otherwise", () => {
    const a = makeSellable({ card: makeCard("A", "A"), owned: 2, surplus: 0 });
    const b = makeSellable({ card: makeCard("B", "B"), owned: 5, surplus: 3 });
    const out = buildSharePayload([a, b], { A: 1, B: 1 });
    expect(out[0].quantity).toBe(2);
    expect(out[1].quantity).toBe(3);
  });

  it("passes through variant name and image_url", () => {
    const items = [makeSellable({ card: makeCard("BT9-008", "Greymon", "Alt Art", "http://img/g.png"), owned: 1, surplus: 1 })];
    expect(buildSharePayload(items, { "BT9-008": 56 })[0]).toMatchObject({
      variant_name: "Alt Art",
      image_url: "http://img/g.png",
    });
  });

  it("returns an empty array for empty input", () => {
    expect(buildSharePayload([], {})).toEqual([]);
  });
});
