import type { LucideIcon } from "lucide-react";
import type { Card } from "@/lib/types";

export const GAME_IDS = ["digimon", "cyberpunk"] as const;
export type GameId = (typeof GAME_IDS)[number];

/** A stat rendered in the card panel, read out of cards.attributes. */
export interface StatField {
  key: string;
  label: string;
  /** Rendered immediately before the value, e.g. "Lv." for Digimon level. */
  prefix?: string;
}

export interface ColorStyle {
  label: string;
  color: string;
  bg: string;
  border: string;
}

/** A deck region counted separately from the main deck, e.g. Digi-Eggs, Legends. */
export interface DeckZone {
  key: string;
  label: string;
  cardTypes: string[];
  min: number;
  max: number;
  /** When set, each card in the zone must have a distinct name and one copy. */
  uniqueNames?: boolean;
}

export interface DeckIssue {
  severity: "error" | "warning";
  message: string;
}

export type DeckCardWithCard = { card: Card; quantity: number };

export interface DeckRules {
  /** Bounds on cards NOT routed into a zone. */
  mainMin: number;
  mainMax: number;
  /** Copy ceiling when a card carries no stricter max_copies. */
  copyLimit: number;
  zones: DeckZone[];
  validate(cards: DeckCardWithCard[]): DeckIssue[];
}

export interface GameConfig {
  id: GameId;
  name: string;
  shortName: string;
  cardTypes: { label: string; icon: LucideIcon }[];
  colors: ColorStyle[];
  rarities: string[];
  stats: StatField[];
  deck: DeckRules;
  hasPrices: boolean;
  /** "" when the game has no CDN pattern and relies on a stored image_url. */
  fallbackImageUrl(cardNumber: string): string;
  normalizeCardNumber(raw: string): string;
}
