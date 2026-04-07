import CardImage from "@/components/cards/card-image";
import { formatPrice } from "@/lib/utils";
import { Zap } from "lucide-react";
import type { SpikedCard } from "@/lib/sell-utils";
import type { Card } from "@/lib/types";

interface PriceSpikeCardsProps {
  spikedCards: SpikedCard[];
  onCardClick: (card: Card) => void;
}

export default function PriceSpikeCards({ spikedCards, onCardClick }: PriceSpikeCardsProps) {
  if (spikedCards.length === 0) return null;

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-[var(--yellow)]">
          <Zap size={14} />
          Price Spikes
        </div>
        <span className="text-xs text-[var(--text-dim)]">
          {spikedCards.length} this week
        </span>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
        {spikedCards.map((item) => (
          <button
            key={item.card.card_number}
            onClick={() => onCardClick(item.card)}
            className="flex-shrink-0 w-[148px] rounded-xl border border-[var(--yellow-border)] bg-[var(--surface)] p-2.5 text-left transition-colors hover:bg-[var(--elevated)]"
          >
            <div className="relative mb-2 h-[72px] w-full overflow-hidden rounded-lg border border-[var(--border)]">
              <CardImage
                cardNumber={item.card.card_number}
                alt={item.card.name}
                imageUrl={item.card.image_url}
                fill
                sizes="132px"
                className="object-cover"
              />
            </div>
            <p className="truncate text-xs font-semibold">{item.card.name}</p>
            <p className="text-[10px] text-[var(--text-dim)]">{item.card.card_number}</p>
            <div className="mt-1.5 flex items-baseline justify-between">
              <span className="text-sm font-bold text-[var(--green)]">
                ↑ {Math.round(item.spike_pct * 100)}%
              </span>
              <span className="text-[10px] text-[var(--text-dim)]">
                {formatPrice(item.old_price)} → {formatPrice(item.price.price_trend)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
