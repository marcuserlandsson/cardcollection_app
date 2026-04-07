import type {
  Card,
  CardPrice,
  CollectionEntry,
  DeckCard,
  PriceHistoryEntry,
  SellableCard,
  SellListEntry,
} from "./types";

const SPIKE_THRESHOLD = 0.3; // 30%
const SPIKE_LOOKBACK_DAYS = 7;

export type SpikedCard = {
  card: Card;
  owned: number;
  price: CardPrice;
  spike_pct: number;
  old_price: number;
};

/**
 * Computes the percentage price increase over 7 days.
 * Returns the fraction (e.g. 0.42 for 42%) if >= SPIKE_THRESHOLD, otherwise null.
 */
export function computeSpikePct(
  currentPrice: CardPrice,
  history: PriceHistoryEntry[]
): number | null {
  const current = currentPrice.price_trend;
  if (current === null || current === 0) return null;

  const now = Date.now();
  const targetMs = now - SPIKE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;

  // Find the history entry closest to SPIKE_LOOKBACK_DAYS ago
  let closest: PriceHistoryEntry | null = null;
  let closestDiff = Infinity;

  for (const entry of history) {
    const entryMs = new Date(entry.recorded_at).getTime();
    const diff = Math.abs(entryMs - targetMs);
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = entry;
    }
  }

  if (!closest || closest.price_trend === null || closest.price_trend === 0)
    return null;

  const spikePct = (current - closest.price_trend) / closest.price_trend;
  return spikePct >= SPIKE_THRESHOLD ? spikePct : null;
}

/**
 * Builds the list of sellable cards from the user's collection, extended with
 * sell-list and price spike data.
 */
export function buildSellableCards(
  cards: Card[],
  collection: CollectionEntry[],
  deckCards: DeckCard[],
  prices: CardPrice[],
  sellList: SellListEntry[],
  priceHistory: PriceHistoryEntry[]
): SellableCard[] {
  const collectionMap = new Map(
    collection.map((c) => [c.card_number, c.quantity])
  );
  const priceMap = new Map(prices.map((p) => [p.card_number, p]));
  const historyByCard = new Map<string, PriceHistoryEntry[]>();
  for (const entry of priceHistory) {
    const existing = historyByCard.get(entry.card_number) || [];
    existing.push(entry);
    historyByCard.set(entry.card_number, existing);
  }

  const sellListSet = new Set(sellList.map((s) => s.card_number));

  // Deck usages keyed by card_number (which equals base for deck entries)
  const deckCardsByBase = new Map<string, DeckCard[]>();
  for (const dc of deckCards) {
    const existing = deckCardsByBase.get(dc.card_number) || [];
    existing.push(dc);
    deckCardsByBase.set(dc.card_number, existing);
  }

  // Group cards by base_card_number
  const cardsByBase = new Map<string, Card[]>();
  for (const card of cards) {
    const base = card.base_card_number;
    const existing = cardsByBase.get(base) || [];
    existing.push(card);
    cardsByBase.set(base, existing);
  }

  const sellable: SellableCard[] = [];
  // Track which card_numbers have been added via surplus path to avoid dupes
  const addedBySurplus = new Set<string>();

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
      const sortedVariants = [...variants].sort((a, b) => {
        if (a.variant_name === "Regular" && b.variant_name !== "Regular")
          return -1;
        if (a.variant_name !== "Regular" && b.variant_name === "Regular")
          return 1;
        return a.card_number.localeCompare(b.card_number);
      });

      let remaining = surplus;
      for (const variant of sortedVariants) {
        if (remaining <= 0) break;
        const owned = collectionMap.get(variant.card_number) || 0;
        if (owned === 0) continue;
        const sellQty = Math.min(owned, remaining);
        const price = priceMap.get(variant.card_number) || priceMap.get(base) || null;
        const totalValue =
          price?.price_trend ? sellQty * price.price_trend : null;
        const history = historyByCard.get(variant.card_number) || historyByCard.get(base) || [];
        const spike_pct = price ? computeSpikePct(price, history) : null;
        const inSellList = sellListSet.has(variant.card_number);

        sellable.push({
          card: variant,
          owned,
          needed,
          surplus: sellQty,
          price,
          total_value: totalValue,
          source: inSellList ? "both" : "surplus",
          spike_pct,
        });
        addedBySurplus.add(variant.card_number);
        remaining -= sellQty;
      }
    }
  }

  // Include sell-list-only cards (not already added via surplus)
  for (const entry of sellList) {
    if (addedBySurplus.has(entry.card_number)) continue;

    // Find the card object
    const card = cards.find((c) => c.card_number === entry.card_number);
    if (!card) continue;

    const owned = collectionMap.get(entry.card_number) || 0;
    if (owned === 0) continue;

    const base = card.base_card_number;
    const usages = deckCardsByBase.get(base) || [];
    const needed = Math.max(
      card.max_copies,
      usages.reduce((sum, dc) => sum + dc.quantity, 0)
    );

    const price = priceMap.get(entry.card_number) || priceMap.get(base) || null;
    const totalValue = price?.price_trend ? owned * price.price_trend : null;
    const history = historyByCard.get(entry.card_number) || historyByCard.get(base) || [];
    const spike_pct = price ? computeSpikePct(price, history) : null;

    sellable.push({
      card,
      owned,
      needed,
      surplus: 0,
      price,
      total_value: totalValue,
      source: "sell-list",
      spike_pct,
    });
  }

  return sellable.sort((a, b) => (b.total_value ?? 0) - (a.total_value ?? 0));
}

