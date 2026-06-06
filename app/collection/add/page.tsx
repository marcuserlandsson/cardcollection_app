"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AddModeTabs, { type AddMode } from "@/components/collection/add-mode-tabs";
import EntrySearch from "@/components/collection/entry-search";
import SetChecklist from "@/components/collection/set-checklist";
import EntrySessionTray from "@/components/collection/entry-session-tray";
import EntrySessionSheet from "@/components/collection/entry-session-sheet";
import ImportModal from "@/components/collection/import-modal";
import ViewToggle, { type CardView } from "@/components/cards/view-toggle";
import { useEntrySession } from "@/lib/hooks/use-entry-session";

export default function AddCardsPage() {
  const [mode, setMode] = useState<AddMode>("search");
  const [view, setView] = useState<CardView>("list");
  const [importOpen, setImportOpen] = useState(false);
  const { session, adjust, undo } = useEntrySession();

  return (
    <div className="space-y-4 pb-24 lg:pb-0">
      <div className="flex items-center gap-3">
        <Link
          href="/collection"
          aria-label="Back to collection"
          className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--elevated)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-bold">Add Cards</h1>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <AddModeTabs mode={mode} onChange={setMode} />
            {mode !== "paste" && <ViewToggle view={view} onChange={setView} />}
          </div>

          {mode === "search" && <EntrySearch view={view} onAdjust={adjust} />}
          {mode === "checklist" && <SetChecklist view={view} onAdjust={adjust} />}
          {mode === "paste" && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
              <p className="text-sm text-[var(--text-secondary)]">
                Paste a text list or upload a CSV to bulk-add cards to your collection.
              </p>
              <button
                onClick={() => setImportOpen(true)}
                className="mt-3 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--background)] transition-colors hover:bg-[var(--accent-hover)]"
              >
                Paste or upload a list
              </button>
            </div>
          )}
        </div>

        <aside className="hidden lg:block lg:w-72 lg:flex-none lg:sticky lg:top-4 lg:self-start">
          <EntrySessionTray session={session} onUndo={undo} />
        </aside>
      </div>

      <EntrySessionSheet session={session} onUndo={undo} />

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
