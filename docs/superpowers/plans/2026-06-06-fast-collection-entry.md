# Fast Collection Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated `/collection/add` surface that makes documenting a physical pile of cards fast, with three input modes (search & add, set checklist, paste) sharing a live session tray and a list/grid view toggle.

**Architecture:** A new client page under the already-auth-guarded `/collection` route hosts a mode switcher and a shared session tray. All writes go through the existing `useUpdateQuantity` hook (immediate upsert — no batch state to lose). Pure logic (set-checklist filtering, session tally) is extracted into `lib/` modules and unit-tested with Vitest. UI components reuse existing card/collection components. No database schema change — alt-art variants are already separate `cards` rows, so they appear as distinct entries automatically.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, TanStack Query v5, Lucide React, Supabase, Vitest (new).

---

## File Structure

**New files:**
- `vitest.config.ts` — Vitest config with `@/` path alias.
- `lib/collection-entry.ts` — pure checklist filter/stats logic.
- `lib/collection-entry.test.ts` — its tests.
- `lib/session-tally.ts` — pure session-tray reducer.
- `lib/session-tally.test.ts` — its tests.
- `lib/import-parser.test.ts` — characterization tests for existing parser.
- `lib/hooks/use-entry-session.ts` — React hook tying adjustments to collection writes + session state.
- `components/cards/view-toggle.tsx` — shared list/grid toggle (exports `CardView` type).
- `components/collection/entry-card-row.tsx` — a list row with thumbnail + stepper.
- `components/collection/entry-session-tray.tsx` — running session list + undo.
- `components/collection/add-mode-tabs.tsx` — Search/Checklist/Paste switcher (exports `AddMode` type).
- `components/collection/entry-search.tsx` — search & add mode.
- `components/collection/set-checklist.tsx` — set checklist mode.
- `app/collection/add/page.tsx` — the add surface assembling all of the above.

**Modified files:**
- `package.json` — add `vitest` devDep + `test` script.
- `app/collection/page.tsx` — replace the Import button with an "Add cards" link; remove the inline `ImportModal`.

**Unchanged but reused:** `components/collection/quantity-control.tsx`, `components/collection/import-modal.tsx`, `components/cards/card-search-bar.tsx`, `components/cards/card-grid.tsx`, `components/cards/card-image.tsx`, `lib/import-parser.ts`, `lib/hooks/use-cards.ts`, `lib/hooks/use-collection.ts`.

---

## Task 1: Set up the Vitest test harness

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `lib/session-tally.test.ts` (temporary sanity test, replaced in Task 4)

- [ ] **Step 1: Install Vitest**

Run: `npm install -D vitest@^3`
Expected: `package.json` gains `vitest` under `devDependencies`; `package-lock.json` updates.

- [ ] **Step 2: Add the `test` script to `package.json`**

In the `"scripts"` block, add a `test` entry so it reads:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run"
  },
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Create a temporary sanity test to confirm the harness + `@/` alias work**

Create `lib/session-tally.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("vitest harness", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run the test**

Run: `npm test`
Expected: PASS — 1 test passed.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts lib/session-tally.test.ts
git commit -m "chore: add vitest test harness"
```

---

## Task 2: Characterization tests for the existing import parser

This locks in current parser behavior before we surface it in the new UI. The implementation already exists in `lib/import-parser.ts`, so these tests should pass immediately.

**Files:**
- Create: `lib/import-parser.test.ts`

- [ ] **Step 1: Write the tests**

