import { formatPrice } from "@/lib/utils";

interface SellSummaryProps {
  surplusCount: number;
  totalValue: number | null;
}

export default function SellSummary({ surplusCount, totalValue }: SellSummaryProps) {
  return (
    <div className="flex gap-6 px-1">
      <div>
        <div className="text-2xl font-bold">{surplusCount}</div>
        <div className="text-xs text-[var(--text-muted)]">Surplus cards</div>
      </div>
      <div>
        <div className="text-2xl font-bold text-[var(--green)]">{totalValue !== null ? formatPrice(totalValue) : "—"}</div>
        <div className="text-xs text-[var(--text-muted)]">Total value</div>
      </div>
    </div>
  );
}
