# Enhanced Card Detail Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the card detail panel with variant thumbnails, deck usage, expansion pills, and push-content behavior on desktop (no overlay, grid stays interactive).

**Architecture:** A React context (`PanelContext`) communicates panel open/closed state from `CardPanel` to `AppShell`, which applies right padding on desktop. The panel itself gets three new child components for variants, deck usage, and expansions, plus two new hooks. Mobile behavior unchanged (bottom sheet with overlay).

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Lucide React, TanStack Query, Supabase

---

## File Structure

### New Files
- `contexts/panel-context.tsx` — React context for panel open/close state
- `components/cards/card-variants.tsx` — Variant thumbnail row
- `components/cards/card-deck-usage.tsx` — Deck usage list
- `components/cards/card-expansions.tsx` — Expansion pills

### Modified Files
- `lib/hooks/use-cards.ts` — Add `useCardVariants` and `useCardExpansions` hooks
- `components/cards/card-panel.tsx` — New sections, slide transition, push-content on desktop
- `components/nav/app-shell.tsx` — Wrap children in PanelProvider, apply right padding
- `app/layout.tsx` — Wrap app in PanelProvider (above AppShell)

---

### Task 1: Panel Context

**Files:**
- Create: `contexts/panel-context.tsx`

- [ ] **Step 1: Create panel context**

Create `contexts/panel-context.tsx`:

```typescript
"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface PanelContextValue {
  isPanelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
}

const PanelContext = createContext<PanelContextValue>({
  isPanelOpen: false,
  openPanel: () => {},
  closePanel: () => {},
});

export function PanelProvider({ children }: { children: ReactNode }) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const openPanel = useCallback(() => setIsPanelOpen(true), []);
  const closePanel = useCallback(() => setIsPanelOpen(false), []);

  return (
    <PanelContext.Provider value={{ isPanelOpen, openPanel, closePanel }}>
      {children}
    </PanelContext.Provider>
  );
}

export function usePanelContext() {
  return useContext(PanelContext);
}
```

- [ ] **Step 2: Commit**

```bash
git add contexts/panel-context.tsx
git commit -m "feat: add panel context for push-content behavior"
```

---

### Task 2: New Hooks (Variants & Expansions)

**Files:**
- Modify: `lib/hooks/use-cards.ts`

- [ ] **Step 1: Add useCardVariants and useCardExpansions hooks**

Add these two hooks at the end of `lib/hooks/use-cards.ts`:

```typescript
import type { Card, Expansion, CardVariant } from "@/lib/types";
```

(Update the existing import to include `CardVariant`.)

```typescript
export function useCardVariants(cardNumber: string | null) {
  return useQuery<CardVariant[]>({
    queryKey: ["card-variants", cardNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("card_variants")
        .select("*")
        .eq("card_number", cardNumber!)
        .order("variant_index");
      if (error) throw error;
      return data as CardVariant[];
    },
    enabled: !!cardNumber,
  });
}

export function useCardExpansions(cardNumber: string | null) {
  return useQuery<{ card_number: string; expansion: string }[]>({
    queryKey: ["card-expansions", cardNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("card_expansions")
        .select("card_number, expansion")
        .eq("card_number", cardNumber!);
      if (error) throw error;
      return data as { card_number: string; expansion: string }[];
    },
    enabled: !!cardNumber,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/hooks/use-cards.ts
git commit -m "feat: add useCardVariants and useCardExpansions hooks"
```

---

### Task 3: Card Variants Component

**Files:**
- Create: `components/cards/card-variants.tsx`

- [ ] **Step 1: Create card variants component**

Create `components/cards/card-variants.tsx`:

