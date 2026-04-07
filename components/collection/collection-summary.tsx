"use client";

import { useCollection } from "@/lib/hooks/use-collection";
import { usePrices } from "@/lib/hooks/use-prices";
import { formatPrice, getBaseCardNumber } from "@/lib/utils";
import { Layers, Sparkles, Coins } from "lucide-react";

export default function CollectionSummary() {
  const { data: collection } = useCollection();
  const { data: prices } = usePrices();

  const totalCards = collection?.reduce((sum, c) => sum + c.quantity, 0) ?? 0;
  const uniqueCards = collection?.length ?? 0;

  let estimatedValue: number | null = null;
  if (collection && prices) {
    const priceMap = new Map(prices.map((p) => [p.card_number, p.price_low ?? p.price_trend]));
    estimatedValue = collection.reduce((sum, c) => {
      const price = priceMap.get(c.card_number) ?? priceMap.get(getBaseCardNumber(c.card_number));
      return sum + (price ? price * c.quantity : 0);
    }, 0);
  }

  const stats = [
    { label: "Total Cards", value: totalCards, icon: Layers, color: "var(--accent)" },
    { label: "Unique", value: uniqueCards, icon: Sparkles, color: "var(--blue)" },
    { label: "Est. Value", value: estimatedValue !== null ? formatPrice(estimatedValue) : "—", icon: Coins, color: "var(--yellow)" },
  ];

  return (
    <div className="flex gap-3">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="flex flex-1 items-center gap-3 rounded-xl bg-[var(--surface)] p-4">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--elevated)]" style={{ color: stat.color }}>
              <Icon size={18} />
            </div>
            <div>
              <div className="text-lg font-bold">{stat.value}</div>
              <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{stat.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
