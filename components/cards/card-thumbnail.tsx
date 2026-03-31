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
      className="group relative overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] transition-all duration-200 hover:-translate-y-1 hover:border-[var(--accent-border)] hover:shadow-[0_4px_16px_var(--accent-glow)]"
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
          <span className="absolute right-1 top-1 rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs font-bold text-[var(--background)]">
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
