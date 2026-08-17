import { describe, it, expect } from "vitest";
import { GAMES, REGISTERED_GAME_IDS, getGame, resolveGameId } from "@/lib/games";

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
  });

  it("falls back to digimon for null, empty and unknown ids", () => {
    expect(resolveGameId(null)).toBe("digimon");
    expect(resolveGameId(undefined)).toBe("digimon");
    expect(resolveGameId("")).toBe("digimon");
    expect(resolveGameId("pokemon")).toBe("digimon");
  });
});
