"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Copy, Check, X } from "lucide-react";
import { formatSellListText } from "@/lib/share-text";
import type { SellableCard } from "@/lib/types";

type CopyState = "idle" | "copied" | "error";

interface CopyListButtonProps {
  items: SellableCard[];
}

export default function CopyListButton({ items }: CopyListButtonProps) {
  const [state, setState] = useState<CopyState>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(formatSellListText(items));
      setState("copied");
    } catch {
      setState("error");
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setState("idle"), 2000);
  }, [items]);

  const label = state === "copied" ? "Copied!" : state === "error" ? "Copy failed" : "Copy list";
  const Icon = state === "copied" ? Check : state === "error" ? X : Copy;

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={items.length === 0}
      className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--elevated)] disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Icon size={15} />
      {label}
    </button>
  );
}
