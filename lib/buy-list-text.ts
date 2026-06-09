import type { BuyListItem } from "./types";

/**
 * Formats a buy list as a marketplace-ready text block, one line per card:
 *   {need}x {name}[ · {variant}] ({card_number})[ — €{price} each]
 * Price mirrors the CSV export (generateBuyCsv) so the two agree.
 * No total line and no footer — the needs page shows the aggregate separately.
 */
export function formatBuyListText(items: BuyListItem[]): string {
  return items
    .map((item) => {
      const variant =
        item.card.variant_name !== "Regular" ? ` · ${item.card.variant_name}` : "";
      const price = item.price?.price_low ?? item.price?.price_trend ?? null;
      const pricePart = price !== null ? ` — €${price.toFixed(2)} each` : "";
      return `${item.need}x ${item.card.name}${variant} (${item.card.card_number})${pricePart}`;
    })
    .join("\n");
}
