import type { Card } from "@/lib/types";
import CardThumbnail from "./card-thumbnail";

interface CardGridProps {
  cards: Card[];
  quantities?: Map<string, number>;
  onCardClick: (card: Card) => void;
}

export default function CardGrid({ cards, quantities, onCardClick }: CardGridProps) {
  if (cards.length === 0) {
    return (
      <p className="py-12 text-center text-[var(--text-secondary)]">No cards found.</p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {cards.map((card) => (
        <CardThumbnail
          key={card.card_number}
          card={card}
          quantity={quantities?.get(card.card_number)}
          onClick={onCardClick}
        />
      ))}
    </div>
  );
}
