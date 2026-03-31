"use client";

import { useState } from "react";
import Image from "next/image";
import { useCardVariants } from "@/lib/hooks/use-cards";
import { getCardImageUrl } from "@/lib/utils";

interface CardVariantsProps {
  cardNumber: string;
  onVariantSelect: (imageUrl: string) => void;
}

export default function CardVariants({ cardNumber, onVariantSelect }: CardVariantsProps) {
  const { data: variants } = useCardVariants(cardNumber);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  if (!variants || variants.length === 0) return null;

  const baseImageUrl = getCardImageUrl(cardNumber);

  const handleSelect = (index: number, imageUrl: string) => {
    setSelectedIndex(index);
    onVariantSelect(imageUrl);
  };

  return (
    <div className="mt-4 rounded-lg bg-[var(--elevated)] p-3">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Variants</div>
      <div className="flex gap-2">
        <button
          onClick={() => handleSelect(-1, baseImageUrl)}
          className={`relative h-[50px] w-[36px] flex-shrink-0 overflow-hidden rounded border-2 transition-colors ${
            selectedIndex === -1 ? "border-[var(--accent)]" : "border-[var(--border)] hover:border-[var(--border-light)]"
          }`}
        >
          <Image src={baseImageUrl} alt="Regular" fill sizes="36px" className="object-cover" />
        </button>
        {variants.map((variant, i) => {
          const imageUrl = variant.alt_art_url || baseImageUrl;
          return (
            <button
              key={variant.id}
              onClick={() => handleSelect(i, imageUrl)}
              className={`relative h-[50px] w-[36px] flex-shrink-0 overflow-hidden rounded border-2 transition-colors ${
                selectedIndex === i ? "border-[var(--accent)]" : "border-[var(--border)] hover:border-[var(--border-light)]"
              }`}
              title={variant.variant_name}
            >
              <Image src={imageUrl} alt={variant.variant_name} fill sizes="36px" className="object-cover" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
