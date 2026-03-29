"use client";

import { useState } from "react";
import { useCreateDeck } from "@/lib/hooks/use-decks";

interface DeckFormProps {
  onCreated: () => void;
  onCancel: () => void;
}

export default function DeckForm({ onCreated, onCancel }: DeckFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { mutate: createDeck, isPending } = useCreateDeck();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createDeck({ name: name.trim(), description: description.trim() || undefined }, { onSuccess: () => onCreated() });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg bg-[var(--surface)] p-4">
      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Deck name" className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" autoFocus />
      <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" />
      <div className="flex gap-2">
        <button type="submit" disabled={!name.trim() || isPending} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50">{isPending ? "Creating..." : "Create Deck"}</button>
        <button type="button" onClick={onCancel} className="rounded-lg bg-[var(--surface-hover)] px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--border)]">Cancel</button>
      </div>
    </form>
  );
}
