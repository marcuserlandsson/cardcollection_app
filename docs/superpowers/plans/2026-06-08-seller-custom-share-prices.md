# Seller-Set Custom Share Prices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the seller set an editable asking price per card in the Share modal; the published snapshot stores those prices and the public page presents them as the seller's asking prices.

**Architecture:** No schema change — prices live in the existing `sell_shares.payload`. A pure `parsePrice` parses input strings; `buildSharePayload(items, prices)` takes a resolved price map; the Share modal seeds an editable price map once per open (last-published price → Cardtrader market → empty) and passes it through `usePublishSellShare`. A new `SharePriceEditor` renders the per-card inputs.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, TanStack Query v5, Supabase, Lucide React, Vitest.

---

## File Structure

**New files:**
- `lib/share-price.ts` (+ `.test.ts`) — pure `parsePrice(input): number | null`.
- `components/sell/share-price-editor.tsx` — the per-card price input list.

**Modified files:**
- `lib/sell-share-payload.ts` (+ `.test.ts`) — `buildSharePayload(items, prices)`.
- `lib/hooks/use-sell-share.ts` — `usePublishSellShare` accepts/forwards `prices`.
- `components/sell/share-modal.tsx` — price-map state, seeding, editor, publish wiring.
- `app/s/[token]/page.tsx` — footer text.

---

## Task 1: `parsePrice` pure helper (TDD)

**Files:**
- Create: `lib/share-price.ts`
- Create: `lib/share-price.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from "vitest";
import { parsePrice } from "@/lib/share-price";

describe("parsePrice", () => {
  it("parses a decimal string", () => {
    expect(parsePrice("19.99")).toBe(19.99);
  });
  it("accepts a comma decimal separator", () => {
    expect(parsePrice("1,50")).toBe(1.5);
  });
  it("parses an integer string", () => {
    expect(parsePrice("5")).toBe(5);
  });
  it("returns null for empty or whitespace input", () => {
    expect(parsePrice("")).toBeNull();
    expect(parsePrice("   ")).toBeNull();
  });
  it("returns null for non-numeric input", () => {
    expect(parsePrice("abc")).toBeNull();
  });
  it("returns null for negative numbers", () => {
    expect(parsePrice("-3")).toBeNull();
  });
  it("rounds to two decimals", () => {
    expect(parsePrice("2.999")).toBe(3);
    expect(parsePrice("10.126")).toBe(10.13);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `@/lib/share-price`.

- [ ] **Step 3: Implement `lib/share-price.ts`**

```ts
/**
 * Parses a user-entered price string into a number, or null.
 * - Trims; empty -> null.
 * - Accepts a comma decimal separator (normalised to a dot).
 * - Non-numeric or negative -> null.
 * - Rounds to 2 decimals.
 */
