import { describe, it, expect } from "vitest";
import { GAMES, REGISTERED_GAME_IDS, getGame, resolveGameId } from "@/lib/games";
import { formatRam } from "@/lib/games/cyberpunk";

describe("game registry", () => {
  it("registers every declared game id exactly once", () => {
    expect(Object.keys(GAMES).sort()).toEqual([...REGISTERED_GAME_IDS].sort());
    for (const id of REGISTERED_GAME_IDS) {
      expect(GAMES[id].id).toBe(id);
    }
  });

  it("gives every game a non-empty name, shortName, card types and rarities", () => {
    for (const id of REGISTERED_GAME_IDS) {
      const g = GAMES[id];
      expect(g.name.length).toBeGreaterThan(0);
      expect(g.shortName.length).toBeGreaterThan(0);
      expect(g.cardTypes.length).toBeGreaterThan(0);
      expect(g.rarities.length).toBeGreaterThan(0);
      expect(g.colors.length).toBeGreaterThan(0);
    }
  });

  it("only routes deck zones through card types the game declares", () => {
    for (const id of REGISTERED_GAME_IDS) {
      const declared = GAMES[id].cardTypes.map((t) => t.label);
      for (const zone of GAMES[id].deck.zones) {
        for (const type of zone.cardTypes) {
          expect(declared).toContain(type);
        }
      }
    }
  });

  it("keeps deck size bounds coherent", () => {
    for (const id of REGISTERED_GAME_IDS) {
      const { mainMin, mainMax, copyLimit } = GAMES[id].deck;
      expect(mainMin).toBeLessThanOrEqual(mainMax);
      expect(copyLimit).toBeGreaterThan(0);
    }
  });

  it("returns the config by id", () => {
    expect(getGame("digimon").shortName).toBe("Digimon");
  });
});

describe("resolveGameId", () => {
  it("round trips a valid stored id", () => {
    expect(resolveGameId("digimon")).toBe("digimon");
    expect(resolveGameId("cyberpunk")).toBe("cyberpunk");
  });

  it("falls back to digimon for null, empty and unknown ids", () => {
    expect(resolveGameId(null)).toBe("digimon");
    expect(resolveGameId(undefined)).toBe("digimon");
    expect(resolveGameId("")).toBe("digimon");
    expect(resolveGameId("pokemon")).toBe("digimon");
  });
});

describe("cyberpunk config", () => {
  it("declares the four card types and seven rarities", () => {
    const g = GAMES.cyberpunk;
    expect(g.cardTypes.map((t) => t.label)).toEqual(["Legend", "Unit", "Gear", "Program"]);
    expect(g.rarities).toHaveLength(7);
    expect(g.rarities).toContain("Iconic Rare");
    expect(g.rarities).toContain("Nova Rare");
  });

  it("has no price support and no image fallback", () => {
    expect(GAMES.cyberpunk.hasPrices).toBe(false);
    expect(GAMES.cyberpunk.fallbackImageUrl("wtnc-006")).toBe("");
  });

  it("lowercases card numbers", () => {
    expect(GAMES.cyberpunk.normalizeCardNumber("WTNC-006")).toBe("wtnc-006");
  });

  it("enforces three unique legends and a 40-50 main deck", () => {
    const { deck } = GAMES.cyberpunk;
    expect(deck.mainMin).toBe(40);
    expect(deck.mainMax).toBe(50);
    expect(deck.copyLimit).toBe(3);
    expect(deck.zones[0]).toMatchObject({ key: "legend", min: 3, max: 3, uniqueNames: true });
  });
});

describe("formatRam", () => {
  it("renders a plain number as its string form", () => {
    expect(formatRam(3)).toBe("3");
  });

  it("does not swallow the number 0", () => {
    expect(formatRam(0)).toBe("0");
  });

  it("renders a single-colour object compactly", () => {
    expect(formatRam({ red: 3 })).toBe("3R");
  });

  it("renders a multi-colour object compactly", () => {
    expect(formatRam({ red: 3, blue: 2 })).toBe("3R 2B");
  });

  it("renders null as the string 'null' rather than throwing", () => {
    expect(formatRam(null)).toBe("null");
  });

  it("renders undefined as the string 'undefined' rather than throwing", () => {
    expect(formatRam(undefined)).toBe("undefined");
  });
});