```typescript
"use client";

import { useState } from "react";
import Image from "next/image";
import { useCardVariants } from "@/lib/hooks/use-cards";
import { getCardImageUrl } from "@/lib/utils";

interface CardVariantsProps {
  cardNumber: string;
  onVariantSelect: (imageUrl: string) => void;
}

export default function CardVariants({ cardNumber, onVariantSelect }: CardVariantsProps) {
  const { data: variants } = useCardVariants(cardNumber);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  if (!variants || variants.length === 0) return null;

  const baseImageUrl = getCardImageUrl(cardNumber);

  const handleSelect = (index: number, imageUrl: string) => {
    setSelectedIndex(index);
    onVariantSelect(imageUrl);
  };

  return (
    <div className="mt-4 rounded-lg bg-[var(--elevated)] p-3">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Variants</div>
      <div className="flex gap-2">
        <button
          onClick={() => handleSelect(-1, baseImageUrl)}
          className={`relative h-[50px] w-[36px] flex-shrink-0 overflow-hidden rounded border-2 transition-colors ${
            selectedIndex === -1 ? "border-[var(--accent)]" : "border-[var(--border)] hover:border-[var(--border-light)]"
          }`}
        >
          <Image src={baseImageUrl} alt="Regular" fill sizes="36px" className="object-cover" />
        </button>
        {variants.map((variant, i) => {
          const imageUrl = variant.alt_art_url || baseImageUrl;
          return (
            <button
              key={variant.id}
              onClick={() => handleSelect(i, imageUrl)}
              className={`relative h-[50px] w-[36px] flex-shrink-0 overflow-hidden rounded border-2 transition-colors ${
                selectedIndex === i ? "border-[var(--accent)]" : "border-[var(--border)] hover:border-[var(--border-light)]"
              }`}
              title={variant.variant_name}
            >
              <Image src={imageUrl} alt={variant.variant_name} fill sizes="36px" className="object-cover" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/cards/card-variants.tsx
git commit -m "feat: add card variants thumbnail component"
```

---

### Task 4: Card Deck Usage Component

**Files:**
- Create: `components/cards/card-deck-usage.tsx`

- [ ] **Step 1: Create card deck usage component**

Create `components/cards/card-deck-usage.tsx`:

```typescript
"use client";

import Link from "next/link";
import { useDecks, useAllDeckCards } from "@/lib/hooks/use-decks";

interface CardDeckUsageProps {
  cardNumber: string;
}

export default function CardDeckUsage({ cardNumber }: CardDeckUsageProps) {
  const { data: decks } = useDecks();
  const { data: allDeckCards } = useAllDeckCards();

  if (!decks || !allDeckCards) return null;

  const usages = allDeckCards
    .filter((dc) => dc.card_number === cardNumber)
    .map((dc) => {
      const deck = decks.find((d) => d.id === dc.deck_id);
      return deck ? { deckId: deck.id, deckName: deck.name, quantity: dc.quantity } : null;
    })
    .filter(Boolean) as { deckId: string; deckName: string; quantity: number }[];

  return (
    <div className="mt-3 rounded-lg bg-[var(--elevated)] p-3">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Used in Decks</div>
      {usages.length === 0 ? (
        <p className="text-xs text-[var(--text-dim)]">Not used in any deck</p>
      ) : (
        <div className="space-y-1.5">
          {usages.map((usage) => (
            <Link
              key={usage.deckId}
              href={`/decks/${usage.deckId}`}
              className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-[var(--surface)]"
            >
              <span className="text-[var(--text-secondary)]">{usage.deckName}</span>
              <span className="text-xs font-medium text-[var(--accent)]">x{usage.quantity}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/cards/card-deck-usage.tsx
git commit -m "feat: add card deck usage component"
```

---

### Task 5: Card Expansions Component

**Files:**
- Create: `components/cards/card-expansions.tsx`

- [ ] **Step 1: Create card expansions component**

Create `components/cards/card-expansions.tsx`:

```typescript
"use client";

import { useCardExpansions } from "@/lib/hooks/use-cards";

interface CardExpansionsProps {
  cardNumber: string;
}

export default function CardExpansions({ cardNumber }: CardExpansionsProps) {
  const { data: expansions } = useCardExpansions(cardNumber);

  if (!expansions || expansions.length === 0) return null;

  return (
    <div className="mt-3 rounded-lg bg-[var(--elevated)] p-3">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Expansions</div>
      <div className="flex flex-wrap gap-1.5">
        {expansions.map((exp) => (
          <span
            key={exp.expansion}
            className="rounded-md bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]"
          >
            {exp.expansion}
          </span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/cards/card-expansions.tsx
git commit -m "feat: add card expansions pill component"
```

---

### Task 6: Enhanced Card Panel

**Files:**
- Modify: `components/cards/card-panel.tsx`

- [ ] **Step 1: Rewrite card panel with new sections and push-content behavior**

