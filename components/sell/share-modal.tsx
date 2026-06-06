"use client";

import { useState, useEffect, useRef } from "react";
import { X, Copy, Check, ExternalLink, Loader2 } from "lucide-react";
import {
  useSellShare,
  usePublishSellShare,
  useDeleteSellShare,
} from "@/lib/hooks/use-sell-share";
import type { SellableCard } from "@/lib/types";

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  items: SellableCard[];
}

export default function ShareModal({ open, onClose, items }: ShareModalProps) {
  const { data: share, isFetched: shareFetched } = useSellShare();
  const publish = usePublishSellShare();
  const del = useDeleteSellShare();

  const [title, setTitle] = useState("");
  const [contactNote, setContactNote] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);

  // Seed the form once per open (after the share query has fetched) so existing
  // values load even if the query was still in flight when the modal opened, and
  // so a later background refetch never clobbers an in-progress edit.
  const seededRef = useRef(false);
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) {
      seededRef.current = false;
      return;
    }
    if (!seededRef.current && shareFetched) {
      setTitle(share?.title ?? "");
      setContactNote(share?.contact_note ?? "");
      setConfirmStop(false);
      setCopied(false);
      seededRef.current = true;
    }
  }, [open, shareFetched, share]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!open) return null;

  const shareUrl = share ? `${window.location.origin}/s/${share.token}` : "";

  const handlePublish = () => {
    publish.mutate({ title, contactNote, items, existingToken: share?.token ?? null });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  const handleDelete = () => {
    del.mutate(undefined, { onSuccess: () => setConfirmStop(false) });
  };

  const inputClass =
    "w-full rounded-lg border border-[var(--border-light)] bg-[var(--elevated)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-border)]";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        className="fixed inset-x-4 top-[12vh] z-50 mx-auto max-w-md rounded-2xl bg-[var(--surface)] p-5 shadow-xl md:inset-x-auto md:w-[420px]"
      >
        <div className="flex items-center justify-between">
          <h2 id="share-modal-title" className="text-lg font-bold">
            {share ? "Your sell list is shared" : "Share your sell list"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--elevated)]"
          >
            <X size={18} />
          </button>
        </div>

        {!share && (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-[var(--text-secondary)]">
              Publishes a public, read-only snapshot of your {items.length} sellable cards and
              their current prices. Anyone with the link can view it — no login needed.
            </p>
            <div>
              <label htmlFor="share-title" className="mb-1 block text-xs text-[var(--text-muted)]">Page title (optional)</label>
              <input
                id="share-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                placeholder="e.g. Marcus's Digimon for sale"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="share-contact" className="mb-1 block text-xs text-[var(--text-muted)]">Contact note (optional)</label>
              <input
                id="share-contact"
                value={contactNote}
                onChange={(e) => setContactNote(e.target.value)}
                maxLength={140}
                placeholder="e.g. DM me on Discord @marcus"
                className={inputClass}
              />
            </div>
            <button
              onClick={handlePublish}
              disabled={publish.isPending || items.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--background)] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-40"
            >
              {publish.isPending && <Loader2 size={15} className="animate-spin" />}
              Publish &amp; get link
            </button>
          </div>
        )}

        {share && (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-[var(--text-secondary)]">
              Snapshot of {share.payload.length} cards · prices frozen at publish time.
            </p>

            <div>
              <label className="mb-1 block text-xs text-[var(--text-muted)]">Public link</label>
              <div className="flex items-center gap-2 rounded-lg border border-[var(--border-light)] bg-[var(--elevated)] px-3 py-2">
                <span className="flex-1 truncate text-sm text-[var(--text-secondary)]">{shareUrl}</span>
                <button onClick={handleCopy} className="flex items-center gap-1 text-sm font-medium text-[var(--accent)]">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="share-title-edit" className="mb-1 block text-xs text-[var(--text-muted)]">Page title</label>
              <input id="share-title-edit" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} className={inputClass} />
            </div>
            <div>
              <label htmlFor="share-contact-edit" className="mb-1 block text-xs text-[var(--text-muted)]">Contact note</label>
              <input id="share-contact-edit" value={contactNote} onChange={(e) => setContactNote(e.target.value)} maxLength={140} className={inputClass} />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handlePublish}
                disabled={publish.isPending}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--border-light)] py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--elevated)] disabled:opacity-40"
              >
                {publish.isPending && <Loader2 size={14} className="animate-spin" />}
                Update snapshot
              </button>
              <a
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--border-light)] py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--elevated)]"
              >
                Open <ExternalLink size={14} />
              </a>
            </div>

            {!confirmStop ? (
              <button
                onClick={() => setConfirmStop(true)}
                className="w-full rounded-lg border border-[var(--red-border)] py-2 text-sm text-[var(--red)] transition-colors hover:bg-[var(--red-translucent)]"
              >
                Stop sharing
              </button>
            ) : (
              <div className="rounded-lg border border-[var(--red-border)] bg-[var(--red-translucent)] p-3">
                <p className="text-sm text-[var(--text-secondary)]">
                  Delete the public link? It will stop working immediately.
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => setConfirmStop(false)}
                    className="flex-1 rounded-lg border border-[var(--border-light)] py-1.5 text-sm text-[var(--text-secondary)]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={del.isPending}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--red)] py-1.5 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    {del.isPending && <Loader2 size={14} className="animate-spin" />}
                    Stop sharing
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
