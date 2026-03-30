# Dashboard & Collection Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the root redirect with a personal dashboard (authenticated) / welcome landing (guest), and add a collection import feature for bulk card entry.

**Architecture:** The `/` route conditionally renders based on auth state. Dashboard reuses existing hooks (`useCollection`, `useDecks`, `useAllDeckCards`, `usePrices`) and `buildSellableCards()`. Collection import adds a modal with a text/CSV parser utility, preview step, and batch upsert. No database changes needed.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Lucide React, TanStack Query, Supabase

---

## File Structure

### New Files
- `app/page.tsx` — Root page (replace redirect with conditional dashboard/landing)
- `components/dashboard/dashboard-stats.tsx` — Stats row (4 widgets)
- `components/dashboard/deck-progress.tsx` — Deck completion list with progress bars
- `components/dashboard/worth-selling.tsx` — Top 5 surplus cards by value
- `components/dashboard/guest-landing.tsx` — Welcome page for unauthenticated visitors
- `components/collection/import-modal.tsx` — Import modal with text paste + CSV tabs
- `lib/import-parser.ts` — Card list parser utility (text + CSV)

### Modified Files
- `components/nav/top-nav-bar.tsx` — Add Home tab, update logo link to `/`
- `components/nav/bottom-tab-bar.tsx` — Add Home tab
- `app/collection/page.tsx` — Add "Import Cards" button

---

### Task 1: Add Home Tab to Navigation

**Files:**
- Modify: `components/nav/bottom-tab-bar.tsx`
- Modify: `components/nav/top-nav-bar.tsx`

- [ ] **Step 1: Update bottom tab bar**

In `components/nav/bottom-tab-bar.tsx`, add the Home tab to the beginning of the tabs array and update the import:

```typescript
import { Home, Search, Layers, SquareStack, TrendingUp } from "lucide-react";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/database", label: "Database", icon: Search },
  { href: "/collection", label: "Collection", icon: Layers },
  { href: "/decks", label: "Decks", icon: SquareStack },
  { href: "/sell", label: "Sell", icon: TrendingUp },
];
```

Also update the `isActive` check to handle the root path correctly — `/` should only be active when pathname is exactly `/`:

```typescript
const isActive = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
```

- [ ] **Step 2: Update top nav bar**

In `components/nav/top-nav-bar.tsx`, make the same changes:

Add `Home` to the Lucide import:
```typescript
import { Home, Search, Layers, SquareStack, TrendingUp, LogOut, LogIn } from "lucide-react";
```

Add the Home tab to the beginning of the tabs array:
```typescript
const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/database", label: "Database", icon: Search },
  { href: "/collection", label: "Collection", icon: Layers },
  { href: "/decks", label: "Decks", icon: SquareStack },
  { href: "/sell", label: "Sell", icon: TrendingUp },
];
```

Update the `isActive` check the same way:
```typescript
const isActive = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
```

Update the logo link from `/database` to `/`:
```typescript
<Link href="/" className="text-lg font-bold text-[var(--text-primary)]">
```

Also update the sign-out redirect from `/database` to `/`:
```typescript
async function handleSignOut() {
  await supabase.auth.signOut();
  router.push("/");
  router.refresh();
}
```

- [ ] **Step 3: Verify navigation renders correctly**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add components/nav/bottom-tab-bar.tsx components/nav/top-nav-bar.tsx
git commit -m "feat: add Home tab to navigation"
```

---

### Task 2: Guest Landing Page

**Files:**
- Create: `components/dashboard/guest-landing.tsx`

- [ ] **Step 1: Create guest landing component**

Create `components/dashboard/guest-landing.tsx`:

```typescript
import Link from "next/link";
import { Layers, SquareStack, TrendingUp, LogIn, Search } from "lucide-react";

const features = [
  {
    icon: Layers,
    title: "Track Your Collection",
    description: "Keep count of every card you own and see your collection's estimated value.",
    color: "var(--accent)",
  },
  {
    icon: SquareStack,
    title: "Build & Complete Decks",
    description: "Create deck lists and track which cards you still need to finish them.",
    color: "var(--blue)",
  },
  {
    icon: TrendingUp,
    title: "Find Cards to Sell",
    description: "Identify surplus cards worth selling on Cardmarket with live pricing.",
    color: "var(--yellow)",
  },
];