Replace the full contents of `components/cards/card-panel.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ImageOff, X, Coins } from "lucide-react";
import { formatPrice, getCardImageUrl } from "@/lib/utils";
import { useCardPrice } from "@/lib/hooks/use-prices";
import { usePanelContext } from "@/contexts/panel-context";
import QuantityControl from "@/components/collection/quantity-control";
import CardVariants from "@/components/cards/card-variants";
import CardDeckUsage from "@/components/cards/card-deck-usage";
import CardExpansions from "@/components/cards/card-expansions";
import type { Card } from "@/lib/types";

const COLOR_STYLES: Record<string, { color: string; bg: string }> = {
  Red: { color: "var(--red)", bg: "var(--red-translucent)" },
  Blue: { color: "var(--blue)", bg: "var(--blue-translucent)" },
  Yellow: { color: "var(--yellow)", bg: "var(--yellow-translucent)" },
  Green: { color: "var(--green)", bg: "var(--green-translucent)" },
  Black: { color: "var(--text-secondary)", bg: "var(--elevated)" },
  Purple: { color: "var(--purple)", bg: "var(--purple-translucent)" },
  White: { color: "var(--text-primary)", bg: "var(--elevated)" },
};

export default function CardPanel({ card, onClose }: { card: Card | null; onClose: () => void }) {
  const { data: price } = useCardPrice(card?.card_number ?? null);
  const { openPanel, closePanel } = usePanelContext();
  const [variantImageUrl, setVariantImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (card) {
      openPanel();
      setVariantImageUrl(null);
      setImageError(false);
    } else {
      closePanel();
    }
  }, [card, openPanel, closePanel]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (!card) return null;

  const colorStyle = COLOR_STYLES[card.color] ?? { color: "var(--text-secondary)", bg: "var(--elevated)" };
  const displayImageUrl = variantImageUrl || getCardImageUrl(card.card_number);

  return (
    <>
      {/* Mobile overlay only */}
      <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={onClose} />

      {/* Panel */}
      <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-[var(--surface)] p-5 shadow-xl transition-transform duration-300 md:bottom-0 md:right-0 md:top-0 md:left-auto md:w-[400px] md:max-h-full md:rounded-none md:border-l md:border-[var(--border)]">
        {/* Mobile drag handle */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--border)] md:hidden" />

        {/* Desktop close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 hidden rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--elevated)] md:block"
        >
          <X size={18} />
        </button>

        {/* Card Header */}
        <div className="flex gap-4">
          <div className="relative h-[180px] w-[128px] flex-shrink-0 overflow-hidden rounded-lg border border-[var(--border)]">
            {imageError ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-[var(--elevated)] text-[var(--text-dim)]">
                <ImageOff size={20} />
                <span className="text-[10px]">{card.card_number}</span>
              </div>
            ) : (
              <Image
                key={displayImageUrl}
                src={displayImageUrl}
                alt={card.name}
                fill
                sizes="128px"
                className="object-cover"
                onError={() => setImageError(true)}
              />
            )}
          </div>
          <div className="flex-1 space-y-2.5">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">{card.name}</h2>
            <p className="text-sm text-[var(--text-muted)]">{card.card_number}</p>
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-md px-2 py-0.5 text-xs font-medium" style={{ background: "var(--purple-translucent)", color: "var(--purple)" }}>{card.card_type}</span>
              {card.rarity && <span className="rounded-md px-2 py-0.5 text-xs font-medium" style={{ background: "var(--yellow-translucent)", color: "var(--yellow)" }}>{card.rarity}</span>}
              <span className="rounded-md px-2 py-0.5 text-xs font-medium" style={{ background: colorStyle.bg, color: colorStyle.color }}>{card.color}</span>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        {(card.level !== null || card.play_cost !== null || card.dp !== null || card.evolution_cost !== null) && (
          <div className="mt-4 flex gap-2">
            {card.level !== null && (
              <div className="flex-1 rounded-lg bg-[var(--elevated)] px-3 py-2 text-center">
                <div className="text-sm font-bold text-[var(--text-primary)]">Lv.{card.level}</div>
                <div className="text-[10px] uppercase text-[var(--text-dim)]">Level</div>
              </div>
            )}
            {card.play_cost !== null && (
              <div className="flex-1 rounded-lg bg-[var(--elevated)] px-3 py-2 text-center">
                <div className="text-sm font-bold text-[var(--text-primary)]">{card.play_cost}</div>
                <div className="text-[10px] uppercase text-[var(--text-dim)]">Cost</div>
              </div>
            )}
            {card.dp !== null && (
              <div className="flex-1 rounded-lg bg-[var(--elevated)] px-3 py-2 text-center">
                <div className="text-sm font-bold text-[var(--text-primary)]">{card.dp}</div>
                <div className="text-[10px] uppercase text-[var(--text-dim)]">DP</div>
              </div>
            )}
            {card.evolution_cost !== null && (
              <div className="flex-1 rounded-lg bg-[var(--elevated)] px-3 py-2 text-center">
                <div className="text-sm font-bold text-[var(--text-primary)]">{card.evolution_cost}</div>
                <div className="text-[10px] uppercase text-[var(--text-dim)]">Evo</div>
              </div>
            )}
          </div>
        )}

        {/* Variants */}
        <CardVariants
          cardNumber={card.card_number}
          onVariantSelect={(url) => {
            setVariantImageUrl(url);
            setImageError(false);
          }}
        />

        {/* Collection */}
        <div className="mt-3 rounded-lg bg-[var(--elevated)] p-3">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">My Collection</div>
          <QuantityControl cardNumber={card.card_number} />
        </div>

        {/* Deck Usage */}
        <CardDeckUsage cardNumber={card.card_number} />

        {/* Expansions */}
        <CardExpansions cardNumber={card.card_number} />

        {/* Price */}
        <div className="mt-3 rounded-lg bg-[var(--elevated)] p-3">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Cardmarket Price</div>
          <div className="flex items-baseline gap-3">
            <span className="flex items-center gap-1.5 text-lg font-bold text-[var(--green)]">
              <Coins size={16} />
              {formatPrice(price?.price_trend ?? null)}
            </span>
            {price?.price_low !== null && price?.price_low !== undefined && (
              <span className="text-xs text-[var(--text-muted)]">Low: {formatPrice(price.price_low)}</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/cards/card-panel.tsx
git commit -m "feat: enhance card panel with variants, deck usage, expansions, and push-content"
```

