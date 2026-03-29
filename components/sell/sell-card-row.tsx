import Image from "next/image";
import { getCardImageUrl, formatPrice } from "@/lib/utils";
import type { SellableCard } from "@/lib/types";

interface SellCardRowProps {
  item: SellableCard;
  onClick: () => void;
}

export default function SellCardRow({ item, onClick }: SellCardRowProps) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-lg bg-[var(--surface)] p-3 text-left transition-colors hover:bg-[var(--surface-hover)]">
      <div className="relative h-16 w-11 flex-shrink-0 overflow-hidden rounded">
        <Image src={getCardImageUrl(item.card.card_number)} alt={item.card.name} fill sizes="44px" className="object-cover" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{item.card.name}</p>
        <p className="text-xs text-[var(--text-secondary)]">{item.card.card_number}</p>
        <p className="text-xs text-[var(--accent)]">x{item.surplus} surplus</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold">{formatPrice(item.total_value)}</p>
        <p className="text-xs text-[var(--text-secondary)]">{formatPrice(item.price?.price_trend ?? null)} each</p>
      </div>
    </button>
  );
}
