import { Swords, User, Zap, Egg } from "lucide-react";
import { getBaseCardNumber } from "@/lib/utils";
import { validateDeck } from "@/lib/games/validate-deck";
import type { GameConfig } from "@/lib/games/types";

const DECK_RULES = {
  mainMin: 50,
  mainMax: 50,
  copyLimit: 4,
  zones: [
    { key: "egg", label: "Digi-Egg", cardTypes: ["Digi-Egg"], min: 0, max: 5 },
  ],
};

export const digimon: GameConfig = {
  id: "digimon",
  name: "Digimon Card Game",
  shortName: "Digimon",
  cardTypes: [
    { label: "Digimon", icon: Swords },
    { label: "Tamer", icon: User },
    { label: "Option", icon: Zap },
    { label: "Digi-Egg", icon: Egg },
  ],
  colors: [
    { label: "Red", color: "var(--red)", bg: "var(--red-translucent)", border: "var(--red-border)" },
    { label: "Blue", color: "var(--blue)", bg: "var(--blue-translucent)", border: "var(--blue-border)" },
    { label: "Yellow", color: "var(--yellow)", bg: "var(--yellow-translucent)", border: "var(--yellow-border)" },
    { label: "Green", color: "var(--green)", bg: "var(--green-translucent)", border: "var(--green-border)" },
    { label: "Black", color: "var(--text-secondary)", bg: "var(--elevated)", border: "var(--border-light)" },
    { label: "Purple", color: "var(--purple)", bg: "var(--purple-translucent)", border: "var(--purple-border)" },
    { label: "White", color: "var(--text-primary)", bg: "var(--elevated)", border: "var(--border-light)" },
  ],
  rarities: ["Common", "Uncommon", "Rare", "Super Rare", "Secret Rare"],
  stats: [
    { key: "level", label: "Level", prefix: "Lv." },
    { key: "play_cost", label: "Cost" },
    { key: "dp", label: "DP" },
    { key: "evolution_cost", label: "Evo" },
  ],
  deck: { ...DECK_RULES, validate: (cards) => validateDeck(DECK_RULES, cards) },
  hasPrices: true,
  fallbackImageUrl: (cardNumber) =>
    `https://images.digimoncard.io/images/cards/${getBaseCardNumber(cardNumber)}.jpg`,
  normalizeCardNumber: (raw) => raw.toUpperCase(),
};
