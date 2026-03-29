import { formatPrice } from "@/lib/utils";

interface SellSummaryProps {
  surplusCount: number;
  totalValue: number | null;
}

export default function SellSummary({ surplusCount, totalValue }: SellSummaryProps) {
  return (
    <div className="rounded-lg bg-[var(--surface)] p-4">
      <p className="text-lg font-bold">
        You have <span className="text-[var(--accent)]">{surplusCount}</span> surplus card{surplusCount !== 1 ? "s" : ""} worth approximately{" "}
        <span className="text-[var(--accent)]">{totalValue !== null ? formatPrice(totalValue) : "unknown"}</span>
      </p>
    </div>
  );
}
