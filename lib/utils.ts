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
  const deckCardsByBase = new Map<string, DeckCard[]>();
  for (const dc of deckCards) {
    const existing = deckCardsByBase.get(dc.card_number) || [];
    existing.push(dc);
    deckCardsByBase.set(dc.card_number, existing);
  }

  // Group cards by base_card_number for surplus calculation
  const cardsByBase = new Map<string, Card[]>();
  for (const card of cards) {
    const base = card.base_card_number;
    const existing = cardsByBase.get(base) || [];
    existing.push(card);
    cardsByBase.set(base, existing);
  }

  const sellable: SellableCard[] = [];

  for (const [base, variants] of cardsByBase) {
    // Total owned across all variants
    const totalOwned = variants.reduce(
      (sum, v) => sum + (collectionMap.get(v.card_number) || 0),
      0
    );
    if (totalOwned === 0) continue;

    // Deck usage is by base card_number
    const usages = deckCardsByBase.get(base) || [];
    const needed = Math.max(
      variants[0].max_copies,
      usages.reduce((sum, dc) => sum + dc.quantity, 0)
    );
    const surplus = Math.max(0, totalOwned - needed);

    if (surplus > 0) {
      // Recommend selling Regular variants first (keep alt arts for playing)
      // Sort: Regular first, then by variant name
      const sortedVariants = [...variants].sort((a, b) => {
        if (a.variant_name === "Regular" && b.variant_name !== "Regular") return -1;
        if (a.variant_name !== "Regular" && b.variant_name === "Regular") return 1;
        return a.card_number.localeCompare(b.card_number);
      });

      // Pick sellable variants starting from Regular
      let remaining = surplus;
      for (const variant of sortedVariants) {
        if (remaining <= 0) break;
        const owned = collectionMap.get(variant.card_number) || 0;
        if (owned === 0) continue;
        const sellQty = Math.min(owned, remaining);
        const price = priceMap.get(base) || null;
        const totalValue = price?.price_trend ? sellQty * price.price_trend : null;
        sellable.push({
          card: variant,
          owned,
          needed,
          surplus: sellQty,
          price,
          total_value: totalValue,
        });
        remaining -= sellQty;
      }
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
  const base = cardNumber.replace(/-V\d+$/, "");
  return `https://images.digimoncard.io/images/cards/${base}.jpg`;
}

export function getBaseCardNumber(cardNumber: string): string {
  return cardNumber.replace(/-V\d+$/, "");
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
