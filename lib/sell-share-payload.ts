import type { SellableCard, SellSharePayloadItem } from "./types";

/**
 * Builds the frozen snapshot items for a public share. The seller's asking
 * price per card comes from the supplied `prices` map (card_number -> price);
 * a card absent from the map (or mapped to null) is published with no price.
 */
export function buildSharePayload(
  items: SellableCard[],
  prices: Record<string, number | null>,
): SellSharePayloadItem[] {
  return items.map((item) => ({
    card_number: item.card.card_number,
    name: item.card.name,
    variant_name: item.card.variant_name,
    image_url: item.card.image_url,
    quantity: item.surplus > 0 ? item.surplus : item.owned,
    price: prices[item.card.card_number] ?? null,
  }));
}
