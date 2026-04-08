import type { SellableCard } from "./types";

/**
 * Escapes a CSV field value.
 * If the value contains a comma, double-quote, or newline, wraps in double
 * quotes and escapes any internal double quotes by doubling them.
 */
export function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Generates a CSV string from a list of sellable cards.
 * Columns: Card Number, Name, Expansion, Variant, Rarity, Quantity,
 *          Price (EUR), Total Value (EUR), Condition, Language
 */
export function generateSellCsv(items: SellableCard[]): string {
  const headers = [
    "Card Number",
    "Name",
    "Expansion",
    "Variant",
    "Rarity",
    "Quantity",
    "Price (EUR)",
    "Total Value (EUR)",
    "Condition",
    "Language",
  ];

  const rows = items.map((item) => {
    const quantity = item.surplus > 0 ? item.surplus : item.owned;
    const price = item.price?.price_low ?? item.price?.price_trend ?? null;
    const priceStr = price !== null ? price.toFixed(2) : "";
    const totalValueStr =
      item.total_value !== null ? item.total_value.toFixed(2) : "";

    return [
      escapeCsvField(item.card.card_number),
      escapeCsvField(item.card.name),
      escapeCsvField(item.card.expansion),
      escapeCsvField(item.card.variant_name),
      escapeCsvField(item.card.rarity ?? ""),
      String(quantity),
      priceStr,
      totalValueStr,
      "Near Mint",
      "English",
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

/**
 * Triggers a browser download of the given CSV content.
 */
export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
