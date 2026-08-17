"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useGame } from "@/contexts/game-context";
import { GAMES, REGISTERED_GAME_IDS } from "@/lib/games";

export default function GameSwitcher() {
  const { gameId, game, setGameId, isHydrated } = useGame();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // A single registered game needs no switcher.
  if (REGISTERED_GAME_IDS.length < 2) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg border border-[var(--border-light)] bg-[var(--elevated)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        {/* Hold the label back until hydration so the wrong game never flashes. */}
        <span className={isHydrated ? "" : "opacity-0"}>{game.shortName}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute left-0 z-50 mt-1 w-44 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl">
          {REGISTERED_GAME_IDS.map((id) => (
            <button
              key={id}
              onClick={() => { setGameId(id); setOpen(false); }}
              className={`flex w-full items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-[var(--elevated)] ${
                id === gameId ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
              }`}
            >
              {GAMES[id].shortName}
              {id === gameId && <Check size={14} className="text-[var(--accent)]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
