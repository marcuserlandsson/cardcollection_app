import { Search } from "lucide-react";
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
      <div className="flex flex-col items-center justify-center py-16">
        <Search size={40} className="mb-3 text-[var(--border)]" />
        <p className="text-sm text-[var(--text-muted)]">No cards found.</p>
      </div>
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
