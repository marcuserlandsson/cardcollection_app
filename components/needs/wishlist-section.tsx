import { Star } from "lucide-react";
import WishlistRow from "@/components/needs/wishlist-row";
import type { Card, NeededCard, WishlistEntry } from "@/lib/types";

interface WishlistSectionProps {
  rows: NeededCard[];
  entries: WishlistEntry[];
  onCardClick: (card: Card) => void;
}

export default function WishlistSection({ rows, entries, onCardClick }: WishlistSectionProps) {
  if (rows.length === 0) return null;
  const targetByCard = new Map(entries.map((e) => [e.card_number, e.quantity]));

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
        <Star size={15} className="text-[var(--purple)]" />
        <span className="text-base font-semibold text-[var(--purple)]">Wishlist</span>
        <span className="text-xs text-[var(--text-muted)]">{rows.length} cards</span>
      </div>
      <div className="space-y-2 pt-1">
        {rows.map((row) => (
          <WishlistRow
            key={row.card.card_number}
            item={row}
            target={targetByCard.get(row.card.card_number) ?? row.need}
            onClick={() => onCardClick(row.card)}
          />
        ))}
      </div>
    </section>
  );
}
