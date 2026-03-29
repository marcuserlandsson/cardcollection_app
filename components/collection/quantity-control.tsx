"use client";

import { useCollectionQuantity, useUpdateQuantity } from "@/lib/hooks/use-collection";

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
        className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--surface-hover)] text-lg font-bold transition-colors hover:bg-[var(--border)] disabled:opacity-30"
      >-</button>
      <span className="min-w-[2ch] text-center text-lg font-bold">{quantity}</span>
      <button
        onClick={() => updateQuantity({ cardNumber, quantity: quantity + 1 })}
        className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--accent)] text-lg font-bold text-white transition-colors hover:bg-[var(--accent-hover)]"
      >+</button>
    </div>
  );
}
