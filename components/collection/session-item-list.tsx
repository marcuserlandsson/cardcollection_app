"use client";

import { Undo2, PackagePlus } from "lucide-react";
import type { SessionState } from "@/lib/session-tally";

interface SessionItemListProps {
  session: SessionState;
  onUndo: (cardNumber: string) => void;
  className?: string;
}

export default function SessionItemList({ session, onUndo, className }: SessionItemListProps) {
  if (session.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center text-[var(--text-dim)]">
        <PackagePlus size={24} />
        <p className="text-xs">Cards you add will show up here.</p>
      </div>
    );
  }

  return (
    <ul className={`space-y-1 ${className ?? ""}`}>
      {session.map((item) => (
        <li
          key={item.cardNumber}
          className="flex items-center justify-between gap-2 rounded-lg px-2 text-sm hover:bg-[var(--elevated)]"
        >
          <span className="min-w-0 flex-1 truncate text-[var(--text-secondary)]">
            {item.name}
            {item.variantName !== "Regular" && (
              <span className="text-[var(--text-dim)]"> · {item.variantName}</span>
            )}
          </span>
          <span className="font-semibold text-[var(--text-primary)]">×{item.qtyAdded}</span>
          <button
            type="button"
            onClick={() => onUndo(item.cardNumber)}
            aria-label={`Undo ${item.name}`}
            style={{ touchAction: "manipulation" }}
            className="flex h-11 w-11 items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--elevated)] hover:text-[var(--text-primary)]"
          >
            <Undo2 size={16} />
          </button>
        </li>
      ))}
    </ul>
  );
}
