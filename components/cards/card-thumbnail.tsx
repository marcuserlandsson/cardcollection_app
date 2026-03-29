import Image from "next/image";
import { getCardImageUrl } from "@/lib/utils";
import type { Card } from "@/lib/types";

interface CardThumbnailProps {
  card: Card;
  quantity?: number;
  onClick: (card: Card) => void;
}

export default function CardThumbnail({ card, quantity, onClick }: CardThumbnailProps) {
  return (
    <button
      onClick={() => onClick(card)}
      className="group relative overflow-hidden rounded-lg bg-[var(--surface)] transition-colors hover:bg-[var(--surface-hover)]"
    >
      <div className="relative aspect-[5/7]">
        <Image
          src={getCardImageUrl(card.card_number)}
          alt={card.name}
          fill
          sizes="(max-width: 768px) 33vw, 20vw"
          className="object-cover"
        />
        {quantity !== undefined && quantity > 0 && (
          <span className="absolute right-1 top-1 rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs font-bold text-white">
            x{quantity}
          </span>
        )}
      </div>
      <div className="p-2">
        <p className="truncate text-xs font-medium">{card.name}</p>
        <p className="text-xs text-[var(--text-secondary)]">{card.card_number}</p>
      </div>
    </button>
  );
}