```ts
import { describe, it, expect } from "vitest";
import { parseCardList, parseCSV } from "@/lib/import-parser";

describe("parseCardList", () => {
  it("parses 'CARD qty' format", () => {
    expect(parseCardList("BT1-001 3").parsed).toEqual([{ cardNumber: "BT1-001", quantity: 3 }]);
  });
  it("parses 'CARD xqty' and comma formats", () => {
    expect(parseCardList("BT1-001 x2").parsed).toEqual([{ cardNumber: "BT1-001", quantity: 2 }]);
    expect(parseCardList("BT1-002,5").parsed).toEqual([{ cardNumber: "BT1-002", quantity: 5 }]);
  });
  it("parses 'qty (CARD)' digimoncard.io format", () => {
    expect(parseCardList("4 (BT14-001)").parsed).toEqual([{ cardNumber: "BT14-001", quantity: 4 }]);
  });
  it("defaults quantity to 1 when omitted", () => {
    expect(parseCardList("BT3-015").parsed).toEqual([{ cardNumber: "BT3-015", quantity: 1 }]);
  });
  it("ignores blank lines and comments", () => {
    expect(parseCardList("\n# a comment\nBT1-001 1\n").parsed).toEqual([{ cardNumber: "BT1-001", quantity: 1 }]);
  });
  it("merges duplicate card numbers", () => {
    expect(parseCardList("BT1-001 2\nBT1-001 3").parsed).toEqual([{ cardNumber: "BT1-001", quantity: 5 }]);
  });
  it("uppercases card numbers", () => {
    expect(parseCardList("bt1-001 1").parsed).toEqual([{ cardNumber: "BT1-001", quantity: 1 }]);
  });
  it("reports unrecognized lines as errors", () => {
    const result = parseCardList("not a card");
    expect(result.errors).toHaveLength(1);
    expect(result.parsed).toHaveLength(0);
  });
});

describe("parseCSV", () => {
  it("parses a CSV with headers", () => {
    const csv = "card_number,quantity\nBT1-001,3\nBT1-002,1";
    expect(parseCSV(csv).parsed).toEqual([
      { cardNumber: "BT1-001", quantity: 3 },
      { cardNumber: "BT1-002", quantity: 1 },
    ]);
  });
  it("falls back to first/second column without headers", () => {
    const csv = "BT1-001,2\nBT1-002,4";
    expect(parseCSV(csv).parsed).toEqual([
      { cardNumber: "BT1-001", quantity: 2 },
      { cardNumber: "BT1-002", quantity: 4 },
    ]);
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npm test`
Expected: PASS — all parser tests green (plus the harness sanity test).

- [ ] **Step 3: Commit**

```bash
git add lib/import-parser.test.ts
git commit -m "test: characterize existing import parser behavior"
```

---

## Task 3: Set-checklist pure logic (TDD)

**Files:**
- Create: `lib/collection-entry.ts`
- Create: `lib/collection-entry.test.ts`

> **Surplus definition:** For the checklist, surplus is `max(0, owned - max_copies)` — copies beyond a single playset. The app's canonical deck-aware surplus (which subtracts demand summed across decks) lives on the sell page; the entry checklist intentionally uses the simpler, deck-independent definition.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from "vitest";
import { surplusForCard, filterChecklistCards, checklistStats } from "@/lib/collection-entry";
import type { Card } from "@/lib/types";

function makeCard(card_number: string, max_copies = 4): Card {
  return {
    card_number,
    name: card_number,
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
    max_copies,
    last_updated: "",
    base_card_number: card_number,
    variant_name: "Regular",
  };
}

describe("surplusForCard", () => {
  it("returns 0 when owned is at or below max copies", () => {
    expect(surplusForCard(4, 4)).toBe(0);
    expect(surplusForCard(2, 4)).toBe(0);
  });
  it("returns the count above max copies", () => {
    expect(surplusForCard(7, 4)).toBe(3);
  });
  it("never goes negative", () => {
    expect(surplusForCard(0, 4)).toBe(0);
  });
});

describe("filterChecklistCards", () => {
  const cards = [makeCard("BT9-001"), makeCard("BT9-002"), makeCard("BT9-003")];
  const owned = new Map<string, number>([
    ["BT9-001", 2],
    ["BT9-002", 6],
  ]);

  it("returns all cards for 'all'", () => {
    expect(filterChecklistCards(cards, owned, "all")).toHaveLength(3);
  });
  it("returns only owned cards for 'owned'", () => {
    expect(filterChecklistCards(cards, owned, "owned").map((c) => c.card_number)).toEqual(["BT9-001", "BT9-002"]);
  });
  it("returns only unowned cards for 'missing'", () => {
    expect(filterChecklistCards(cards, owned, "missing").map((c) => c.card_number)).toEqual(["BT9-003"]);
  });
  it("returns only cards above max copies for 'surplus'", () => {
    expect(filterChecklistCards(cards, owned, "surplus").map((c) => c.card_number)).toEqual(["BT9-002"]);
  });
});

