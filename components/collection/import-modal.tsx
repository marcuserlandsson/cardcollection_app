"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { parseCardList, parseCSV } from "@/lib/import-parser";
import { useUpdateQuantity } from "@/lib/hooks/use-collection";
import { useCollectionMap } from "@/lib/hooks/use-collection";
import { useUpdateDeckCard } from "@/lib/hooks/use-decks";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { X, Upload, ClipboardPaste, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { ParsedCard, ParseError } from "@/lib/import-parser";

const supabase = createClient();

type Tab = "paste" | "csv";
type Stage = "input" | "preview" | "importing" | "done";

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  /** When provided, imports cards into this deck instead of the collection */
  deckId?: string;
}

export default function ImportModal({ open, onClose, deckId }: ImportModalProps) {
  const [tab, setTab] = useState<Tab>("paste");
  const [stage, setStage] = useState<Stage>("input");
  const [textInput, setTextInput] = useState("");
  const [validated, setValidated] = useState<ParsedCard[]>([]);
  const [unknownCards, setUnknownCards] = useState<string[]>([]);
  const [parseErrors, setParseErrors] = useState<ParseError[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateQuantity = useUpdateQuantity();
  const updateDeckCard = useUpdateDeckCard();
  const quantities = useCollectionMap();

  const isDeckImport = !!deckId;

  const { data: knownCards } = useQuery<Set<string>>({
    queryKey: ["all-card-numbers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cards").select("card_number");
      if (error) throw error;
      return new Set((data as { card_number: string }[]).map((c) => c.card_number));
    },
    staleTime: 5 * 60 * 1000,
  });

  const resetState = useCallback(() => {
    setStage("input");
    setTextInput("");
    setValidated([]);
    setUnknownCards([]);
    setParseErrors([]);
    setImportedCount(0);
    setImportProgress(0);
    setTab("paste");
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    if (open) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleClose]);

  const validateParsed = useCallback(
    (parsed: ParsedCard[]) => {
      if (knownCards) {
        const valid: ParsedCard[] = [];
        const unknown: string[] = [];
        for (const entry of parsed) {
          if (knownCards.has(entry.cardNumber)) {
            valid.push(entry);
          } else {
            unknown.push(entry.cardNumber);
          }
        }
        setValidated(valid);
        setUnknownCards(unknown);
      } else {
        setValidated(parsed);
        setUnknownCards([]);
      }
    },
    [knownCards]
  );

  const handleParse = useCallback(() => {
    const result = parseCardList(textInput);
    setParseErrors(result.errors);
    validateParsed(result.parsed);
    setStage("preview");
  }, [textInput, validateParsed]);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const csvText = event.target?.result as string;
        const result = parseCSV(csvText);
        setParseErrors(result.errors);
        validateParsed(result.parsed);
        setStage("preview");
      };
      reader.readAsText(file);
    },
    [validateParsed]
  );

  const handleImport = useCallback(async () => {
    setStage("importing");
    let imported = 0;
    for (const entry of validated) {
      if (isDeckImport) {
        await updateDeckCard.mutateAsync({
          deckId: deckId!,
          cardNumber: entry.cardNumber,
          quantity: entry.quantity,
        });
      } else {
        const currentQty = quantities.get(entry.cardNumber) ?? 0;
        await updateQuantity.mutateAsync({
          cardNumber: entry.cardNumber,
          quantity: currentQty + entry.quantity,
        });
      }
      imported++;
      setImportProgress(Math.round((imported / validated.length) * 100));
    }
    setImportedCount(imported);
    setStage("done");
  }, [validated, quantities, updateQuantity, updateDeckCard, isDeckImport, deckId]);

  if (!open) return null;

  const title = isDeckImport ? "Import Deck List" : "Import Cards";
  const previewHint = isDeckImport
    ? "This will set the deck contents to the imported list."
    : "Quantities will be added to your existing collection.";
  const doneMessage = isDeckImport
    ? `Imported ${importedCount} cards into deck`
    : `Added ${importedCount} cards to your collection`;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={handleClose} />
      <div className="fixed inset-x-4 top-[10vh] z-50 mx-auto max-w-lg rounded-2xl bg-[var(--surface)] p-5 shadow-xl md:inset-x-auto md:w-[480px]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={handleClose} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--elevated)]">
            <X size={18} />
          </button>
        </div>

        {stage === "input" && (
          <div className="mt-4">
            <div className="flex gap-1 rounded-lg bg-[var(--elevated)] p-0.5">
              <button
                onClick={() => setTab("paste")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === "paste"
                    ? "bg-[var(--accent)] text-[var(--background)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                <ClipboardPaste size={14} />
                Paste Text
              </button>
              <button
                onClick={() => setTab("csv")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === "csv"
                    ? "bg-[var(--accent)] text-[var(--background)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Upload size={14} />
                Upload CSV
              </button>
            </div>

            {tab === "paste" && (
              <div className="mt-3">
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={"BT1-001 3\nBT1-002 x2\nBT3-015\n# Lines starting with # are ignored"}
                  className="h-48 w-full resize-none rounded-xl border border-[var(--border-light)] bg-[var(--elevated)] p-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-dim)] focus:border-[var(--accent-border)] focus:outline-none"
                />
                <button
                  onClick={handleParse}
                  disabled={textInput.trim() === ""}
                  className="mt-3 w-full rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--background)] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-40"
                >
                  Preview Import
                </button>
              </div>
            )}

            {tab === "csv" && (
              <div className="mt-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[var(--border-light)] p-8 text-[var(--text-muted)] transition-colors hover:border-[var(--accent-border)] hover:text-[var(--text-secondary)]"
                >
                  <Upload size={24} />
                  <span className="text-sm font-medium">Click to upload .csv or .txt</span>
                  <span className="text-xs text-[var(--text-dim)]">Columns: card_number, quantity</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            )}
          </div>
        )}

        {stage === "preview" && (
          <div className="mt-4">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 size={16} className="text-[var(--green)]" />
              <span>
                <strong>{validated.length}</strong> cards recognized
              </span>
              {(unknownCards.length > 0 || parseErrors.length > 0) && (
                <>
                  <span className="text-[var(--text-dim)]">|</span>
                  <AlertCircle size={16} className="text-[var(--red)]" />
                  <span className="text-[var(--red)]">
                    {unknownCards.length + parseErrors.length} errors
                  </span>
                </>
              )}
            </div>

            <div className="mt-3 max-h-60 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--elevated)] p-3">
              {validated.map((entry) => (
                <div key={entry.cardNumber} className="flex items-center justify-between py-1 text-sm">
                  <span className="text-[var(--text-primary)]">{entry.cardNumber}</span>
                  <span className="text-[var(--text-muted)]">x{entry.quantity}</span>
                </div>
              ))}
              {unknownCards.map((cn) => (
                <div key={cn} className="flex items-center justify-between py-1 text-sm">
                  <span className="text-[var(--red)]">{cn}</span>
                  <span className="text-xs text-[var(--red)]">Unknown card</span>
                </div>
              ))}
              {parseErrors.map((err, i) => (
                <div key={i} className="flex items-center justify-between py-1 text-sm">
                  <span className="truncate text-[var(--red)]">{err.line}</span>
                  <span className="ml-2 shrink-0 text-xs text-[var(--red)]">{err.reason}</span>
                </div>
              ))}
            </div>

            <p className="mt-2 text-xs text-[var(--text-dim)]">
              {previewHint}
            </p>

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setStage("input")}
                className="flex-1 rounded-xl border border-[var(--border-light)] bg-[var(--elevated)] py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={validated.length === 0}
                className="flex-1 rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--background)] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-40"
              >
                Import {validated.length} cards
              </button>
            </div>
          </div>
        )}

        {stage === "importing" && (
          <div className="mt-4 flex flex-col items-center py-8">
            <Loader2 size={28} className="animate-spin text-[var(--accent)]" />
            <p className="mt-3 text-sm text-[var(--text-secondary)]">Importing cards... {importProgress}%</p>
            <div className="mt-2 h-1.5 w-48 overflow-hidden rounded-full bg-[var(--elevated)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all"
                style={{ width: `${importProgress}%` }}
              />
            </div>
          </div>
        )}

        {stage === "done" && (
          <div className="mt-4 flex flex-col items-center py-8">
            <CheckCircle2 size={32} className="text-[var(--green)]" />
            <p className="mt-3 text-sm font-medium">
              {doneMessage}
            </p>
            <button
              onClick={handleClose}
              className="mt-4 rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-[var(--background)] transition-colors hover:bg-[var(--accent-hover)]"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </>
  );
}
