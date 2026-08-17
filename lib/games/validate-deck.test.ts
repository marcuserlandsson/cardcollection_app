import { describe, it, expect } from "vitest";
import { validateDeck } from "@/lib/games/validate-deck";
import type { DeckCardWithCard } from "@/lib/games/types";
import type { Card } from "@/lib/types";

function card(card_number: string, card_type: string, name = card_number, max_copies = 4): Card {
  return {
    card_number, name, expansion: "X", card_type, color: "Red", rarity: null,
    dp: null, play_cost: null, level: null, evolution_cost: null,
    image_url: null, pretty_url: null, max_copies, last_updated: "",
    base_card_number: card_number, variant_name: "Regular",
    game: "digimon", attributes: {},
  };
}

/** n distinct main-deck cards, `each` copies apiece. */
function main(n: number, each = 1, type = "Digimon", max_copies = 4): DeckCardWithCard[] {
  return Array.from({ length: n }, (_, i) => ({
    card: card(`M-${i}`, type, `Main ${i}`, max_copies),
    quantity: each,
  }));
}

const DIGIMON = {
  mainMin: 50, mainMax: 50, copyLimit: 4,
  zones: [{ key: "egg", label: "Digi-Egg", cardTypes: ["Digi-Egg"], min: 0, max: 5 }],
};

const CYBERPUNK = {
  mainMin: 40, mainMax: 50, copyLimit: 3,
  zones: [{ key: "legend", label: "Legends", cardTypes: ["Legend"], min: 3, max: 3, uniqueNames: true }],
};

describe("validateDeck — Digimon rules", () => {
  it("accepts 50 main cards with 5 eggs", () => {
    const deck = [
      ...main(13, 4),                                              // 52 — trim below
      { card: card("E-1", "Digi-Egg", "Egg 1"), quantity: 5 },
    ];
    // 12 cards x 4 = 48, plus one card x 2 = 50
    const exact = [...main(12, 4), { card: card("M-X", "Digimon", "Main X"), quantity: 2 },
      { card: card("E-1", "Digi-Egg", "Egg 1"), quantity: 5 }];
    expect(validateDeck(DIGIMON, exact)).toEqual([]);
    expect(validateDeck(DIGIMON, deck).length).toBeGreaterThan(0);
  });

  it("rejects 49 and 51 main cards", () => {
    const short = [...main(12, 4), { card: card("M-X", "Digimon", "Main X"), quantity: 1 }];
    const long = [...main(12, 4), { card: card("M-X", "Digimon", "Main X"), quantity: 3 }];
    expect(validateDeck(DIGIMON, short).some((i) => i.message.includes("49"))).toBe(true);
    expect(validateDeck(DIGIMON, long).some((i) => i.message.includes("51"))).toBe(true);
  });

  it("rejects a sixth egg", () => {
    const deck = [...main(12, 4), { card: card("M-X", "Digimon", "Main X"), quantity: 2 },
      { card: card("E-1", "Digi-Egg", "Egg 1"), quantity: 6 }];
    expect(validateDeck(DIGIMON, deck).some((i) => i.message.includes("Digi-Egg"))).toBe(true);
  });

  it("rejects a fifth copy of one card", () => {
    const deck = [...main(11, 4), { card: card("M-X", "Digimon", "Main X"), quantity: 5 },
      { card: card("M-Y", "Digimon", "Main Y"), quantity: 1 }];
    expect(validateDeck(DIGIMON, deck).some((i) => i.message.includes("Main X"))).toBe(true);
  });
});

describe("validateDeck — Cyberpunk rules", () => {
  const legend = (n: number, name = `Legend ${n}`) => ({ card: card(`L-${n}`, "Legend", name, 1), quantity: 1 });
  const threeLegends = [legend(1), legend(2), legend(3)];

  it("accepts 3 unique legends with 40 main cards", () => {
    const deck = [...threeLegends, ...main(40, 1, "Unit", 3)];
    expect(validateDeck(CYBERPUNK, deck)).toEqual([]);
  });

  it("accepts 50 main cards", () => {
    const deck = [...threeLegends, ...main(50, 1, "Unit", 3)];
    expect(validateDeck(CYBERPUNK, deck)).toEqual([]);
  });

  it("rejects 2 legends and 4 legends", () => {
    expect(validateDeck(CYBERPUNK, [legend(1), legend(2), ...main(40, 1, "Unit", 3)])
      .some((i) => i.message.includes("Legends"))).toBe(true);
    expect(validateDeck(CYBERPUNK, [...threeLegends, legend(4), ...main(40, 1, "Unit", 3)])
      .some((i) => i.message.includes("Legends"))).toBe(true);
  });

  it("rejects two legends sharing a name", () => {
    const deck = [legend(1, "V"), legend(2, "V"), legend(3), ...main(40, 1, "Unit", 3)];
    expect(validateDeck(CYBERPUNK, deck).some((i) => i.message.includes("unique"))).toBe(true);
  });

  it("rejects 39 and 51 main cards, counting legends separately", () => {
    expect(validateDeck(CYBERPUNK, [...threeLegends, ...main(39, 1, "Unit", 3)])
      .some((i) => i.message.includes("39"))).toBe(true);
    expect(validateDeck(CYBERPUNK, [...threeLegends, ...main(51, 1, "Unit", 3)])
      .some((i) => i.message.includes("51"))).toBe(true);
  });

  it("rejects a fourth copy of a unit", () => {
    const deck = [...threeLegends, ...main(37, 1, "Unit", 3),
      { card: card("M-Z", "Unit", "Unit Z", 3), quantity: 4 }];
    expect(validateDeck(CYBERPUNK, deck).some((i) => i.message.includes("Unit Z"))).toBe(true);
  });
});
