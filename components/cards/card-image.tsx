"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { useGame } from "@/contexts/game-context";

interface CardImageProps {
  cardNumber: string;
  alt: string;
  imageUrl?: string | null;
  fill?: boolean;
  sizes?: string;
  className?: string;
}

export default function CardImage({ cardNumber, alt, imageUrl, fill, sizes, className }: CardImageProps) {
  const { game } = useGame();
  const [error, setError] = useState(false);
  const src = imageUrl || game.fallbackImageUrl(cardNumber);

  if (error || !src) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-[var(--elevated)] text-[var(--text-dim)]">
        <ImageOff size={20} />
        <span className="text-[10px]">{cardNumber}</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      sizes={sizes}
      className={className}
      onError={() => setError(true)}
    />
  );
}
