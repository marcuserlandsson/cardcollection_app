import { digimon } from "@/lib/games/digimon";
import type { GameConfig, GameId } from "@/lib/games/types";

export * from "@/lib/games/types";

/**
 * Games with a registered config. Cyberpunk joins in phase 2; until then it
 * exists in the database's games table but has no cards and no config.
 */
export const GAMES: Record<GameId, GameConfig> = {
  digimon,
  // cyberpunk: added in phase 2
} as Record<GameId, GameConfig>;

export const REGISTERED_GAME_IDS = Object.keys(GAMES) as GameId[];

export function getGame(id: GameId): GameConfig {
  return GAMES[id];
}

/** Coerces an untrusted stored value into a registered game id. */
export function resolveGameId(stored: string | null | undefined): GameId {
  return REGISTERED_GAME_IDS.includes(stored as GameId) ? (stored as GameId) : "digimon";
}
