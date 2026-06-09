import { describe, it, expect } from "vitest";
import { escapeCsvField, generateBuyCsv } from "@/lib/export-csv";
import type { BuyListItem, Card, CardPrice } from "@/lib/types";

function makeCard(card_number: string, name: string, variant_name = "Regular", expansion = "BT09"): Card {
  return {
    card_number,
    name,
    expansion,
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

describe("escapeCsvField", () => {
  it("quotes and escapes fields containing commas or quotes", () => {
    expect(escapeCsvField('a,b')).toBe('"a,b"');
    expect(escapeCsvField('he said "hi"')).toBe('"he said ""hi"""');
    expect(escapeCsvField("plain")).toBe("plain");
  });
});

describe("generateBuyCsv", () => {
  it("emits a header row and one data row per item", () => {
    const items = [
      item({ card: makeCard("BT9-009", "WarGreymon"), need: 3, price: makePrice(19.99), est_cost: 59.97 }),
    ];
    const csv = generateBuyCsv(items);
    const lines = csv.split("\n");
    expect(lines[0]).toBe(
      "Card Number,Name,Expansion,Variant,Rarity,Quantity Needed,Price (EUR),Est. Cost (EUR)",
    );
    expect(lines[1]).toBe("BT9-009,WarGreymon,BT09,Regular,C,3,19.99,59.97");
  });

  it("leaves price and cost blank when there is no price", () => {
    const items = [item({ card: makeCard("BT9-010", "Tyrannomon"), need: 2, price: null, est_cost: null })];
    expect(generateBuyCsv(items).split("\n")[1]).toBe("BT9-010,Tyrannomon,BT09,Regular,C,2,,");
  });

  it("escapes a name containing a comma", () => {
    const items = [item({ card: makeCard("BT9-099", "Greymon, Black"), need: 1 })];
    expect(generateBuyCsv(items).split("\n")[1]).toBe('BT9-099,"Greymon, Black",BT09,Regular,C,1,,');
  });

  it("returns just the header for an empty list", () => {
    expect(generateBuyCsv([])).toBe(
      "Card Number,Name,Expansion,Variant,Rarity,Quantity Needed,Price (EUR),Est. Cost (EUR)",
    );
  });
});
