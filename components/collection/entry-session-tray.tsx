"use client";

import { Undo2, PackagePlus } from "lucide-react";
import { sessionTotal, type SessionState } from "@/lib/session-tally";

interface EntrySessionTrayProps {
  session: SessionState;
  onUndo: (cardNumber: string) => void;
}

export default function EntrySessionTray({ session, onUndo }: EntrySessionTrayProps) {
  const total = sessionTotal(session);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">This session</p>
      <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
        {total} <span className="text-sm font-normal text-[var(--text-muted)]">cards added</span>
      </p>

      {session.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-2 py-6 text-center text-[var(--text-dim)]">
          <PackagePlus size={24} />
          <p className="text-xs">Cards you add will show up here.</p>
        </div>
      ) : (
        <ul className="mt-3 max-h-[50vh] space-y-1 overflow-y-auto">
          {session.map((item) => (
            <li
              key={item.cardNumber}
              className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--elevated)]"
            >
              <span className="min-w-0 flex-1 truncate text-[var(--text-secondary)]">
                {item.name}
                {item.variantName !== "Regular" && (
                  <span className="text-[var(--text-dim)]"> · {item.variantName}</span>
                )}
              </span>
              <span className="font-semibold text-[var(--text-primary)]">×{item.qtyAdded}</span>
              <button
                onClick={() => onUndo(item.cardNumber)}
                aria-label={`Undo ${item.name}`}
                className="rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <Undo2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