---

### Task 7: AppShell Push-Content Integration

**Files:**
- Modify: `components/nav/app-shell.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Wrap app in PanelProvider**

In `app/layout.tsx`, add the PanelProvider. Add the import:

```typescript
import { PanelProvider } from "@/contexts/panel-context";
```

Wrap the `<AppShell>` inside `<PanelProvider>`:

```typescript
<PanelProvider>
  <AppShell>{children}</AppShell>
</PanelProvider>
```

- [ ] **Step 2: Update AppShell to respond to panel state**

Replace `components/nav/app-shell.tsx` with:

```typescript
"use client";

import BottomTabBar from "./bottom-tab-bar";
import TopNavBar from "./top-nav-bar";
import { usePanelContext } from "@/contexts/panel-context";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { isPanelOpen } = usePanelContext();

  return (
    <>
      <TopNavBar />
      <main
        className={`mx-auto max-w-7xl px-4 pb-20 pt-4 transition-[padding] duration-300 md:px-6 md:pb-6 ${
          isPanelOpen ? "md:pr-[416px]" : ""
        }`}
      >
        {children}
      </main>
      <BottomTabBar />
    </>
  );
}
```

Note: `md:pr-[416px]` is 400px panel + 16px gap so content doesn't butt up against the panel edge.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx components/nav/app-shell.tsx
git commit -m "feat: integrate panel context into AppShell for push-content layout"
```

---

### Task 8: Final Verification

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: No lint errors (beyond the pre-existing database page one if not yet fixed).

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Manual verification checklist**

Run `npm run dev` and verify:
- [ ] Clicking a card in the database opens the panel sliding in from the right
- [ ] On desktop: no dark overlay, card grid is still visible and clickable
- [ ] On desktop: main content shifts left (right padding applied) when panel opens
- [ ] On mobile: bottom sheet with overlay works as before
- [ ] Clicking a different card while panel is open swaps the content
- [ ] Close button (X) appears on desktop, closes panel
- [ ] Escape key closes panel
- [ ] Variant thumbnails appear for cards that have alt arts
- [ ] Clicking a variant thumbnail swaps the main card image
- [ ] "Used in Decks" section shows decks containing the card (or "Not used in any deck")
- [ ] Deck usage rows link to the deck detail page
- [ ] Expansions section shows set code pills
- [ ] Collection quantity control still works
- [ ] Price display still works
- [ ] Panel works on collection page, sell page, and deck detail page too

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address issues found during final verification"
```
