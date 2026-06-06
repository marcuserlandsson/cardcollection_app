import type { SellableCard, SellSharePayloadItem } from "./types";

/**
 * Builds the frozen snapshot items for a public share from sellable cards.
 * Quantity and price mirror the CSV/text exports so all three agree.
 */
export function buildSharePayload(items: SellableCard[]): SellSharePayloadItem[] {
  return items.map((item) => ({
    card_number: item.card.card_number,
    name: item.card.name,
    variant_name: item.card.variant_name,
    image_url: item.card.image_url,
    quantity: item.surplus > 0 ? item.surplus : item.owned,
    price: item.price?.price_low ?? item.price?.price_trend ?? null,
  }));
}
