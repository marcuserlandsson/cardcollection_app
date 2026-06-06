"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { sessionTotal, type SessionState } from "@/lib/session-tally";
import SessionItemList from "@/components/collection/session-item-list";

interface EntrySessionSheetProps {
  session: SessionState;
  onUndo: (cardNumber: string) => void;
}

/**
 * Mobile-only (< lg) bottom sheet for the entry session tray.
 * Collapsed: a slim bar pinned to the bottom showing the running total.
 * Expanded: a scrollable panel with the added-cards list + per-item undo,
 * over a tap-to-dismiss backdrop. The desktop right rail is unchanged.
 */
export default function EntrySessionSheet({ session, onUndo }: EntrySessionSheetProps) {
  const [expanded, setExpanded] = useState(false);
  const total = sessionTotal(session);

  return (
    <div className="lg:hidden">
      {expanded && (
        <div
          className="fixed inset-0 z-20 bg-black/60 transition-opacity motion-reduce:transition-none"
          onClick={() => setExpanded(false)}
          aria-hidden="true"
        />
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 flex max-h-[80vh] flex-col">
        {expanded && (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-t-xl border-t border-[var(--border)] bg-[var(--surface)] px-2 py-3">
            <SessionItemList session={session} onUndo={onUndo} />
          </div>
        )}

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse session tray" : "Expand session tray"}
          style={{ touchAction: "manipulation" }}
          className={`flex min-h-[52px] w-full items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3 ${
            expanded ? "" : "rounded-t-xl"
          }`}
        >
          <span className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-[var(--text-primary)]">{total}</span>
            <span className="text-sm text-[var(--text-muted)]">cards added this session</span>
          </span>
          {expanded ? (
            <ChevronDown size={18} className="text-[var(--text-muted)]" />
          ) : (
            <ChevronUp size={18} className="text-[var(--text-muted)]" />
          )}
        </button>
      </div>
    </div>
  );
}
