import CardImage from "@/components/cards/card-image";
import { formatPrice } from "@/lib/utils";
import { Coins, PackagePlus } from "lucide-react";
import type { NeededCard } from "@/lib/types";

interface NeedCardRowProps {
  item: NeededCard;
  onClick: () => void;
}

export default function NeedCardRow({ item, onClick }: NeedCardRowProps) {
  const unit = item.price?.price_low ?? item.price?.price_trend ?? null;

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-left transition-colors duration-150 hover:bg-[var(--elevated)]"
    >
      <div className="relative h-16 w-11 flex-shrink-0 overflow-hidden rounded-md border border-[var(--border)]">
        <CardImage cardNumber={item.card.card_number} alt={item.card.name} imageUrl={item.card.image_url} fill sizes="44px" className="object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.card.name}</p>
        <p className="text-xs text-[var(--text-muted)]">{item.card.card_number}</p>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="flex items-center gap-1 text-xs font-medium text-[var(--yellow)]">
            <PackagePlus size={11} />
            need {item.need}
          </span>
          {item.card.variant_name !== "Regular" && (
            <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: "var(--purple-translucent)", color: "var(--purple)" }}>
              {item.card.variant_name}
            </span>
          )}
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        {unit !== null ? (
          <>
            <p className="flex items-center justify-end gap-1 text-sm font-bold text-[var(--green)]">
              <Coins size={14} />
              {formatPrice(item.est_cost)}
            </p>
            <p className="text-xs text-[var(--text-muted)]">{formatPrice(unit)} each</p>
          </>
        ) : (
          <p className="text-xs italic text-[var(--text-dim)]">No listings</p>
        )}
      </div>
    </button>
  );
}
