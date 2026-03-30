export interface Card {
  card_number: string;
  name: string;
  expansion: string;
  card_type: string;
  color: string;
  rarity: string | null;
  dp: number | null;
  play_cost: number | null;
  level: number | null;
  evolution_cost: number | null;
  image_url: string | null;
  pretty_url: string | null;
  max_copies: number;
  last_updated: string;
}

export interface CollectionEntry {
  user_id: string;
  card_number: string;
  quantity: number;
  updated_at: string;
}

export interface Deck {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeckCard {
  deck_id: string;
  card_number: string;
  quantity: number;
}

export interface CardVariant {
  id: string;
  card_number: string;
  variant_name: string;
  variant_index: number;
  tcgplayer_id: number | null;
  alt_art_url: string | null;
  created_at: string;
}

export interface CardPrice {
  card_number: string;
  price_avg: number | null;
  price_low: number | null;
  price_trend: number | null;
  fetched_at: string;
}

export interface Expansion {
  code: string;
  name: string;
  card_count: number;
}

export interface SellableCard {
  card: Card;
  owned: number;
  needed: number;
  surplus: number;
  price: CardPrice | null;
  total_value: number | null;
}
