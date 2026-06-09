import type {
  BuyListItem,
  Card,
  CardPrice,
  CollectionEntry,
  Deck,
  DeckCard,
  DeckNeedSection,
  NeededCard,
  WishlistEntry,
} from "./types";

/** Cheapest acquisition estimate: lowest listing, then trend, else unknown. */
export function unitPrice(price: CardPrice | null): number | null {
  if (!price) return null;
  return price.price_low ?? price.price_trend ?? null;
}

/** Sum of owned quantities per base card number (across all its variants). */
export function totalOwnedByBase(
  cards: Card[],
  collection: CollectionEntry[],
): Map<string, number> {
  const baseByCardNumber = new Map(cards.map((c) => [c.card_number, c.base_card_number]));
  const out = new Map<string, number>();
  for (const entry of collection) {
    const base = baseByCardNumber.get(entry.card_number);
    if (base === undefined) continue;
    out.set(base, (out.get(base) ?? 0) + entry.quantity);
  }
  return out;
}

/** Deterministic display variant for a base: Regular first, then lowest card_number. */
export function pickRepresentativeVariant(variants: Card[]): Card {
  return [...variants].sort((a, b) => {
    if (a.variant_name === "Regular" && b.variant_name !== "Regular") return -1;
    if (a.variant_name !== "Regular" && b.variant_name === "Regular") return 1;
    return a.card_number.localeCompare(b.card_number);
  })[0];
}

function byEstCostDesc(a: NeededCard, b: NeededCard): number {
  return (b.est_cost ?? -1) - (a.est_cost ?? -1);
}

/** Per-deck shortfalls (independent: each deck assumes it can use all owned copies). */
export function buildDeckNeedSections(
  cards: Card[],
  collection: CollectionEntry[],
  decks: Deck[],
  allDeckCards: DeckCard[],
  prices: CardPrice[],
): DeckNeedSection[] {
  const cardsByBase = new Map<string, Card[]>();
  for (const c of cards) {
    const arr = cardsByBase.get(c.base_card_number) ?? [];
    arr.push(c);
    cardsByBase.set(c.base_card_number, arr);
  }
  const owned = totalOwnedByBase(cards, collection);
  const priceMap = new Map(prices.map((p) => [p.card_number, p]));
  const deckCardsByDeck = new Map<string, DeckCard[]>();
  for (const dc of allDeckCards) {
    const arr = deckCardsByDeck.get(dc.deck_id) ?? [];
    arr.push(dc);
    deckCardsByDeck.set(dc.deck_id, arr);
  }

  const orderedDecks = [...decks].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const sections: DeckNeedSection[] = [];

  for (const deck of orderedDecks) {
    const dcs = deckCardsByDeck.get(deck.id) ?? [];
    let have = 0;
    let want = 0;
    const rows: NeededCard[] = [];

    for (const dc of dcs) {
      const base = dc.card_number; // deck cards are stored by base card_number
      const variants = cardsByBase.get(base);
      if (!variants || variants.length === 0) continue; // card not loaded — skip
      const ownedCount = owned.get(base) ?? 0;
      want += dc.quantity;
      have += Math.min(ownedCount, dc.quantity);
      const need = Math.max(0, dc.quantity - ownedCount);
      if (need <= 0) continue;
      const rep = pickRepresentativeVariant(variants);
      const price = priceMap.get(rep.card_number) ?? priceMap.get(base) ?? null;
      const u = unitPrice(price);
      const est_cost = u !== null ? need * u : null;
      rows.push({ card: rep, need, owned: ownedCount, price, est_cost });
    }

    rows.sort(byEstCostDesc);
    sections.push({ deck, have, want, rows });
  }

  return sections;
}

/** Manual wishlist shortfalls: target minus base-level owned. */
export function buildWishlistNeeds(
  cards: Card[],
  collection: CollectionEntry[],
  wishlist: WishlistEntry[],
  prices: CardPrice[],
): NeededCard[] {
  const cardByNumber = new Map(cards.map((c) => [c.card_number, c]));
  const owned = totalOwnedByBase(cards, collection);
  const priceMap = new Map(prices.map((p) => [p.card_number, p]));
  const rows: NeededCard[] = [];

  for (const w of wishlist) {
    const card = cardByNumber.get(w.card_number);
    if (!card) continue;
    const base = card.base_card_number;
    const ownedCount = owned.get(base) ?? 0;
    const need = Math.max(0, w.quantity - ownedCount);
    if (need <= 0) continue;
    const price = priceMap.get(card.card_number) ?? priceMap.get(base) ?? null;
    const u = unitPrice(price);
    const est_cost = u !== null ? need * u : null;
    rows.push({ card, need, owned: ownedCount, price, est_cost });
  }

  rows.sort(byEstCostDesc);
  return rows;
}

/** Deduplicated global buy list: one entry per base card at its single largest demand. */
export function buildBuyList(
  sections: DeckNeedSection[],
  wishlistNeeds: NeededCard[],
): { items: BuyListItem[]; cardCount: number; totalCost: number } {
  const byBase = new Map<string, { card: Card; need: number; price: CardPrice | null }>();

  const consider = (nc: NeededCard) => {
    const base = nc.card.base_card_number;
    const cur = byBase.get(base);
    if (!cur || nc.need > cur.need) {
      byBase.set(base, { card: nc.card, need: nc.need, price: nc.price });
    }
  };

  for (const s of sections) for (const r of s.rows) consider(r);
  for (const r of wishlistNeeds) consider(r);

  const items: BuyListItem[] = [...byBase.values()].map(({ card, need, price }) => {
    const u = unitPrice(price);
    const est_cost = u !== null ? need * u : null;
    return { card, need, price, est_cost };
  });

  items.sort((a, b) => (b.est_cost ?? -1) - (a.est_cost ?? -1));

  const cardCount = items.reduce((sum, i) => sum + i.need, 0);
  const totalCost = items.reduce((sum, i) => sum + (i.est_cost ?? 0), 0);
  return { items, cardCount, totalCost };
}