export default function GuestLanding() {
  return (
    <div className="flex flex-col items-center px-4 py-12 md:py-20">
      <h1 className="text-center text-3xl font-bold md:text-4xl">
        Track your <span className="text-[var(--accent)]">Digimon TCG</span> collection
      </h1>
      <p className="mt-3 max-w-md text-center text-[var(--text-secondary)]">
        Build decks, track completion, and find surplus cards worth selling — all in one place.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/login"
          className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[var(--background)] transition-colors hover:bg-[var(--accent-hover)]"
        >
          <LogIn size={16} />
          Get Started
        </Link>
        <Link
          href="/database"
          className="flex items-center gap-2 rounded-xl border border-[var(--border-light)] bg-[var(--elevated)] px-6 py-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          <Search size={16} />
          Browse Card Database
        </Link>
      </div>
      <div className="mt-16 grid w-full max-w-3xl gap-4 sm:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="flex flex-col items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center"
            >
              <div
                className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--elevated)]"
                style={{ color: feature.color }}
              >
                <Icon size={22} />
              </div>
              <h3 className="mt-3 font-semibold">{feature.title}</h3>
              <p className="mt-1.5 text-sm text-[var(--text-muted)]">{feature.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/dashboard/guest-landing.tsx
git commit -m "feat: add guest landing page component"
```

---

### Task 3: Dashboard Stats Row

**Files:**
- Create: `components/dashboard/dashboard-stats.tsx`

- [ ] **Step 1: Create dashboard stats component**

Create `components/dashboard/dashboard-stats.tsx`. This follows the exact pattern from `collection-summary.tsx` but with 4 dashboard-specific stats:

```typescript
"use client";

import { useCollection } from "@/lib/hooks/use-collection";
import { useDecks } from "@/lib/hooks/use-decks";
import { useAllDeckCards } from "@/lib/hooks/use-decks";
import { usePrices } from "@/lib/hooks/use-prices";
import { buildSellableCards } from "@/lib/utils";
import { formatPrice } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Layers, Fingerprint, TrendingUp, CircleDollarSign } from "lucide-react";
import type { Card } from "@/lib/types";

const supabase = createClient();

