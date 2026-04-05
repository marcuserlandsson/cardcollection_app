import CardImage from "@/components/cards/card-image";
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
      className="group relative overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] transition-colors duration-150 hover:border-[var(--accent-border)] hover:bg-[var(--elevated)]"
    >
      <div className="relative aspect-[5/7]">
        <CardImage
          cardNumber={card.card_number}
          alt={card.name}
          imageUrl={card.image_url}
          fill
          sizes="(max-width: 768px) 33vw, 20vw"
          className="object-cover"
        />
        {quantity !== undefined && quantity > 0 && (
          <span className="absolute right-1 top-1 rounded-full border border-[var(--border-light)] bg-[var(--elevated)] px-2 py-0.5 text-xs font-bold text-[var(--text-primary)]">
            x{quantity}
          </span>
        )}
      </div>
      <div className="p-2">
        <p className="truncate text-xs font-medium">{card.name}</p>
        <p className="text-xs text-[var(--text-muted)]">{card.card_number}</p>
      </div>
    </button>
  );
}