describe("checklistStats", () => {
  it("counts distinct owned, total, and total surplus copies", () => {
    const cards = [makeCard("BT9-001"), makeCard("BT9-002"), makeCard("BT9-003")];
    const owned = new Map<string, number>([
      ["BT9-001", 2],
      ["BT9-002", 6],
    ]);
    expect(checklistStats(cards, owned)).toEqual({ owned: 2, total: 3, surplus: 2 });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `@/lib/collection-entry` / functions not defined.

- [ ] **Step 3: Implement `lib/collection-entry.ts`**

```ts
import type { Card } from "@/lib/types";

export type ChecklistFilter = "all" | "missing" | "owned" | "surplus";

/** Copies beyond a single playset. Deck-independent (see plan note). */
export function surplusForCard(owned: number, maxCopies: number): number {
  return Math.max(0, owned - maxCopies);
}

export function filterChecklistCards(
  cards: Card[],
  ownedMap: Map<string, number>,
  filter: ChecklistFilter,
): Card[] {
  return cards.filter((card) => {
    const owned = ownedMap.get(card.card_number) ?? 0;
    switch (filter) {
      case "all":
        return true;
      case "owned":
        return owned > 0;
      case "missing":
        return owned === 0;
      case "surplus":
        return surplusForCard(owned, card.max_copies) > 0;
    }
  });
}

export interface ChecklistStats {
  owned: number; // distinct cards owned (qty > 0)
  total: number; // total cards in the set
  surplus: number; // total surplus copies across the set
}

export function checklistStats(cards: Card[], ownedMap: Map<string, number>): ChecklistStats {
  let owned = 0;
  let surplus = 0;
  for (const card of cards) {
    const qty = ownedMap.get(card.card_number) ?? 0;
    if (qty > 0) owned++;
    surplus += surplusForCard(qty, card.max_copies);
  }
  return { owned, total: cards.length, surplus };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test`
Expected: PASS — all `collection-entry` tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/collection-entry.ts lib/collection-entry.test.ts
git commit -m "feat: add set-checklist filter and stats logic"
```

---

## Task 4: Session-tally pure logic (TDD)

This replaces the temporary sanity test created in Task 1.

**Files:**
- Modify (overwrite): `lib/session-tally.test.ts`
- Create: `lib/session-tally.ts`

- [ ] **Step 1: Overwrite `lib/session-tally.test.ts` with the real tests**

```ts
import { describe, it, expect } from "vitest";
import { recordAdjustment, sessionTotal, type SessionState } from "@/lib/session-tally";

const item = (cardNumber: string) => ({ cardNumber, name: cardNumber, variantName: "Regular" });

describe("recordAdjustment", () => {
  it("adds a new item to the front", () => {
    const s = recordAdjustment([], item("BT9-001"), 1);
    expect(s).toEqual([{ cardNumber: "BT9-001", name: "BT9-001", variantName: "Regular", qtyAdded: 1 }]);
  });
  it("accumulates quantity for an existing item and moves it to the front", () => {
    let s: SessionState = recordAdjustment([], item("BT9-001"), 1);
    s = recordAdjustment(s, item("BT9-002"), 1);
    s = recordAdjustment(s, item("BT9-001"), 2);
    expect(s.map((x) => x.cardNumber)).toEqual(["BT9-001", "BT9-002"]);
    expect(s[0].qtyAdded).toBe(3);
  });
  it("removes an item when its net quantity drops to zero", () => {
    let s = recordAdjustment([], item("BT9-001"), 2);
    s = recordAdjustment(s, item("BT9-001"), -2);
    expect(s).toEqual([]);
  });
});

describe("sessionTotal", () => {
  it("sums quantities across items", () => {
    let s = recordAdjustment([], item("BT9-001"), 3);
    s = recordAdjustment(s, item("BT9-002"), 2);
    expect(sessionTotal(s)).toBe(5);
  });
  it("is zero for an empty session", () => {
    expect(sessionTotal([])).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `@/lib/session-tally` / functions not defined.

- [ ] **Step 3: Implement `lib/session-tally.ts`**

```ts
export interface SessionItem {
  cardNumber: string;
  name: string;
  variantName: string;
  qtyAdded: number;
}

/** Most-recently-adjusted first. */
export type SessionState = SessionItem[];

export function recordAdjustment(
  state: SessionState,
  item: { cardNumber: string; name: string; variantName: string },
  delta: number,
): SessionState {
  const existing = state.find((s) => s.cardNumber === item.cardNumber);
  const rest = state.filter((s) => s.cardNumber !== item.cardNumber);
  const newQty = (existing?.qtyAdded ?? 0) + delta;
  if (newQty <= 0) return rest;
  return [
    { cardNumber: item.cardNumber, name: item.name, variantName: item.variantName, qtyAdded: newQty },
    ...rest,
  ];
}

export function sessionTotal(state: SessionState): number {
  return state.reduce((sum, s) => sum + s.qtyAdded, 0);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test`
Expected: PASS — all `session-tally` tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/session-tally.ts lib/session-tally.test.ts
git commit -m "feat: add entry session-tally reducer"
```

---

## Task 5: `useEntrySession` hook

Ties a card adjustment to both an immediate collection write and the session-tally state. No unit test (it's a thin React/Query glue layer); verified by build + later manual smoke test.

**Files:**
- Create: `lib/hooks/use-entry-session.ts`

- [ ] **Step 1: Create the hook**

```ts
"use client";

import { useState, useCallback } from "react";
import { useUpdateQuantity, useCollectionMap } from "@/lib/hooks/use-collection";
import { recordAdjustment, type SessionState } from "@/lib/session-tally";
import type { Card } from "@/lib/types";

export function useEntrySession() {
  const [session, setSession] = useState<SessionState>([]);
  const { mutate } = useUpdateQuantity();
  const owned = useCollectionMap();

  const adjust = useCallback(
    (card: Card, delta: number) => {
      const current = owned.get(card.card_number) ?? 0;
      const next = Math.max(0, current + delta);
      if (next === current) return;
      mutate({ cardNumber: card.card_number, quantity: next });
      setSession((s) =>
        recordAdjustment(
          s,
          { cardNumber: card.card_number, name: card.name, variantName: card.variant_name },
          next - current,
        ),
      );
    },
    [owned, mutate],
  );

  const undo = useCallback(
    (cardNumber: string) => {
      setSession((s) => {
        const itemToUndo = s.find((x) => x.cardNumber === cardNumber);
        if (itemToUndo) {
          const current = owned.get(cardNumber) ?? 0;
          mutate({ cardNumber, quantity: Math.max(0, current - itemToUndo.qtyAdded) });
        }
        return s.filter((x) => x.cardNumber !== cardNumber);
      });
    },
    [owned, mutate],
  );

  return { session, adjust, undo };
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: Build succeeds (the hook isn't imported yet, but must type-check). If the build only checks imported files, this is confirmed in Task 11; proceed if no error here.

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/use-entry-session.ts
git commit -m "feat: add useEntrySession hook"
```

---

## Task 6: `ViewToggle` component

**Files:**
- Create: `components/cards/view-toggle.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { List, LayoutGrid } from "lucide-react";

export type CardView = "list" | "grid";

interface ViewToggleProps {
  view: CardView;
  onChange: (view: CardView) => void;
}

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-[var(--border-light)] bg-[var(--elevated)] p-0.5">
      <button
        onClick={() => onChange("list")}
        aria-label="List view"
        className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
          view === "list"
            ? "bg-[var(--surface)] text-[var(--text-primary)]"
            : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        }`}
      >
        <List size={15} />
      </button>
      <button
        onClick={() => onChange("grid")}
        aria-label="Grid view"
        className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
          view === "grid"
            ? "bg-[var(--surface)] text-[var(--text-primary)]"
            : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        }`}
      >
        <LayoutGrid size={15} />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: No errors for `components/cards/view-toggle.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/cards/view-toggle.tsx
git commit -m "feat: add list/grid view toggle component"
```

---

## Task 7: `EntryCardRow` component

A compact list row: thumbnail + number + name + variant badge + `−/+` stepper. Mirrors the styling of `quantity-control.tsx` but reports deltas via `onAdjust` instead of writing directly.

**Files:**
- Create: `components/collection/entry-card-row.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { Minus, Plus } from "lucide-react";
import CardImage from "@/components/cards/card-image";
import type { Card } from "@/lib/types";

interface EntryCardRowProps {
  card: Card;
  owned: number;
  onAdjust: (card: Card, delta: number) => void;
}

export default function EntryCardRow({ card, owned, onAdjust }: EntryCardRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-[var(--elevated)]">
      <div className="relative h-14 w-10 flex-none overflow-hidden rounded">
        <CardImage
          cardNumber={card.card_number}
          alt={card.name}
          imageUrl={card.image_url}
          fill
          sizes="40px"
          className="object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--text-primary)]">{card.name}</p>
        <p className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          {card.card_number}
          {card.variant_name !== "Regular" && (
            <span className="rounded-full border border-[var(--border-light)] px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)]">
              {card.variant_name}
            </span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => onAdjust(card, -1)}
          disabled={owned === 0}
          aria-label={`Remove one ${card.name}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-light)] bg-[var(--elevated)] text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-border)] hover:text-[var(--text-primary)] disabled:opacity-30"
        >
          <Minus size={14} />
        </button>
        <span className="min-w-[2ch] text-center text-base font-bold">{owned}</span>
        <button
          onClick={() => onAdjust(card, 1)}
          aria-label={`Add one ${card.name}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--background)] transition-colors hover:bg-[var(--accent-hover)]"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: No errors for `components/collection/entry-card-row.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/collection/entry-card-row.tsx
git commit -m "feat: add entry card row component"
```

---

## Task 8: `EntrySessionTray` component

**Files:**
- Create: `components/collection/entry-session-tray.tsx`

- [ ] **Step 1: Create the component**

```tsx
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
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: No errors for `components/collection/entry-session-tray.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/collection/entry-session-tray.tsx
git commit -m "feat: add entry session tray component"
```

---

## Task 9: `EntrySearch` mode component

Search & add: a debounced search bar feeding `useCardSearch`, rendered as a list (`EntryCardRow`) or grid (`CardGrid`, tap-to-+1) depending on `view`. Variants appear as their own rows because they are separate `cards` rows.

**Files:**
- Create: `components/collection/entry-search.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useState, useCallback } from "react";
import CardSearchBar from "@/components/cards/card-search-bar";
import CardGrid from "@/components/cards/card-grid";
import EntryCardRow from "@/components/collection/entry-card-row";
import { useCardSearch } from "@/lib/hooks/use-cards";
import { useCollectionMap } from "@/lib/hooks/use-collection";
import type { CardView } from "@/components/cards/view-toggle";
import type { Card } from "@/lib/types";

interface EntrySearchProps {
  view: CardView;
  onAdjust: (card: Card, delta: number) => void;
}

export default function EntrySearch({ view, onAdjust }: EntrySearchProps) {
  const [query, setQuery] = useState("");
  const { data: results, isLoading } = useCardSearch(query);
  const owned = useCollectionMap();
  const handleSearch = useCallback((q: string) => setQuery(q), []);

  return (
    <div className="space-y-3">
      <CardSearchBar onSearch={handleSearch} />

      {query.length < 2 && (
        <p className="py-12 text-center text-sm text-[var(--text-muted)]">
          Start typing a card name or number to add cards.
        </p>
      )}

      {query.length >= 2 && isLoading && (
        <p className="py-12 text-center text-sm text-[var(--text-muted)]">Searching…</p>
      )}

      {query.length >= 2 && results && view === "list" && (
        <div className="divide-y divide-[var(--border)]">
          {results.map((card) => (
            <EntryCardRow
              key={card.card_number}
              card={card}
              owned={owned.get(card.card_number) ?? 0}
              onAdjust={onAdjust}
            />
          ))}
          {results.length === 0 && (
            <p className="py-12 text-center text-sm text-[var(--text-muted)]">No cards found.</p>
          )}
        </div>
      )}

      {query.length >= 2 && results && view === "grid" && (
        <CardGrid cards={results} quantities={owned} onCardClick={(card) => onAdjust(card, 1)} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: No errors for `components/collection/entry-search.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/collection/entry-search.tsx
git commit -m "feat: add search-and-add entry mode"
```

---

## Task 10: `SetChecklist` mode component

Pick an expansion, see a completion bar + filter tabs, and tick off quantities. List or grid view. Uses the pure logic from Task 3.

**Files:**
- Create: `components/collection/set-checklist.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";
import CardGrid from "@/components/cards/card-grid";
import EntryCardRow from "@/components/collection/entry-card-row";
import { useExpansions, useCardsByExpansion } from "@/lib/hooks/use-cards";
import { useCollectionMap } from "@/lib/hooks/use-collection";
import { filterChecklistCards, checklistStats, type ChecklistFilter } from "@/lib/collection-entry";
import type { CardView } from "@/components/cards/view-toggle";
import type { Card } from "@/lib/types";

const FILTERS: { id: ChecklistFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "missing", label: "Missing" },
  { id: "owned", label: "Owned" },
  { id: "surplus", label: "Surplus" },
];

interface SetChecklistProps {
  view: CardView;
  onAdjust: (card: Card, delta: number) => void;
}

export default function SetChecklist({ view, onAdjust }: SetChecklistProps) {
  const { data: expansions } = useExpansions();
  const [expansion, setExpansion] = useState<string | null>(null);
  const [filter, setFilter] = useState<ChecklistFilter>("all");
  const { data: cards, isLoading } = useCardsByExpansion(expansion);
  const owned = useCollectionMap();

  const allCards = cards ?? [];
  const stats = checklistStats(allCards, owned);
  const visible = filterChecklistCards(allCards, owned, filter);
  const pct = stats.total > 0 ? Math.round((stats.owned / stats.total) * 100) : 0;

  return (
    <div className="space-y-3">
      <select
        value={expansion ?? ""}
        onChange={(e) => setExpansion(e.target.value || null)}
        className="w-full rounded-lg border border-[var(--border-light)] bg-[var(--elevated)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-border)]"
      >
        <option value="">Choose an expansion…</option>
        {expansions?.map((exp) => (
          <option key={exp.code} value={exp.code}>
            {exp.name} ({exp.card_count})
          </option>
        ))}
      </select>

      {expansion && (
        <>
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>
              <strong className="text-[var(--text-primary)]">{stats.owned}</strong> / {stats.total} owned
            </span>
            <span>{stats.surplus} surplus</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--elevated)]">
            <div className="h-full rounded-full bg-[var(--blue)] opacity-60" style={{ width: `${pct}%` }} />
          </div>

          <div className="flex gap-4 border-b border-[var(--border)]">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`-mb-px border-b-2 pb-1.5 text-sm transition-colors ${
                  filter === f.id
                    ? "border-[var(--text-primary)] text-[var(--text-primary)]"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {isLoading && <p className="py-12 text-center text-sm text-[var(--text-muted)]">Loading…</p>}

          {!isLoading && view === "list" && (
            <div className="divide-y divide-[var(--border)]">
              {visible.map((card) => (
                <EntryCardRow
                  key={card.card_number}
                  card={card}
                  owned={owned.get(card.card_number) ?? 0}
                  onAdjust={onAdjust}
                />
              ))}
              {visible.length === 0 && (
                <p className="py-12 text-center text-sm text-[var(--text-muted)]">No cards match this filter.</p>
              )}
            </div>
          )}

          {!isLoading && view === "grid" && (
            <CardGrid cards={visible} quantities={owned} onCardClick={(card) => onAdjust(card, 1)} />
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: No errors for `components/collection/set-checklist.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/collection/set-checklist.tsx
git commit -m "feat: add set checklist entry mode"
```

---

## Task 11: Mode tabs + the Add Cards page

Assembles everything: mode switcher, active mode, the session tray, and the Paste tab (which opens the existing `ImportModal`).

**Files:**
- Create: `components/collection/add-mode-tabs.tsx`
- Create: `app/collection/add/page.tsx`

- [ ] **Step 1: Create `components/collection/add-mode-tabs.tsx`**

```tsx
"use client";

export type AddMode = "search" | "checklist" | "paste";

const TABS: { id: AddMode; label: string }[] = [
  { id: "search", label: "Search & add" },
  { id: "checklist", label: "Set checklist" },
  { id: "paste", label: "Paste list" },
];

interface AddModeTabsProps {
  mode: AddMode;
  onChange: (mode: AddMode) => void;
}

export default function AddModeTabs({ mode, onChange }: AddModeTabsProps) {
  return (
    <div className="flex gap-5 border-b border-[var(--border)]">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`-mb-px border-b-2 pb-2 text-sm font-medium transition-colors ${
            mode === tab.id
              ? "border-[var(--text-primary)] text-[var(--text-primary)]"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `app/collection/add/page.tsx`**

> The `/collection` route group is already auth-guarded by `proxy.ts`, so `/collection/add` redirects unauthenticated users automatically — no client-side auth guard needed here. (Verify in Step 3 that the proxy matcher covers the subpath.)

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AddModeTabs, { type AddMode } from "@/components/collection/add-mode-tabs";
import EntrySearch from "@/components/collection/entry-search";
import SetChecklist from "@/components/collection/set-checklist";
import EntrySessionTray from "@/components/collection/entry-session-tray";
import ImportModal from "@/components/collection/import-modal";
import ViewToggle, { type CardView } from "@/components/cards/view-toggle";
import { useEntrySession } from "@/lib/hooks/use-entry-session";

export default function AddCardsPage() {
  const [mode, setMode] = useState<AddMode>("search");
  const [view, setView] = useState<CardView>("list");
  const [importOpen, setImportOpen] = useState(false);
  const { session, adjust, undo } = useEntrySession();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/collection"
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

        <aside className="lg:w-72 lg:flex-none lg:sticky lg:top-4 lg:self-start">
          <EntrySessionTray session={session} onUndo={undo} />
        </aside>
      </div>

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
```

- [ ] **Step 3: Build and confirm the route is auth-guarded**

Run: `npm run build`
Expected: Build succeeds and lists `/collection/add` among the routes.
Also open `proxy.ts` and confirm its matcher protects `/collection` subpaths (e.g. a `startsWith("/collection")` check or a `/collection/:path*` matcher). If it only matches the exact `/collection` path, add `/collection/add` (or a wildcard) to the guard.

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`, sign in, and visit `http://localhost:3000/collection/add`.
Verify:
- Search a card, press `+`/`−` → quantity changes, session tray total updates, undo removes it.
- Switch to grid view → clicking a card adds +1.
- Set checklist: choose an expansion → completion bar + filters work; Missing/Owned/Surplus filter correctly.
- Paste tab → opens the import modal; importing adds to the collection.
- An alt-art card appears as its own row with its variant name.

- [ ] **Step 5: Commit**

```bash
git add components/collection/add-mode-tabs.tsx app/collection/add/page.tsx
git commit -m "feat: add the /collection/add fast entry page"
```

---

## Task 12: Wire the collection page to the new entry surface

Replace the standalone Import button with an "Add cards" link, and remove the now-unused inline `ImportModal` from the collection page. (`ImportModal` is still used by the decks page for deck imports — leave that untouched.)

**Files:**
- Modify: `app/collection/page.tsx`

- [ ] **Step 1: Update imports**

In `app/collection/page.tsx`, change the import-related lines.

Replace:

```tsx
import ImportModal from "@/components/collection/import-modal";
import Link from "next/link";
import { Layers, LogIn, Upload } from "lucide-react";
```

with:

```tsx
import Link from "next/link";
import { Layers, LogIn, Plus } from "lucide-react";
```

- [ ] **Step 2: Remove the import-modal state**

Delete this line:

```tsx
  const [importOpen, setImportOpen] = useState(false);
```

- [ ] **Step 3: Replace the Import button with an "Add cards" link**

Replace this block:

```tsx
        <button
          onClick={() => setImportOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--elevated)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          <Upload size={15} />
          Import
        </button>
```

with:

```tsx
        <Link
          href="/collection/add"
          className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-[var(--background)] transition-colors hover:bg-[var(--accent-hover)]"
        >
          <Plus size={15} />
          Add cards
        </Link>
```

- [ ] **Step 4: Update the empty-state hint to point at the new surface**

Replace:

```tsx
          <p className="text-sm text-[var(--text-muted)]">No cards in your collection yet.</p>
          <p className="text-xs text-[var(--text-dim)]">Browse the database to add some!</p>
```

with:

```tsx
          <p className="text-sm text-[var(--text-muted)]">No cards in your collection yet.</p>
          <Link href="/collection/add" className="mt-2 text-xs text-[var(--accent)] hover:underline">
            Add cards to get started
          </Link>
```

- [ ] **Step 5: Remove the `ImportModal` render**

Delete this line near the end of the component's JSX:

```tsx
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
```

- [ ] **Step 6: Build + lint + final test run**

Run: `npm run lint`
Expected: No errors (in particular, no "unused variable" for removed `Upload`/`useState`/`importOpen`).

Run: `npm run build`
Expected: Build succeeds.

Run: `npm test`
Expected: PASS — all unit tests still green.

- [ ] **Step 7: Manual smoke test**

Run `npm run dev`, visit `/collection`:
- The header shows an "Add cards" button (accent), no "Import" button.
- Clicking it navigates to `/collection/add`.
- The empty-state link (when collection is empty) navigates to `/collection/add`.
- The decks page import (open a deck → Import) still works.

- [ ] **Step 8: Commit**

```bash
git add app/collection/page.tsx
git commit -m "feat: link collection page to the new add-cards surface"
```

---

## Self-Review

**Spec coverage:**
- Dedicated entry surface at `/collection/add` → Task 11. ✅
- Search & add (list + grid toggle) → Tasks 9, 6. ✅
- Set checklist (completion bar, filters, list/grid) → Tasks 10, 3, 6. ✅
- Paste mode reusing import logic, standalone Import button removed → Tasks 11, 12. ✅
- Shared live session tray with undo, immediate writes → Tasks 8, 5, 4. ✅
- List/grid toggle on both modes → Task 6 (shared component used in 9 and 10). ✅
- Alt arts as separate cards → inherent in the data model; surfaced via `variant_name` in Task 7 and confirmed in Task 11 smoke test. ✅
- No schema change → confirmed; all writes via `useUpdateQuantity`. ✅
- Condition out of scope → not implemented (correct). ✅
- Testing: Vitest for pure logic (Tasks 1–4), build/lint/manual for UI. ✅

**Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to" — every code step contains complete code. ✅

**Type consistency:** `CardView` (Task 6) used in 9, 10, 11. `AddMode` (Task 11) used in the page. `ChecklistFilter` (Task 3) used in 10. `SessionState`/`recordAdjustment`/`sessionTotal` (Task 4) used in 5 and 8. `useEntrySession` returns `{ session, adjust, undo }` (Task 5), consumed exactly in Task 11. `onAdjust: (card: Card, delta: number) => void` signature is identical across Tasks 7, 9, 10, 11. ✅
