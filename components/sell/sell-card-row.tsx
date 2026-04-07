import CardImage from "@/components/cards/card-image";
import { formatPrice } from "@/lib/utils";
import { Coins, PackageMinus, ClipboardList } from "lucide-react";
import type { SellableCard } from "@/lib/types";

interface SellCardRowProps {
  item: SellableCard;
  onClick: () => void;
}

export default function SellCardRow({ item, onClick }: SellCardRowProps) {
  const isSellListOnly = item.source === "sell-list";

  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-left transition-colors duration-150 hover:bg-[var(--elevated)]">
      <div className="relative h-16 w-11 flex-shrink-0 overflow-hidden rounded-md border border-[var(--border)]">
        <CardImage cardNumber={item.card.card_number} alt={item.card.name} imageUrl={item.card.image_url} fill sizes="44px" className="object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">{item.card.name}</p>
        <p className="text-xs text-[var(--text-muted)]">{item.card.card_number}</p>
        <div className="flex items-center gap-1.5 mt-1">
          {isSellListOnly ? (
            <span className="flex items-center gap-1 text-xs font-medium text-[var(--purple)]">
              <ClipboardList size={11} />
              Sell list · ×{item.owned} owned
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-medium text-[var(--yellow)]">
              <PackageMinus size={11} />
              ×{item.surplus} surplus
            </span>
          )}
          {item.spike_pct !== null && (
            <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold text-[var(--green)] bg-[var(--green-translucent)]">
              ↑ {Math.round(item.spike_pct * 100)}%
            </span>
          )}
          {item.source === "both" && (
            <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium text-[var(--purple)] bg-[var(--purple-translucent)]">
              <ClipboardList size={9} />
              Sell list
            </span>
          )}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        {item.price ? (
          <>
            <p className="flex items-center justify-end gap-1 text-sm font-bold text-[var(--green)]">
              <Coins size={14} />
              {formatPrice(item.total_value)}
            </p>
            <p className="text-xs text-[var(--text-muted)]">{formatPrice(item.price.price_trend)} each</p>
          </>
        ) : (
          <p className="text-xs italic text-[var(--text-dim)]">No listings</p>
        )}
      </div>
    </button>
  );
}