export function parsePrice(input: string): number | null {
  const trimmed = input.trim().replace(",", ".");
  if (trimmed === "") return null;
  const n = Number.parseFloat(trimmed);
  if (Number.isNaN(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/share-price.ts lib/share-price.test.ts
git commit -m "feat: add parsePrice helper"
```

---

## Task 2: `SharePriceEditor` component

**Files:**
- Create: `components/sell/share-price-editor.tsx`

- [ ] **Step 1: Create the component with EXACTLY this content**

```tsx
"use client";

import type { SellableCard } from "@/lib/types";

interface SharePriceEditorProps {
  items: SellableCard[];
  prices: Record<string, string>;
  onChange: (cardNumber: string, value: string) => void;
}

export default function SharePriceEditor({ items, prices, onChange }: SharePriceEditorProps) {
  return (
    <div>
      <p className="mb-1 text-xs text-[var(--text-muted)]">Asking price per card</p>
      <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--elevated)] p-2">
        {items.map((item) => {
          const market = item.price?.price_low ?? item.price?.price_trend ?? null;
          return (
            <div key={item.card.card_number} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-[var(--text-primary)]">
                  {item.card.name}
                  {item.card.variant_name !== "Regular" && (
                    <span className="text-[var(--text-muted)]"> · {item.card.variant_name}</span>
                  )}
                </p>
                <p className="text-[10px] text-[var(--text-dim)]">
                  {item.card.card_number}
                  {market !== null && ` · mkt €${market.toFixed(2)}`}
                </p>
              </div>
              <div className="flex flex-none items-center gap-1 rounded-lg border border-[var(--border-light)] bg-[var(--surface)] px-2 py-1">
                <span className="text-xs text-[var(--text-muted)]">€</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={prices[item.card.card_number] ?? ""}
                  onChange={(e) => onChange(item.card.card_number, e.target.value)}
                  placeholder={market !== null ? market.toFixed(2) : "—"}
                  aria-label={`Asking price for ${item.card.name}`}
                  className="w-16 bg-transparent text-right text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-dim)]"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Lint + type-check**

Run: `npm run lint`
Then: `npx tsc --noEmit`
Expected: no errors for the new file.

- [ ] **Step 3: Commit**

```bash
git add components/sell/share-price-editor.tsx
git commit -m "feat: add SharePriceEditor"
```

---

## Task 3: Wire seller prices through payload, hook, and modal

This is one cohesive change: `buildSharePayload` gains a required `prices` map, the publish hook forwards it, and the modal collects/seeds the prices. They move together so the build stays green.

**Files:**
- Modify: `lib/sell-share-payload.ts`
- Modify (overwrite): `lib/sell-share-payload.test.ts`
- Modify: `lib/hooks/use-sell-share.ts`
- Modify (overwrite): `components/sell/share-modal.tsx`

- [ ] **Step 1: Overwrite `lib/sell-share-payload.test.ts` with the new tests**

```ts
import { describe, it, expect } from "vitest";
import { buildSharePayload } from "@/lib/sell-share-payload";
import type { Card, SellableCard } from "@/lib/types";

function makeCard(card_number: string, name: string, variant_name = "Regular", image_url: string | null = null): Card {
  return {
    card_number,
    name,
    expansion: "BT09",
    card_type: "Digimon",
    color: "Red",
    rarity: "C",
    dp: null,
    play_cost: null,
    level: null,
    evolution_cost: null,
    image_url,
    pretty_url: null,
    max_copies: 4,
    last_updated: "",
    base_card_number: card_number,
    variant_name,
  };
}

function makeSellable(partial: Partial<SellableCard> & { card: Card }): SellableCard {
  return {
    owned: 0,
    needed: 4,
    surplus: 0,
    price: null,
    total_value: null,
    source: "surplus",
    spike_pct: null,
    outlier_low: false,
    ...partial,
  };
}

describe("buildSharePayload", () => {
  it("takes the price from the provided price map", () => {
    const card = makeCard("BT9-009", "WarGreymon", "Regular", "http://img/wg.png");
    const items = [makeSellable({ card, owned: 5, surplus: 3 })];
    expect(buildSharePayload(items, { "BT9-009": 12.5 })).toEqual([
      {
        card_number: "BT9-009",
        name: "WarGreymon",
        variant_name: "Regular",
        image_url: "http://img/wg.png",
        quantity: 3,
        price: 12.5,
      },
    ]);
  });

  it("uses null when the card is absent from the price map", () => {
    const items = [makeSellable({ card: makeCard("BT9-010", "Tyrannomon"), owned: 1, surplus: 1 })];
    expect(buildSharePayload(items, {})[0].price).toBeNull();
  });

  it("uses owned quantity when surplus is 0, and surplus otherwise", () => {
    const a = makeSellable({ card: makeCard("A", "A"), owned: 2, surplus: 0 });
    const b = makeSellable({ card: makeCard("B", "B"), owned: 5, surplus: 3 });
    const out = buildSharePayload([a, b], { A: 1, B: 1 });
    expect(out[0].quantity).toBe(2);
    expect(out[1].quantity).toBe(3);
  });

  it("passes through variant name and image_url", () => {
    const items = [makeSellable({ card: makeCard("BT9-008", "Greymon", "Alt Art", "http://img/g.png"), owned: 1, surplus: 1 })];
    expect(buildSharePayload(items, { "BT9-008": 56 })[0]).toMatchObject({
      variant_name: "Alt Art",
      image_url: "http://img/g.png",
    });
  });

  it("returns an empty array for empty input", () => {
    expect(buildSharePayload([], {})).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify the new tests fail**

Run: `npm test`
Expected: FAIL — `buildSharePayload` is still called with one argument / old shape.

- [ ] **Step 3: Update `lib/sell-share-payload.ts`**

Replace the whole file with:
```ts
import type { SellableCard, SellSharePayloadItem } from "./types";

/**
 * Builds the frozen snapshot items for a public share. The seller's asking
 * price per card comes from the supplied `prices` map (card_number -> price);
 * a card absent from the map (or mapped to null) is published with no price.
 */
export function buildSharePayload(
  items: SellableCard[],
  prices: Record<string, number | null>,
): SellSharePayloadItem[] {
  return items.map((item) => ({
    card_number: item.card.card_number,
    name: item.card.name,
    variant_name: item.card.variant_name,
    image_url: item.card.image_url,
    quantity: item.surplus > 0 ? item.surplus : item.owned,
    price: prices[item.card.card_number] ?? null,
  }));
}
```

- [ ] **Step 4: Update `lib/hooks/use-sell-share.ts` — add `prices` to the publish mutation**

In `usePublishSellShare`, change the mutation argument type and the `buildSharePayload` call. Replace:
```ts
    mutationFn: async ({
      title,
      contactNote,
      items,
      existingToken,
    }: {
      title: string;
      contactNote: string;
      items: SellableCard[];
      existingToken: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const token = existingToken ?? generateShareToken();
      const { error } = await supabase.from("sell_shares").upsert({
        user_id: user.id,
        token,
        title: title.trim() || null,
        contact_note: contactNote.trim() || null,
        payload: buildSharePayload(items),
        updated_at: new Date().toISOString(),
      });
```
with:
```ts
    mutationFn: async ({
      title,
      contactNote,
      items,
      prices,
      existingToken,
    }: {
      title: string;
      contactNote: string;
      items: SellableCard[];
      prices: Record<string, number | null>;
      existingToken: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const token = existingToken ?? generateShareToken();
      const { error } = await supabase.from("sell_shares").upsert({
        user_id: user.id,
        token,
        title: title.trim() || null,
        contact_note: contactNote.trim() || null,
        payload: buildSharePayload(items, prices),
        updated_at: new Date().toISOString(),
      });
```

- [ ] **Step 5: Overwrite `components/sell/share-modal.tsx` with EXACTLY this content**

```tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { X, Copy, Check, ExternalLink, Loader2 } from "lucide-react";
import {
  useSellShare,
  usePublishSellShare,
  useDeleteSellShare,
} from "@/lib/hooks/use-sell-share";
import { parsePrice } from "@/lib/share-price";
import SharePriceEditor from "@/components/sell/share-price-editor";
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
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);

  // Seed the form once per open (after the share query has fetched and the
  // sellable cards are loaded) so existing values load even if data was still
  // in flight when the modal opened, and so a later background refetch never
  // clobbers an in-progress edit. Each price input is prefilled from the
  // last-published price for that card, else the Cardtrader market price.
  const seededRef = useRef(false);
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) {
      seededRef.current = false;
      return;
    }
    if (!seededRef.current && shareFetched && items.length > 0) {
      setTitle(share?.title ?? "");
      setContactNote(share?.contact_note ?? "");
      setConfirmStop(false);
      setCopied(false);

      const publishedByCard = new Map(
        (share?.payload ?? []).map((p) => [p.card_number, p.price]),
      );
      const seeded: Record<string, string> = {};
      for (const item of items) {
        const market = item.price?.price_low ?? item.price?.price_trend ?? null;
        const initial = publishedByCard.has(item.card.card_number)
          ? publishedByCard.get(item.card.card_number) ?? null
          : market;
        seeded[item.card.card_number] = initial != null ? String(initial) : "";
      }
      setPrices(seeded);

      seededRef.current = true;
    }
  }, [open, shareFetched, share, items]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!open) return null;

  const shareUrl = share ? `${window.location.origin}/s/${share.token}` : "";

  const handlePriceChange = (cardNumber: string, value: string) => {
    setPrices((prev) => ({ ...prev, [cardNumber]: value }));
  };

  const handlePublish = () => {
    const priceMap: Record<string, number | null> = {};
    for (const item of items) {
      priceMap[item.card.card_number] = parsePrice(prices[item.card.card_number] ?? "");
    }
    publish.mutate({ title, contactNote, items, prices: priceMap, existingToken: share?.token ?? null });
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
              Publishes a public, read-only snapshot of your {items.length} sellable cards. Set
              your asking prices below. Anyone with the link can view it — no login needed.
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
            <SharePriceEditor items={items} prices={prices} onChange={handlePriceChange} />
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
              Snapshot of {share.payload.length} cards · your asking prices.
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

            <SharePriceEditor items={items} prices={prices} onChange={handlePriceChange} />

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
```

- [ ] **Step 6: Run lint + type-check + tests**

Run: `npm run lint` — expect no errors.
Run: `npx tsc --noEmit` — expect no errors.
Run: `npm test` — expect all tests pass (the new `buildSharePayload` tests included).

- [ ] **Step 7: Commit**

```bash
git add lib/sell-share-payload.ts lib/sell-share-payload.test.ts lib/hooks/use-sell-share.ts components/sell/share-modal.tsx
git commit -m "feat: seller-set asking prices in the share modal"
```

---

## Task 4: Public page footer wording

**Files:**
- Modify: `app/s/[token]/page.tsx`

- [ ] **Step 1: Update the footer label**

Replace:
```tsx
        <span>Prices via Cardtrader</span>
```
with:
```tsx
        <span>Asking prices set by seller</span>
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Manual smoke test (migration 008 already applied)**

Run `npm run dev`, sign in, open `/sell` → Share:
- The modal shows a scrollable "Asking price per card" list with € inputs prefilled from the market price (first publish).
- Change one price, clear another, Publish.
- Open the `/s/{token}` link: the changed price shows, the cleared one shows "—", and the footer reads "Asking prices set by seller".
- Re-open Share: the price inputs prefill with what you just published (not the market price).

- [ ] **Step 4: Commit**

```bash
git add app/s/[token]/page.tsx
git commit -m "fix: public share footer reads asking prices set by seller"
```

---

## Self-Review

**Spec coverage:**
- Editable per-card price in the Share modal, both states → Tasks 2, 3 (`SharePriceEditor` rendered in both branches). ✅
- Prefill: last-published price → market → empty → Task 3 seed logic (`publishedByCard.has` preserves a deliberately-cleared price). ✅
- Clearing ⇒ no price (null → "—") → `parsePrice("")` = null (Task 1) + payload null (Task 3). ✅
- No schema change; prices in `payload` → Task 3 (no migration). ✅
- `buildSharePayload(items, prices)` pure mapper → Task 3. ✅
- `usePublishSellShare` forwards `prices` → Task 3 Step 4. ✅
- `parsePrice` (empty/invalid/negative ⇒ null, comma, rounding) → Task 1. ✅
- Footer "Asking prices set by seller" → Task 4. ✅
- Out of scope (Copy/CSV custom prices, reset-to-market button, overrides table) → not implemented. ✅

**Placeholder scan:** No TBD/TODO; every code step is complete. ✅

**Type consistency:** `parsePrice(input: string): number | null` (Task 1) used in the modal (Task 3). `buildSharePayload(items, prices: Record<string, number | null>)` (Task 3 Step 3) matches the hook call (Step 4) and the publish mutation arg shape `{ title, contactNote, items, prices, existingToken }` matches `handlePublish` (Step 5). `SharePriceEditor` props `{ items, prices: Record<string,string>, onChange(cardNumber, value) }` (Task 2) match the modal usage (Task 3). The modal holds prices as strings and converts via `parsePrice` to `Record<string, number | null>` for publish — consistent. ✅
