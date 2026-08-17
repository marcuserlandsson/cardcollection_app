import { Crown, Users, Wrench, Terminal } from "lucide-react";
import { validateDeck } from "@/lib/games/validate-deck";
import type { GameConfig } from "@/lib/games/types";

const DECK_RULES = {
  mainMin: 40,
  mainMax: 50,
  copyLimit: 3,
  zones: [
    { key: "legend", label: "Legends", cardTypes: ["Legend"], min: 3, max: 3, uniqueNames: true },
  ],
};

export const cyberpunk: GameConfig = {
  id: "cyberpunk",
  name: "Cyberpunk Trading Card Game",
  shortName: "Cyberpunk",
  cardTypes: [
    { label: "Legend", icon: Crown },
    { label: "Unit", icon: Users },
    { label: "Gear", icon: Wrench },
    { label: "Program", icon: Terminal },
  ],
  // PROVISIONAL: only Red and Green are confirmed from official sources
  // (WeirdCo's RAM deckbuilding article). The full set is unpublished until
  // the retail release. The importer validates every seed row's colour against
  // its own list and aborts on an unknown value, so a wrong entry here fails
  // loudly at import time rather than silently. Keep this list and the
  // GAME_RULES colours in scripts/import_game_cards.py in step.
  colors: [
    { label: "Red", color: "var(--red)", bg: "var(--red-translucent)", border: "var(--red-border)" },
    { label: "Blue", color: "var(--blue)", bg: "var(--blue-translucent)", border: "var(--blue-border)" },
    { label: "Yellow", color: "var(--yellow)", bg: "var(--yellow-translucent)", border: "var(--yellow-border)" },
    { label: "Green", color: "var(--green)", bg: "var(--green-translucent)", border: "var(--green-border)" },
    { label: "Purple", color: "var(--purple)", bg: "var(--purple-translucent)", border: "var(--purple-border)" },
  ],
  rarities: [
    "Common",
    "Uncommon",
    "Rare",
    "Epic Rare",
    "Secret Rare",
    "Iconic Rare",
    "Nova Rare",
  ],
  stats: [
    { key: "cost", label: "Cost" },
    { key: "power", label: "Power" },
    { key: "ram", label: "RAM" },
  ],
  deck: { ...DECK_RULES, validate: (cards) => validateDeck(DECK_RULES, cards) },
  hasPrices: false,
  fallbackImageUrl: () => "",
  normalizeCardNumber: (raw) => raw.toLowerCase(),
};
