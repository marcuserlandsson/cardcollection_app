# Copy Sell List as Text Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Copy list" button to the sell page that copies the currently-filtered sellable cards to the clipboard as a marketplace-ready text block (one line per card, no total, no footer).

**Architecture:** A pure `formatSellListText(items)` function in `lib/` (unit-tested, mirrors the CSV export's quantity/price choices), a small `CopyListButton` client component owning the clipboard call and a transient copied/error state, wired into `app/sell/page.tsx` beside the existing "Export CSV" button using the same `filteredCards`.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Lucide React, Vitest (already configured).

---

## File Structure

**New files:**
- `lib/share-text.ts` — pure `formatSellListText(items: SellableCard[]): string`.
- `lib/share-text.test.ts` — its Vitest tests.
- `components/sell/copy-list-button.tsx` — the button + clipboard logic + transient state.

**Modified files:**
- `app/sell/page.tsx` — render `<CopyListButton items={filteredCards} />` next to "Export CSV".

**Reused (unchanged):** `lib/types.ts` (`SellableCard`, `Card`, `CardPrice`).

---

## Task 1: `formatSellListText` pure logic (TDD)

**Files:**
- Create: `lib/share-text.ts`
- Create: `lib/share-text.test.ts`

Output format, one line per card (no total, no footer):
```
{qty}x {name}[ · {variant}] ({card_number})[ — €{price} each]
```
- Quantity = `surplus > 0 ? surplus : owned`.
- Price = `price_low ?? price_trend`; if null, omit the ` — €… each` segment.
- Variant suffix ` · {variant_name}` only when `variant_name !== "Regular"`.
- Empty list → `""`.

- [ ] **Step 1: Write the failing tests** — create `lib/share-text.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { formatSellListText } from "@/lib/share-text";
import type { Card, CardPrice, SellableCard } from "@/lib/types";

function makeCard(card_number: string, name: string, variant_name = "Regular"): Card {
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
    image_url: null,
    pretty_url: null,
    max_copies: 4,
    last_updated: "",
    base_card_number: card_number,
    variant_name,
  };
}

function makePrice(price_low: number | null, price_trend: number | null = null): CardPrice {
  return {
    card_number: "x",
    price_avg: null,
    price_low,
    price_trend,
    fetched_at: "",
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

describe("formatSellListText", () => {
  it("uses surplus as the quantity when surplus > 0", () => {
    const items = [
      makeSellable({ card: makeCard("BT9-009", "WarGreymon"), owned: 5, surplus: 3, price: makePrice(19.99) }),
    ];
    expect(formatSellListText(items)).toBe("3x WarGreymon (BT9-009) — €19.99 each");
  });

  it("falls back to owned quantity when surplus is 0", () => {
    const items = [
      makeSellable({ card: makeCard("BT9-007", "Agumon"), owned: 2, surplus: 0, price: makePrice(1.5) }),
    ];
    expect(formatSellListText(items)).toBe("2x Agumon (BT9-007) — €1.50 each");
  });

  it("appends the variant name only for non-Regular variants", () => {
    const items = [
      makeSellable({ card: makeCard("BT9-008", "Greymon", "Alt Art"), owned: 1, surplus: 1, price: makePrice(56) }),
    ];
    expect(formatSellListText(items)).toBe("1x Greymon · Alt Art (BT9-008) — €56.00 each");
  });

  it("omits the price segment when there is no price", () => {
    const items = [
      makeSellable({ card: makeCard("BT9-010", "Tyrannomon"), owned: 1, surplus: 1, price: null }),
    ];
    expect(formatSellListText(items)).toBe("1x Tyrannomon (BT9-010)");
  });

  it("falls back to price_trend when price_low is null", () => {
    const items = [
      makeSellable({ card: makeCard("BT9-011", "Meramon"), owned: 1, surplus: 1, price: makePrice(null, 4.25) }),
    ];
    expect(formatSellListText(items)).toBe("1x Meramon (BT9-011) — €4.25 each");
  });

  it("joins multiple cards with newlines and emits no total or footer", () => {
    const items = [
      makeSellable({ card: makeCard("BT9-009", "WarGreymon"), owned: 3, surplus: 3, price: makePrice(19.99) }),
      makeSellable({ card: makeCard("BT9-007", "Agumon"), owned: 2, surplus: 2, price: makePrice(1.5) }),
    ];
    expect(formatSellListText(items)).toBe(
      "3x WarGreymon (BT9-009) — €19.99 each\n2x Agumon (BT9-007) — €1.50 each",
    );
  });

  it("returns an empty string for an empty list", () => {
    expect(formatSellListText([])).toBe("");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `@/lib/share-text`.

- [ ] **Step 3: Implement `lib/share-text.ts`**

```ts
import type { SellableCard } from "./types";

/**
 * Formats sellable cards as a marketplace-ready text block, one line per card:
 *   {qty}x {name}[ · {variant}] ({card_number})[ — €{price} each]
 * Quantity and price mirror the CSV export (generateSellCsv) so the two agree.
 * No total line and no footer — the sell page shows the aggregate separately.
 */
export function formatSellListText(items: SellableCard[]): string {
  return items
    .map((item) => {
      const qty = item.surplus > 0 ? item.surplus : item.owned;
      const variant =
        item.card.variant_name !== "Regular" ? ` · ${item.card.variant_name}` : "";
      const price = item.price?.price_low ?? item.price?.price_trend ?? null;
      const pricePart = price !== null ? ` — €${price.toFixed(2)} each` : "";
      return `${qty}x ${item.card.name}${variant} (${item.card.card_number})${pricePart}`;
    })
    .join("\n");
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test`
Expected: PASS — all `share-text` tests green (plus the existing suites).

- [ ] **Step 5: Commit**

```bash
git add lib/share-text.ts lib/share-text.test.ts
git commit -m "feat: add formatSellListText for copying the sell list"
```

---

## Task 2: `CopyListButton` component

**Files:**
- Create: `components/sell/copy-list-button.tsx`

Styled like the existing "Export CSV" button (bordered, `--text-secondary`). Owns the clipboard call and a transient state: idle → copied/error → idle after 2s. Disabled when the list is empty.

- [ ] **Step 1: Create the component with EXACTLY this content**

```tsx
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
```

- [ ] **Step 2: Lint + type-check**

Run: `npm run lint`
Then: `npx tsc --noEmit`
Expected: No errors for the new file.

- [ ] **Step 3: Commit**

```bash
git add components/sell/copy-list-button.tsx
git commit -m "feat: add CopyListButton for the sell page"
```

---

## Task 3: Wire `CopyListButton` into the sell page

**Files:**
- Modify: `app/sell/page.tsx`

The sell page header currently renders `SellSummary` on the left and an "Export CSV" `<button>` on the right inside a `flex items-start justify-between` container. Add the copy button beside Export CSV, sharing the same `filteredCards`.

- [ ] **Step 1: Add the import**

After the existing import line:
```tsx
import SellCardRow from "@/components/sell/sell-card-row";
```
add:
```tsx
import CopyListButton from "@/components/sell/copy-list-button";
```

- [ ] **Step 2: Wrap the two buttons in a flex group**

Replace this block:
```tsx
        <div className="flex items-start justify-between">
          <SellSummary surplusCount={totalSurplus} totalValue={totalValue > 0 ? totalValue : null} />
          <button
            onClick={handleExport}
            disabled={filteredCards.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--elevated)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={15} />
            Export CSV
          </button>
        </div>
```
with:
```tsx
        <div className="flex items-start justify-between">
          <SellSummary surplusCount={totalSurplus} totalValue={totalValue > 0 ? totalValue : null} />
          <div className="flex items-center gap-2">
            <CopyListButton items={filteredCards} />
            <button
              onClick={handleExport}
              disabled={filteredCards.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--elevated)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download size={15} />
              Export CSV
            </button>
          </div>
        </div>
```

- [ ] **Step 3: Lint + build + test**

Run: `npm run lint` — expect no errors.
Run: `npm run build` — expect success.
Run: `npm test` — expect all unit tests pass.

- [ ] **Step 4: Manual smoke test**

Run `npm run dev`, sign in, open `/sell`:
- Confirm a "Copy list" button sits beside "Export CSV".
- Click it → label briefly shows "Copied!"; paste into a text editor and verify the lines match the on-screen rows (qty, name, variant for alt arts, card number, `€x.xx each`).
- Switch filter chips (Surplus / Sell-list / Spiked) → copied content reflects the active filter.
- With an empty filtered list, the button is disabled.

- [ ] **Step 5: Commit**

```bash
git add app/sell/page.tsx
git commit -m "feat: add Copy list button to the sell page"
```

---

## Self-Review

**Spec coverage:**
- "Copy list" button copying filtered sellable cards → Tasks 2, 3. ✅
- Respects the active filter (shares `filteredCards` with Export CSV) → Task 3. ✅
- Marketplace line format, quantity = surplus/owned, price = low/trend, variant suffix for non-Regular, missing-price handling, no total/footer, empty → "" → Task 1. ✅
- Transient "Copied!" + graceful "Copy failed" + disabled-when-empty → Task 2. ✅
- Text/CSV agree on quantity & price (shared conventions) → Task 1 mirrors `generateSellCsv`. ✅
- No backend / schema change → none introduced. ✅
- Out of scope (public page, image, configurable formats) → not implemented. ✅

**Placeholder scan:** No TBD/TODO/"handle edge cases"; every code step is complete. ✅

**Type consistency:** `formatSellListText(items: SellableCard[]): string` defined in Task 1, imported unchanged in Task 2; `CopyListButton({ items: SellableCard[] })` defined in Task 2, used with `items={filteredCards}` in Task 3 (`filteredCards` is `SellableCard[]`). ✅
