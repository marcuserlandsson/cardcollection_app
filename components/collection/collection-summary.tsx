"use client";

import { useCollection } from "@/lib/hooks/use-collection";
import { usePrices } from "@/lib/hooks/use-prices";
import { formatPrice } from "@/lib/utils";

export default function CollectionSummary() {
  const { data: collection } = useCollection();
  const { data: prices } = usePrices();

  const totalCards = collection?.reduce((sum, c) => sum + c.quantity, 0) ?? 0;
  const uniqueCards = collection?.length ?? 0;

  let estimatedValue: number | null = null;
  if (collection && prices) {
    const priceMap = new Map(prices.map((p) => [p.card_number, p.price_trend]));
    estimatedValue = collection.reduce((sum, c) => {
      const price = priceMap.get(c.card_number);
      return sum + (price ? price * c.quantity : 0);
    }, 0);
  }

  return (
    <div className="flex flex-wrap gap-6 rounded-lg bg-[var(--surface)] p-4">
      <div>
        <div className="text-xs text-[var(--text-secondary)]">TOTAL CARDS</div>
        <div className="text-xl font-bold">{totalCards}</div>
      </div>
      <div>
        <div className="text-xs text-[var(--text-secondary)]">UNIQUE</div>
        <div className="text-xl font-bold">{uniqueCards}</div>
      </div>
      <div>
        <div className="text-xs text-[var(--text-secondary)]">EST. VALUE</div>
        <div className="text-xl font-bold text-[var(--accent)]">
          {estimatedValue !== null ? formatPrice(estimatedValue) : "—"}
        </div>
      </div>
    </div>
  );
}
