"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { GAMES, resolveGameId, type GameConfig, type GameId } from "@/lib/games";

const STORAGE_KEY = "cardboard.game";

interface GameContextValue {
  gameId: GameId;
  game: GameConfig;
  setGameId: (id: GameId) => void;
  /** False until the localStorage read lands. Consumers must not render a
   *  game-identifying label before this flips, or the wrong game flashes. */
  isHydrated: boolean;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ gameId: GameId; isHydrated: boolean }>({
    gameId: "digimon",
    isHydrated: false,
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({
      gameId: resolveGameId(window.localStorage.getItem(STORAGE_KEY)),
      isHydrated: true,
    });
  }, []);

  const setGameId = useCallback(
    (id: GameId) => {
      window.localStorage.setItem(STORAGE_KEY, id);
      setState((prev) => ({ ...prev, gameId: id }));
      // Every cached query is keyed by game, so a blanket invalidation is
      // correct and cheap — non-matching keys refetch lazily on next mount.
      queryClient.invalidateQueries();
    },
    [queryClient],
  );

  return (
    <GameContext.Provider value={{ gameId: state.gameId, game: GAMES[state.gameId], setGameId, isHydrated: state.isHydrated }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within a GameProvider");
  return ctx;
}
