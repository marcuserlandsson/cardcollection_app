"use client";

import { sessionTotal, type SessionState } from "@/lib/session-tally";
import SessionItemList from "@/components/collection/session-item-list";

interface EntrySessionTrayProps {
  session: SessionState;
  onUndo: (cardNumber: string) => void;
}

export default function EntrySessionTray({ session, onUndo }: EntrySessionTrayProps) {
  const total = sessionTotal(session);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-xs font-medium text-[var(--text-muted)]">This session</p>
      <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
        {total} <span className="text-sm font-normal text-[var(--text-muted)]">cards added</span>
      </p>
      <SessionItemList
        session={session}
        onUndo={onUndo}
        className="mt-3 max-h-[50vh] overflow-y-auto"
      />
    </div>
  );
}
