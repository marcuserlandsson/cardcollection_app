import { formatPrice } from "@/lib/utils";
import { PackageMinus, Coins } from "lucide-react";

interface SellSummaryProps {
  surplusCount: number;
  totalValue: number | null;
}

export default function SellSummary({ surplusCount, totalValue }: SellSummaryProps) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-1 items-center gap-3 rounded-xl bg-[var(--surface)] p-4">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--elevated)]" style={{ color: "var(--purple)" }}>
          <PackageMinus size={18} />
        </div>
        <div>
          <div className="text-lg font-bold">{surplusCount}</div>
          <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Surplus Cards</div>
        </div>
      </div>
      <div className="flex flex-1 items-center gap-3 rounded-xl bg-[var(--surface)] p-4">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--elevated)]" style={{ color: "var(--yellow)" }}>
          <Coins size={18} />
        </div>
        <div>
          <div className="text-lg font-bold">{totalValue !== null ? formatPrice(totalValue) : "—"}</div>
          <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Total Value</div>
        </div>
      </div>
    </div>
  );
}