export default function DashboardStats() {
  const { data: collection } = useCollection();
  const { data: allDeckCards } = useAllDeckCards();
  const { data: prices } = usePrices();

  const cardNumbers = collection?.map((c) => c.card_number) ?? [];
  const { data: cards } = useQuery<Card[]>({
    queryKey: ["dashboard-cards", cardNumbers],
    queryFn: async () => {
      if (cardNumbers.length === 0) return [];
      const { data, error } = await supabase.from("cards").select("*").in("card_number", cardNumbers);
      if (error) throw error;
      return data as Card[];
    },
    enabled: cardNumbers.length > 0,
  });

  const totalCards = collection?.reduce((sum, c) => sum + c.quantity, 0) ?? 0;
  const uniqueCards = collection?.length ?? 0;

  let collectionValue: number | null = null;
  if (collection && prices) {
    const priceMap = new Map(prices.map((p) => [p.card_number, p.price_trend]));
    collectionValue = collection.reduce((sum, c) => {
      const price = priceMap.get(c.card_number);
      return sum + (price ? price * c.quantity : 0);
    }, 0);
  }

  const sellableCards =
    cards && collection && allDeckCards && prices
      ? buildSellableCards(cards, collection, allDeckCards, prices)
      : [];
  const surplusValue = sellableCards.reduce((sum, s) => sum + (s.total_value ?? 0), 0);

  const stats = [
    { label: "Total Cards", value: totalCards, icon: Layers, color: "var(--accent)" },
    { label: "Unique", value: uniqueCards, icon: Fingerprint, color: "var(--blue)" },
    {
      label: "Collection Value",
      value: collectionValue !== null ? formatPrice(collectionValue) : "—",
      icon: TrendingUp,
      color: "var(--green)",
    },
    {
      label: "Surplus Value",
      value: surplusValue > 0 ? formatPrice(surplusValue) : "—",
      icon: CircleDollarSign,
      color: "var(--yellow)",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:flex">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="flex flex-1 items-center gap-3 rounded-xl bg-[var(--surface)] p-4">
            <div
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--elevated)]"
              style={{ color: stat.color }}
            >
              <Icon size={18} />
            </div>
            <div>
              <div className="text-lg font-bold">{stat.value}</div>
              <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{stat.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

Note: Uses `grid grid-cols-2 gap-3 sm:flex` so it wraps to a 2x2 grid on mobile but shows as a single row on wider screens.

- [ ] **Step 2: Commit**

```bash
git add components/dashboard/dashboard-stats.tsx
git commit -m "feat: add dashboard stats row component"
```

---

### Task 4: Deck Progress Component

**Files:**
- Create: `components/dashboard/deck-progress.tsx`

- [ ] **Step 1: Create deck progress component**

Create `components/dashboard/deck-progress.tsx`. Shows each deck with a completion progress bar, following the pattern in `deck-list-card.tsx`:

```typescript
"use client";

import Link from "next/link";
import { useDecks, useDeckCards } from "@/lib/hooks/use-decks";
import { useCollectionMap } from "@/lib/hooks/use-collection";
import { SquareStack } from "lucide-react";
import type { Deck } from "@/lib/types";

function DeckProgressRow({ deck }: { deck: Deck }) {
  const { data: deckCards } = useDeckCards(deck.id);
  const quantities = useCollectionMap();

  const totalNeeded = deckCards?.reduce((sum, dc) => sum + dc.quantity, 0) ?? 0;
  const totalOwned = deckCards?.reduce((sum, dc) => {
    const owned = quantities.get(dc.card_number) ?? 0;
    return sum + Math.min(owned, dc.quantity);
  }, 0) ?? 0;
  const completionPercent = totalNeeded > 0 ? Math.round((totalOwned / totalNeeded) * 100) : 0;

  return (
    <Link
      href={`/decks/${deck.id}`}
      className="block rounded-lg p-2.5 transition-colors hover:bg-[var(--elevated)]"
    >
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium truncate">{deck.name}</span>
        <span
          className={`ml-2 text-xs font-medium ${
            completionPercent === 100 ? "text-[var(--green)]" : "text-[var(--text-secondary)]"
          }`}
        >
          {completionPercent}%
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--elevated)]">
        <div
          className={`h-full rounded-full transition-all ${
            completionPercent === 100 ? "bg-[var(--green)]" : "bg-[var(--accent)]"
          }`}
          style={{ width: `${completionPercent}%` }}
        />
      </div>
    </Link>
  );
}

export default function DeckProgress() {
  const { data: decks } = useDecks();

  if (!decks || decks.length === 0) {
    return (
      <div className="rounded-xl bg-[var(--surface)] p-5">
        <h2 className="text-sm font-semibold">Deck Progress</h2>
        <div className="mt-4 flex flex-col items-center py-4">
          <SquareStack size={28} className="text-[var(--border)]" />
          <p className="mt-2 text-xs text-[var(--text-muted)]">No decks yet.</p>
          <Link
            href="/decks"
            className="mt-2 text-xs font-medium text-[var(--accent)] hover:underline"
          >
            Create a deck
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[var(--surface)] p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Deck Progress</h2>
        <Link href="/decks" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
          View all
        </Link>
      </div>
      <div className="mt-3 space-y-1">
        {decks.map((deck) => (
          <DeckProgressRow key={deck.id} deck={deck} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/dashboard/deck-progress.tsx
git commit -m "feat: add deck progress dashboard component"
```

---

### Task 5: Worth Selling Component

**Files:**
- Create: `components/dashboard/worth-selling.tsx`

- [ ] **Step 1: Create worth selling component**

Create `components/dashboard/worth-selling.tsx`. Shows top 5 surplus cards by value, reusing `buildSellableCards()`:

```typescript
"use client";

import Link from "next/link";
import { useCollection } from "@/lib/hooks/use-collection";
import { useAllDeckCards } from "@/lib/hooks/use-decks";
import { usePrices } from "@/lib/hooks/use-prices";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { buildSellableCards, formatPrice } from "@/lib/utils";
import CardImage from "@/components/cards/card-image";
import { TrendingUp, PackageMinus, Coins } from "lucide-react";
import type { Card } from "@/lib/types";

const supabase = createClient();

export default function WorthSelling() {
  const { data: collection } = useCollection();
  const { data: allDeckCards } = useAllDeckCards();
  const { data: prices } = usePrices();

  const cardNumbers = collection?.map((c) => c.card_number) ?? [];
  const { data: cards } = useQuery<Card[]>({
    queryKey: ["dashboard-cards", cardNumbers],
    queryFn: async () => {
      if (cardNumbers.length === 0) return [];
      const { data, error } = await supabase.from("cards").select("*").in("card_number", cardNumbers);
      if (error) throw error;
      return data as Card[];
    },
    enabled: cardNumbers.length > 0,
  });

  const sellableCards =
    cards && collection && allDeckCards && prices
      ? buildSellableCards(cards, collection, allDeckCards, prices)
      : [];

  const top5 = sellableCards.slice(0, 5);

  if (top5.length === 0) {
    return (
      <div className="rounded-xl bg-[var(--surface)] p-5">
        <h2 className="text-sm font-semibold">Worth Selling</h2>
        <div className="mt-4 flex flex-col items-center py-4">
          <TrendingUp size={28} className="text-[var(--border)]" />
          <p className="mt-2 text-xs text-[var(--text-muted)]">No surplus cards to sell.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[var(--surface)] p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Worth Selling</h2>
        <Link href="/sell" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
          View all
        </Link>
      </div>
      <div className="mt-3 space-y-2">
        {top5.map((item) => (
          <Link
            key={item.card.card_number}
            href="/sell"
            className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-[var(--elevated)]"
          >
            <div className="relative h-10 w-7 flex-shrink-0 overflow-hidden rounded border border-[var(--border)]">
              <CardImage cardNumber={item.card.card_number} alt={item.card.name} fill sizes="28px" className="object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{item.card.name}</p>
              <p className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                <PackageMinus size={10} />
                x{item.surplus} surplus
              </p>
            </div>
            <div className="text-right">
              <p className="flex items-center gap-1 text-sm font-bold text-[var(--yellow)]">
                <Coins size={12} />
                {formatPrice(item.total_value)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/dashboard/worth-selling.tsx
git commit -m "feat: add worth selling dashboard component"
```

---

### Task 6: Dashboard Root Page

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace root page redirect with dashboard**

Replace the contents of `app/page.tsx` with the conditional dashboard/landing page:

```typescript
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import GuestLanding from "@/components/dashboard/guest-landing";
import DashboardStats from "@/components/dashboard/dashboard-stats";
import DeckProgress from "@/components/dashboard/deck-progress";
import WorthSelling from "@/components/dashboard/worth-selling";
import type { User } from "@supabase/supabase-js";

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthChecked(true);
    });
  }, [supabase.auth]);

  if (!authChecked) return null;

  if (!user) return <GuestLanding />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <DashboardStats />
      <div className="grid gap-4 md:grid-cols-2">
        <DeckProgress />
        <WorthSelling />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the full dashboard builds and renders**

Run: `npm run build`
Expected: Build succeeds. The `/` route renders the dashboard for authenticated users and the landing page for guests.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: replace root redirect with dashboard and guest landing"
```

---

### Task 7: Card List Parser

**Files:**
- Create: `lib/import-parser.ts`

- [ ] **Step 1: Create parser utility**

Create `lib/import-parser.ts`:

```typescript
export interface ParsedCard {
  cardNumber: string;
  quantity: number;
}

export interface ParseError {
  line: string;
  reason: string;
}

export interface ParseResult {
  parsed: ParsedCard[];
  errors: ParseError[];
}

/**
 * Parses a text block of card entries. Supports formats:
 * - "BT1-001 3" or "BT1-001 x3" or "BT1-001,3"
 * - Card number only (defaults to quantity 1)
 * One card per line. Blank lines and lines starting with # are ignored.
 */
export function parseCardList(input: string): ParseResult {
  const lines = input.split(/\r?\n/);
  const parsed: ParsedCard[] = [];
  const errors: ParseError[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;

    const match = line.match(/^([A-Za-z0-9]+-\d+)\s*[,xX×]?\s*(\d+)?$/);
    if (!match) {
      errors.push({ line, reason: "Unrecognized format" });
      continue;
    }

    const cardNumber = match[1].toUpperCase();
    const quantity = match[2] ? parseInt(match[2], 10) : 1;

    if (quantity <= 0) {
      errors.push({ line, reason: "Quantity must be at least 1" });
      continue;
    }

    parsed.push({ cardNumber, quantity });
  }

  // Merge duplicates
  const merged = new Map<string, number>();
  for (const entry of parsed) {
    merged.set(entry.cardNumber, (merged.get(entry.cardNumber) ?? 0) + entry.quantity);
  }

  return {
    parsed: Array.from(merged, ([cardNumber, quantity]) => ({ cardNumber, quantity })),
    errors,
  };
}

/**
 * Parses CSV text. Auto-detects column names for card number and quantity.
 * Falls back to first column = card number, second column = quantity.
 */
export function parseCSV(csvText: string): ParseResult {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return { parsed: [], errors: [] };

  const headerLine = lines[0];
  const separator = headerLine.includes("\t") ? "\t" : ",";
  const headers = headerLine.split(separator).map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));

  const numberAliases = ["card_number", "cardnumber", "card number", "number", "id", "card_id", "card"];
  const qtyAliases = ["quantity", "qty", "count", "amount"];

  let numberCol = headers.findIndex((h) => numberAliases.includes(h));
  let qtyCol = headers.findIndex((h) => qtyAliases.includes(h));

  const hasHeader = numberCol !== -1;
  if (!hasHeader) {
    numberCol = 0;
    qtyCol = headers.length > 1 ? 1 : -1;
  }

  const dataLines = hasHeader ? lines.slice(1) : lines;
  const textLines: string[] = [];

  for (const line of dataLines) {
    const cols = line.split(separator).map((c) => c.trim().replace(/['"]/g, ""));
    const cardNumber = cols[numberCol] ?? "";
    const quantity = qtyCol >= 0 ? cols[qtyCol] ?? "1" : "1";
    if (cardNumber) {
      textLines.push(`${cardNumber} ${quantity}`);
    }
  }

  return parseCardList(textLines.join("\n"));
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/import-parser.ts
git commit -m "feat: add card list parser for text and CSV formats"
```

---

### Task 8: Import Modal Component

**Files:**
- Create: `components/collection/import-modal.tsx`

- [ ] **Step 1: Create import modal**

Create `components/collection/import-modal.tsx`:

```typescript
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { parseCardList, parseCSV } from "@/lib/import-parser";
import { useUpdateQuantity } from "@/lib/hooks/use-collection";
import { useCollectionMap } from "@/lib/hooks/use-collection";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { X, Upload, ClipboardPaste, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { ParsedCard, ParseError } from "@/lib/import-parser";
import type { Card } from "@/lib/types";

const supabase = createClient();

type Tab = "paste" | "csv";
type Stage = "input" | "preview" | "importing" | "done";

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ImportModal({ open, onClose }: ImportModalProps) {
  const [tab, setTab] = useState<Tab>("paste");
  const [stage, setStage] = useState<Stage>("input");
  const [textInput, setTextInput] = useState("");
  const [parsed, setParsed] = useState<ParsedCard[]>([]);
  const [validated, setValidated] = useState<ParsedCard[]>([]);
  const [unknownCards, setUnknownCards] = useState<string[]>([]);
  const [parseErrors, setParseErrors] = useState<ParseError[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateQuantity = useUpdateQuantity();
  const quantities = useCollectionMap();

  // Fetch all known card numbers for validation
  const { data: knownCards } = useQuery<Set<string>>({
    queryKey: ["all-card-numbers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cards").select("card_number");
      if (error) throw error;
      return new Set((data as { card_number: string }[]).map((c) => c.card_number));
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!open) {
      setStage("input");
      setTextInput("");
      setParsed([]);
      setValidated([]);
      setUnknownCards([]);
      setParseErrors([]);
      setImportedCount(0);
      setImportProgress(0);
      setTab("paste");
    }
  }, [open]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const handleParse = useCallback(() => {
    const result = tab === "paste" ? parseCardList(textInput) : parseCardList(textInput);
    setParseErrors(result.errors);

    if (knownCards) {
      const valid: ParsedCard[] = [];
      const unknown: string[] = [];
      for (const entry of result.parsed) {
        if (knownCards.has(entry.cardNumber)) {
          valid.push(entry);
        } else {
          unknown.push(entry.cardNumber);
        }
      }
      setValidated(valid);
      setUnknownCards(unknown);
    } else {
      setValidated(result.parsed);
      setUnknownCards([]);
    }

    setParsed(result.parsed);
    setStage("preview");
  }, [textInput, tab, knownCards]);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const csvText = event.target?.result as string;
        const result = parseCSV(csvText);
        setParseErrors(result.errors);

        if (knownCards) {
          const valid: ParsedCard[] = [];
          const unknown: string[] = [];
          for (const entry of result.parsed) {
            if (knownCards.has(entry.cardNumber)) {
              valid.push(entry);
            } else {
              unknown.push(entry.cardNumber);
            }
          }
          setValidated(valid);
          setUnknownCards(unknown);
        } else {
          setValidated(result.parsed);
          setUnknownCards([]);
        }

        setParsed(result.parsed);
        setStage("preview");
      };
      reader.readAsText(file);
    },
    [knownCards]
  );

  const handleImport = useCallback(async () => {
    setStage("importing");
    let imported = 0;
    for (const entry of validated) {
      const currentQty = quantities.get(entry.cardNumber) ?? 0;
      await updateQuantity.mutateAsync({
        cardNumber: entry.cardNumber,
        quantity: currentQty + entry.quantity,
      });
      imported++;
      setImportProgress(Math.round((imported / validated.length) * 100));
    }
    setImportedCount(imported);
    setStage("done");
  }, [validated, quantities, updateQuantity]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div className="fixed inset-x-4 top-[10vh] z-50 mx-auto max-w-lg rounded-2xl bg-[var(--surface)] p-5 shadow-xl md:inset-x-auto md:w-[480px]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Import Cards</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--elevated)]">
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
              Quantities will be added to your existing collection.
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
              Added {importedCount} cards to your collection
            </p>
            <button
              onClick={onClose}
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
```

- [ ] **Step 2: Commit**

```bash
git add components/collection/import-modal.tsx
git commit -m "feat: add collection import modal with text paste and CSV upload"
```

---

### Task 9: Add Import Button to Collection Page

**Files:**
- Modify: `app/collection/page.tsx`

- [ ] **Step 1: Add import button and modal to collection page**

In `app/collection/page.tsx`, add the following changes:

Add to imports:
```typescript
import ImportModal from "@/components/collection/import-modal";
import { Layers, LogIn, Upload } from "lucide-react";
```

(Replace the existing `Layers, LogIn` import from lucide-react.)

Add state for the modal after the existing state declarations:
```typescript
const [importOpen, setImportOpen] = useState(false);
```

Add the import button next to the page title. Replace the `<h1>` line:
```typescript
<div className="flex items-center justify-between">
  <h1 className="text-2xl font-bold">My Collection</h1>
  <button
    onClick={() => setImportOpen(true)}
    className="flex items-center gap-1.5 rounded-lg bg-[var(--elevated)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
  >
    <Upload size={15} />
    Import
  </button>
</div>
```

Add the modal at the end of the return statement, just before the closing `</div>`:
```typescript
<ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
```

- [ ] **Step 2: Verify the full app builds**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add app/collection/page.tsx
git commit -m "feat: add import button and modal to collection page"
```

---

### Task 10: Final Verification

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: No lint errors.

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Manual verification checklist**

Run `npm run dev` and verify:
- [ ] `/` shows guest landing when not logged in (hero + features + CTAs)
- [ ] `/` shows dashboard with stats, deck progress, and worth selling when logged in
- [ ] Stats row shows 4 widgets (total cards, unique, collection value, surplus value)
- [ ] Deck progress shows progress bars for each deck
- [ ] Worth selling shows top 5 surplus cards by value
- [ ] Empty states render correctly when collection/decks/surplus are empty
- [ ] Navigation has Home tab in both mobile bottom bar and desktop top bar
- [ ] Home tab is highlighted only on `/`, not on other routes
- [ ] Logo links to `/` instead of `/database`
- [ ] Collection page has Import button in header
- [ ] Import modal opens with Paste Text and Upload CSV tabs
- [ ] Pasting `BT1-001 3` and clicking Preview shows the card
- [ ] Uploading a CSV file with card_number,quantity columns works
- [ ] Import merges (adds) quantities to existing collection
- [ ] Unknown card numbers show as errors in preview
- [ ] Import progress bar and success message display correctly

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address issues found during final verification"
```
