"use client";

import { useCollectionQuantity, useUpdateQuantity } from "@/lib/hooks/use-collection";
import { Minus, Plus } from "lucide-react";

interface QuantityControlProps {
  cardNumber: string;
}

export default function QuantityControl({ cardNumber }: QuantityControlProps) {
  const quantity = useCollectionQuantity(cardNumber);
  const { mutate: updateQuantity } = useUpdateQuantity();

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => updateQuantity({ cardNumber, quantity: quantity - 1 })}
        disabled={quantity === 0}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-light)] bg-[var(--elevated)] text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-border)] hover:text-[var(--text-primary)] disabled:opacity-30"
      >
        <Minus size={14} />
      </button>
      <span className="min-w-[2ch] text-center text-lg font-bold">{quantity}</span>
      <button
        onClick={() => updateQuantity({ cardNumber, quantity: quantity + 1 })}
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--background)] transition-colors hover:bg-[var(--accent-hover)]"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
