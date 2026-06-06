import type { SellableCard } from "./types";

/**
 * Formats sellable cards as a marketplace-ready text block, one line per card:
 *   {qty}x {name}[ · {variant}] ({card_number})[ — €{price} each]
 * Quantity and price mirror the CSV export (generateSellCsv) so the two agree.
 * No total line and no footer — the sell page shows the aggregate separately.
 */
export function formatSellListText(items: SellableCard[]): string {
  return items
    .map((item) => {
      const qty = item.surplus > 0 ? item.surplus : item.owned;
      const variant =
        item.card.variant_name !== "Regular" ? ` · ${item.card.variant_name}` : "";
      const price = item.price?.price_low ?? item.price?.price_trend ?? null;
      const pricePart = price !== null ? ` — €${price.toFixed(2)} each` : "";
      return `${qty}x ${item.card.name}${variant} (${item.card.card_number})${pricePart}`;
    })
    .join("\n");
}
