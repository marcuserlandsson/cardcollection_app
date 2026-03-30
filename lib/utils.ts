import type { CollectionEntry, DeckCard, Card, CardPrice, SellableCard } from "./types";

export function calculateSurplus(
  card: Card,
  owned: number,
  deckUsages: DeckCard[]
): { needed: number; surplus: number } {
  const totalDeckNeed = deckUsages.reduce((sum, dc) => sum + dc.quantity, 0);
  const needed = Math.max(card.max_copies, totalDeckNeed);
  const surplus = Math.max(0, owned - needed);
  return { needed, surplus };
}

export function buildSellableCards(
  cards: Card[],
  collection: CollectionEntry[],
  deckCards: DeckCard[],
  prices: CardPrice[]
): SellableCard[] {
  const collectionMap = new Map(
    collection.map((c) => [c.card_number, c.quantity])
  );
  const priceMap = new Map(prices.map((p) => [p.card_number, p]));
  const deckCardsByCard = new Map<string, DeckCard[]>();
  for (const dc of deckCards) {
    const existing = deckCardsByCard.get(dc.card_number) || [];
    existing.push(dc);
    deckCardsByCard.set(dc.card_number, existing);
  }

  const sellable: SellableCard[] = [];

  for (const card of cards) {
    const owned = collectionMap.get(card.card_number) || 0;
    if (owned === 0) continue;

    const usages = deckCardsByCard.get(card.card_number) || [];
    const { needed, surplus } = calculateSurplus(card, owned, usages);

    if (surplus > 0) {
      const price = priceMap.get(card.card_number) || null;
      const totalValue = price?.price_trend ? surplus * price.price_trend : null;
      sellable.push({ card, owned, needed, surplus, price, total_value: totalValue });
    }
  }

  return sellable.sort(
    (a, b) => (b.total_value ?? 0) - (a.total_value ?? 0)
  );
}

export function formatPrice(value: number | null): string {
  if (value === null) return "Price not available";
  return `€${value.toFixed(2)}`;
}

export function getCardImageUrl(cardNumber: string): string {
  return `https://images.digimoncard.io/images/cards/${cardNumber}.jpg`;
}

export function timeAgo(date: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(date).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