/**
 * Finds all owned cards with price spikes (>= SPIKE_THRESHOLD over SPIKE_LOOKBACK_DAYS).
 * Deduplicates by base_card_number, keeping the variant with the most owned copies.
 * Sorted by spike_pct descending.
 */
export function findSpikedCards(
  cards: Card[],
  collection: CollectionEntry[],
  prices: CardPrice[],
  priceHistory: PriceHistoryEntry[],
  sellList: SellListEntry[]
): SpikedCard[] {
  const collectionMap = new Map(
    collection.map((c) => [c.card_number, c.quantity])
  );
  const priceMap = new Map(prices.map((p) => [p.card_number, p]));
  const historyByCard = new Map<string, PriceHistoryEntry[]>();
  for (const entry of priceHistory) {
    const existing = historyByCard.get(entry.card_number) || [];
    existing.push(entry);
    historyByCard.set(entry.card_number, existing);
  }

  // Suppress unused-param warning — sellList reserved for future filtering
  void sellList;

  // Group cards by base_card_number
  const cardsByBase = new Map<string, Card[]>();
  for (const card of cards) {
    const base = card.base_card_number;
    const existing = cardsByBase.get(base) || [];
    existing.push(card);
    cardsByBase.set(base, existing);
  }

  const spiked: SpikedCard[] = [];

  for (const [base, variants] of cardsByBase) {
    // Find the variant with the most owned copies
    let bestVariant: Card | null = null;
    let bestOwned = 0;
    for (const variant of variants) {
      const owned = collectionMap.get(variant.card_number) || 0;
      if (owned > bestOwned) {
        bestOwned = owned;
        bestVariant = variant;
      }
    }

    if (!bestVariant || bestOwned === 0) continue;

    const price = priceMap.get(bestVariant.card_number) || priceMap.get(base);
    if (!price) continue;

    const history =
      historyByCard.get(bestVariant.card_number) ||
      historyByCard.get(base) ||
      [];
    const spike_pct = computeSpikePct(price, history);
    if (spike_pct === null) continue;

    // Find old_price: closest entry to SPIKE_LOOKBACK_DAYS ago
    const targetMs = Date.now() - SPIKE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
    let closest: PriceHistoryEntry | null = null;
    let closestDiff = Infinity;
    for (const entry of history) {
      const diff = Math.abs(new Date(entry.recorded_at).getTime() - targetMs);
      if (diff < closestDiff) {
        closestDiff = diff;
        closest = entry;
      }
    }
    const old_price = closest?.price_trend ?? 0;

    spiked.push({
      card: bestVariant,
      owned: bestOwned,
      price,
      spike_pct,
      old_price,
    });
  }

  return spiked.sort((a, b) => b.spike_pct - a.spike_pct);
}
