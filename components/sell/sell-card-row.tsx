import CardImage from "@/components/cards/card-image";
import { formatPrice } from "@/lib/utils";
import { Coins, PackageMinus } from "lucide-react";
import type { SellableCard } from "@/lib/types";

interface SellCardRowProps {
  item: SellableCard;
  onClick: () => void;
}

export default function SellCardRow({ item, onClick }: SellCardRowProps) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-left transition-all duration-200 hover:border-[var(--accent-border)] hover:shadow-[0_4px_16px_var(--accent-glow)]">
      <div className="relative h-16 w-11 flex-shrink-0 overflow-hidden rounded-md border border-[var(--border)]">
        <CardImage cardNumber={item.card.card_number} alt={item.card.name} fill sizes="44px" className="object-cover" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{item.card.name}</p>
        <p className="text-xs text-[var(--text-muted)]">{item.card.card_number}</p>
        <p className="flex items-center gap-1 text-xs font-medium text-[var(--yellow)]">
          <PackageMinus size={12} />
          x{item.surplus} surplus
        </p>
      </div>
      <div className="text-right">
        <p className="flex items-center gap-1 text-sm font-bold text-[var(--green)]">
          <Coins size={14} />
          {formatPrice(item.total_value)}
        </p>
        <p className="text-xs text-[var(--text-muted)]">{formatPrice(item.price?.price_trend ?? null)} each</p>
      </div>
    </button>
  );
}
