import { digimon } from "@/lib/games/digimon";
import { cyberpunk } from "@/lib/games/cyberpunk";
import type { GameConfig, GameId } from "@/lib/games/types";

export * from "@/lib/games/types";

/**
 * Games with a registered config. Every id declared in GameId must have an
 * entry here — the record type (with no cast) enforces that at compile time.
 */
export const GAMES: Record<GameId, GameConfig> = {
  digimon,
  cyberpunk,
};

export const REGISTERED_GAME_IDS = Object.keys(GAMES) as GameId[];

export function getGame(id: GameId): GameConfig {
  return GAMES[id];
}

/** Coerces an untrusted stored value into a registered game id. */
export function resolveGameId(stored: string | null | undefined): GameId {
  return REGISTERED_GAME_IDS.includes(stored as GameId) ? (stored as GameId) : "digimon";
}
