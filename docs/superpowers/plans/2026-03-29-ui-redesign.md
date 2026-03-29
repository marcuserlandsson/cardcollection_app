# CardBoard UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the DigiCollect app (renamed to CardBoard) with a premium dark slate palette, Inter font, Lucide icons, and polished component design.

**Architecture:** CSS variable-driven theming with new color tokens in globals.css. All components updated to use new palette. Lucide React icons replace emoji throughout. App renamed from DigiCollect to CardBoard.

**Tech Stack:** Next.js, Tailwind CSS v4, lucide-react, Inter (Google Fonts)

---

## File Map

### New dependencies
- `lucide-react` — Icon library

### Files to modify
| File | Responsibility |
|------|---------------|
| `package.json` | Add lucide-react dependency |
| `app/globals.css` | Replace entire color palette with new design system |
| `app/layout.tsx` | Add Inter font, update metadata to CardBoard |
| `components/nav/top-nav-bar.tsx` | Glass nav, pill tabs with icons, rename to CardBoard |
| `components/nav/bottom-tab-bar.tsx` | Lucide icons, glass effect, new colors |
| `components/nav/app-shell.tsx` | Update background token usage |
| `components/cards/card-search-bar.tsx` | Icon prefix, new input styling |
| `components/cards/card-filters.tsx` | Colored filter chips with icons, remove dividers |
| `components/cards/card-thumbnail.tsx` | Hover glow/lift effect, updated badge |
| `components/cards/card-grid.tsx` | Updated empty state with icon |
| `components/cards/card-panel.tsx` | Colored tags, stat blocks, new button styles |
| `components/cards/expansion-grid.tsx` | Updated card styling |
| `components/collection/collection-summary.tsx` | Stat blocks with colored icon badges |
| `components/collection/quantity-control.tsx` | Updated button colors |
| `components/decks/deck-list-card.tsx` | Updated card styling, progress bar |
| `components/decks/deck-form.tsx` | Updated input/button styling |
| `components/decks/deck-card-row.tsx` | Icons in quantity buttons, updated status colors |
| `components/sell/sell-card-row.tsx` | Icons for price/surplus |
| `components/sell/sell-summary.tsx` | Stat blocks with icons |
| `app/database/page.tsx` | Icon on back button, updated heading |
| `app/collection/page.tsx` | Updated empty state with icon |
| `app/decks/page.tsx` | Icon on New Deck button, empty state with icon |
| `app/decks/[id]/page.tsx` | Icons on buttons, updated warning |
| `app/sell/page.tsx` | Icon on timestamp, updated empty state |
| `app/login/page.tsx` | Icons on inputs, rename to CardBoard |

---

### Task 1: Install dependencies and update color palette

**Files:**
- Modify: `package.json`
- Modify: `app/globals.css`

- [ ] **Step 1: Install lucide-react**

```bash
npm install lucide-react
```

- [ ] **Step 2: Replace globals.css with new design system**

Replace the entire contents of `app/globals.css` with:

```css
@import "tailwindcss";

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
  --background: #111318;
  --surface: #161921;
  --elevated: #1e2230;
  --border: #252a36;
  --border-light: #2d3344;
  --text-primary: #ebedf0;
  --text-secondary: #9ca3af;
  --text-muted: #6b7280;
  --text-dim: #4b5563;
  --accent: #2dd4a8;
  --accent-hover: #26b892;
  --accent-translucent: rgba(45, 212, 168, 0.12);
  --accent-border: rgba(45, 212, 168, 0.3);
  --accent-glow: rgba(45, 212, 168, 0.1);
  --red: #f87171;
  --red-translucent: rgba(239, 68, 68, 0.1);
  --red-border: rgba(239, 68, 68, 0.25);
  --blue: #60a5fa;
  --blue-translucent: rgba(59, 130, 246, 0.1);
  --blue-border: rgba(59, 130, 246, 0.25);
  --yellow: #facc15;
  --yellow-translucent: rgba(234, 179, 8, 0.1);
  --yellow-border: rgba(234, 179, 8, 0.25);
  --purple: #a78bfa;
  --purple-translucent: rgba(139, 92, 246, 0.12);
  --purple-border: rgba(139, 92, 246, 0.25);
  --green: #4ade80;
  --green-translucent: rgba(34, 197, 94, 0.12);
  --green-border: rgba(34, 197, 94, 0.2);
  --success: #4ade80;
  --danger: #f87171;
}

body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background-color: var(--background);
  color: var(--text-primary);
}
```

- [ ] **Step 3: Update layout.tsx with new metadata**

Replace the contents of `app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import Providers from "./providers";
import AppShell from "@/components/nav/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "CardBoard — TCG Collection Tracker",
  description: "Track your TCG card collection, plan decks, and find cards to sell.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Verify the app still starts**

```bash
npm run dev
```

Open http://localhost:3000 — the app should load with the new dark slate background and Inter font. Colors will look off on components until we update them.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json app/globals.css app/layout.tsx
git commit -m "feat: new CardBoard design system — palette, Inter font, lucide-react"
```

---

### Task 2: Redesign navigation components

**Files:**
- Modify: `components/nav/top-nav-bar.tsx`
- Modify: `components/nav/bottom-tab-bar.tsx`
- Modify: `components/nav/app-shell.tsx`

- [ ] **Step 1: Rewrite top-nav-bar.tsx**

Replace the entire contents of `components/nav/top-nav-bar.tsx` with:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Search, Layers, SquareStack, TrendingUp, LogOut, LogIn } from "lucide-react";
import type { User } from "@supabase/supabase-js";

const tabs = [
  { href: "/database", label: "Database", icon: Search },
  { href: "/collection", label: "Collection", icon: Layers },
  { href: "/decks", label: "Decks", icon: SquareStack },
  { href: "/sell", label: "Sell", icon: TrendingUp },
];

export default function TopNavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/database");
    router.refresh();
  }

  return (
    <nav className="hidden border-b border-[var(--accent-border)] bg-[var(--surface)]/80 backdrop-blur-xl md:block">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2.5">
        <Link href="/database" className="text-lg font-bold text-[var(--text-primary)]">
          Card<span className="text-[var(--accent)]">Board</span>
        </Link>
        <div className="flex items-center gap-0.5 rounded-lg bg-[var(--elevated)] p-0.5">
          {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[var(--accent)] text-[var(--background)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </Link>
            );
          })}
        </div>
        {user ? (
          <button onClick={handleSignOut} className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">
            <LogOut size={15} />
            Sign Out
          </button>
        ) : (
          <Link href="/login" className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-[var(--background)] transition-colors hover:bg-[var(--accent-hover)]">
            <LogIn size={15} />
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Rewrite bottom-tab-bar.tsx**

Replace the entire contents of `components/nav/bottom-tab-bar.tsx` with:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Layers, SquareStack, TrendingUp } from "lucide-react";

const tabs = [
  { href: "/database", label: "Database", icon: Search },
  { href: "/collection", label: "Collection", icon: Layers },
  { href: "/decks", label: "Decks", icon: SquareStack },
  { href: "/sell", label: "Sell", icon: TrendingUp },
];

export default function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-xl md:hidden">
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs transition-colors ${
              isActive
                ? "text-[var(--accent)]"
                : "text-[var(--text-dim)] hover:text-[var(--text-secondary)]"
            }`}
          >
            <Icon size={20} />
            <span className="font-medium">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 3: Verify nav renders correctly**

```bash
npm run dev
```

Check both desktop (top nav with glass blur, pill tabs, Lucide icons) and mobile (bottom bar with icons). CardBoard logo should show.

- [ ] **Step 4: Commit**

```bash
git add components/nav/top-nav-bar.tsx components/nav/bottom-tab-bar.tsx
git commit -m "feat: redesign navigation with glass effect, Lucide icons, CardBoard branding"
```

---

### Task 3: Redesign card search bar and filters

**Files:**
- Modify: `components/cards/card-search-bar.tsx`
- Modify: `components/cards/card-filters.tsx`

- [ ] **Step 1: Rewrite card-search-bar.tsx with icon**

Replace the entire contents of `components/cards/card-search-bar.tsx` with:

```tsx
"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";

interface CardSearchBarProps {
  onSearch: (query: string) => void;
}

export default function CardSearchBar({ onSearch }: CardSearchBarProps) {
  const [value, setValue] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => onSearch(value.trim()), 300);
    return () => clearTimeout(timeout);
  }, [value, onSearch]);

  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border-light)] bg-[var(--elevated)] px-3.5 py-2.5">
      <Search size={16} className="flex-shrink-0 text-[var(--text-dim)]" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search cards by name or number..."
        className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-dim)] outline-none"
      />
    </div>
  );
}
```

- [ ] **Step 2: Rewrite card-filters.tsx with colored chips and icons**

Replace the entire contents of `components/cards/card-filters.tsx` with:

```tsx
"use client";

import { Swords, User, Zap, Egg, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface CardFiltersProps {
  filters: { color?: string; card_type?: string; rarity?: string };
  onChange: (filters: { color?: string; card_type?: string; rarity?: string }) => void;
}

const COLORS: { label: string; color: string; bg: string; border: string }[] = [
  { label: "Red", color: "var(--red)", bg: "var(--red-translucent)", border: "var(--red-border)" },
  { label: "Blue", color: "var(--blue)", bg: "var(--blue-translucent)", border: "var(--blue-border)" },
  { label: "Yellow", color: "var(--yellow)", bg: "var(--yellow-translucent)", border: "var(--yellow-border)" },
  { label: "Green", color: "var(--green)", bg: "var(--green-translucent)", border: "var(--green-border)" },
  { label: "Black", color: "var(--text-secondary)", bg: "var(--elevated)", border: "var(--border-light)" },
  { label: "Purple", color: "var(--purple)", bg: "var(--purple-translucent)", border: "var(--purple-border)" },
  { label: "White", color: "var(--text-primary)", bg: "var(--elevated)", border: "var(--border-light)" },
];

const TYPES: { label: string; icon: LucideIcon }[] = [
  { label: "Digimon", icon: Swords },
  { label: "Tamer", icon: User },
  { label: "Option", icon: Zap },
  { label: "Digi-Egg", icon: Egg },
];

const RARITIES = ["Common", "Uncommon", "Rare", "Super Rare", "Secret Rare"];

export default function CardFilters({ filters, onChange }: CardFiltersProps) {
  function toggle(key: "color" | "card_type" | "rarity", value: string) {
    onChange({
      ...filters,
      [key]: filters[key] === value ? undefined : value,
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {COLORS.map((c) => {
          const active = filters.color === c.label;
          return (
            <button
              key={c.label}
              onClick={() => toggle("color", c.label)}
              className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors"
              style={{
                background: active ? c.bg : "var(--elevated)",
                borderColor: active ? c.border : "var(--border-light)",
                color: active ? c.color : "var(--text-secondary)",
              }}
            >
              {active && <Check size={12} />}
              {c.label}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {TYPES.map((t) => {
          const active = filters.card_type === t.label;
          const Icon = t.icon;
          return (
            <button
              key={t.label}
              onClick={() => toggle("card_type", t.label)}
              className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors"
              style={{
                background: active ? "var(--accent-translucent)" : "var(--elevated)",
                borderColor: active ? "var(--accent-border)" : "var(--border-light)",
                color: active ? "var(--accent)" : "var(--text-secondary)",
              }}
            >
              <Icon size={12} />
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {RARITIES.map((r) => {
          const active = filters.rarity === r;
          return (
            <button
              key={r}
              onClick={() => toggle("rarity", r)}
              className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors"
              style={{
                background: active ? "var(--yellow-translucent)" : "var(--elevated)",
                borderColor: active ? "var(--yellow-border)" : "var(--border-light)",
                color: active ? "var(--yellow)" : "var(--text-secondary)",
              }}
            >
              {active && <Check size={12} />}
              {r}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify search and filters render**

```bash
npm run dev
```

Check the database page — search bar should have a search icon, filter chips should be colored by category.

- [ ] **Step 4: Commit**

```bash
git add components/cards/card-search-bar.tsx components/cards/card-filters.tsx
git commit -m "feat: redesign search bar with icon, colored filter chips with category icons"
```

---

### Task 4: Redesign card thumbnail, grid, and expansion grid

**Files:**
- Modify: `components/cards/card-thumbnail.tsx`
- Modify: `components/cards/card-grid.tsx`
- Modify: `components/cards/expansion-grid.tsx`

- [ ] **Step 1: Rewrite card-thumbnail.tsx with hover glow**

Replace the entire contents of `components/cards/card-thumbnail.tsx` with:

```tsx
import Image from "next/image";
import { getCardImageUrl } from "@/lib/utils";
import type { Card } from "@/lib/types";

interface CardThumbnailProps {
  card: Card;
  quantity?: number;
  onClick: (card: Card) => void;
}

export default function CardThumbnail({ card, quantity, onClick }: CardThumbnailProps) {
  return (
    <button
      onClick={() => onClick(card)}
      className="group relative overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] transition-all duration-200 hover:-translate-y-1 hover:border-[var(--accent-border)] hover:shadow-[0_4px_16px_var(--accent-glow)]"
    >
      <div className="relative aspect-[5/7]">
        <Image
          src={getCardImageUrl(card.card_number)}
          alt={card.name}
          fill
          sizes="(max-width: 768px) 33vw, 20vw"
          className="object-cover"
        />
        {quantity !== undefined && quantity > 0 && (
          <span className="absolute right-1 top-1 rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs font-bold text-[var(--background)]">
            x{quantity}
          </span>
        )}
      </div>
      <div className="p-2">
        <p className="truncate text-xs font-medium">{card.name}</p>
        <p className="text-xs text-[var(--text-muted)]">{card.card_number}</p>
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Rewrite card-grid.tsx with icon empty state**

Replace the entire contents of `components/cards/card-grid.tsx` with:

```tsx
import { Search } from "lucide-react";
import type { Card } from "@/lib/types";
import CardThumbnail from "./card-thumbnail";

interface CardGridProps {
  cards: Card[];
  quantities?: Map<string, number>;
  onCardClick: (card: Card) => void;
}

export default function CardGrid({ cards, quantities, onCardClick }: CardGridProps) {
  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Search size={40} className="mb-3 text-[var(--border)]" />
        <p className="text-sm text-[var(--text-muted)]">No cards found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {cards.map((card) => (
        <CardThumbnail
          key={card.card_number}
          card={card}
          quantity={quantities?.get(card.card_number)}
          onClick={onCardClick}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Rewrite expansion-grid.tsx**

Replace the entire contents of `components/cards/expansion-grid.tsx` with:

```tsx
import type { Expansion } from "@/lib/types";

interface ExpansionGridProps {
  expansions: Expansion[];
  onSelect: (expansion: Expansion) => void;
}

export default function ExpansionGrid({ expansions, onSelect }: ExpansionGridProps) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {expansions.map((exp) => (
        <button
          key={exp.code}
          onClick={() => onSelect(exp)}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--accent-border)] hover:shadow-[0_4px_16px_var(--accent-glow)]"
        >
          <div className="text-sm font-bold text-[var(--accent)]">{exp.code}</div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">{exp.card_count} cards</div>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Verify card display**

```bash
npm run dev
```

Check database page — cards should have hover glow/lift, empty state should show search icon.

- [ ] **Step 5: Commit**

```bash
git add components/cards/card-thumbnail.tsx components/cards/card-grid.tsx components/cards/expansion-grid.tsx
git commit -m "feat: card thumbnails with hover glow, icon empty states, expansion grid polish"
```

---

### Task 5: Redesign card detail panel

**Files:**
- Modify: `components/cards/card-panel.tsx`

- [ ] **Step 1: Rewrite card-panel.tsx with colored tags and stat blocks**

Replace the entire contents of `components/cards/card-panel.tsx` with:

```tsx
"use client";

import { useEffect } from "react";
import Image from "next/image";
import { getCardImageUrl, formatPrice } from "@/lib/utils";
import { useCardPrice } from "@/lib/hooks/use-prices";
import { Coins } from "lucide-react";
import QuantityControl from "@/components/collection/quantity-control";
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

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (!card) return null;

  const colorStyle = COLOR_STYLES[card.color] ?? { color: "var(--text-secondary)", bg: "var(--elevated)" };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-[var(--surface)] p-5 shadow-xl md:bottom-auto md:right-0 md:top-0 md:left-auto md:w-[400px] md:max-h-full md:rounded-none md:rounded-l-2xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--border)] md:hidden" />
        <div className="flex gap-4">
          <div className="relative h-[180px] w-[128px] flex-shrink-0 overflow-hidden rounded-lg border border-[var(--border)]">
            <Image src={getCardImageUrl(card.card_number)} alt={card.name} fill sizes="128px" className="object-cover" />
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
        <div className="mt-4 rounded-lg bg-[var(--elevated)] p-3">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">My Collection</div>
          <QuantityControl cardNumber={card.card_number} />
        </div>
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

- [ ] **Step 2: Verify detail panel**

```bash
npm run dev
```

Click a card — panel should show colored type/rarity/color tags, stat blocks, green price with coin icon.

- [ ] **Step 3: Commit**

```bash
git add components/cards/card-panel.tsx
git commit -m "feat: redesign card detail panel with colored tags, stat blocks, coin icon"
```

---

### Task 6: Redesign collection components

**Files:**
- Modify: `components/collection/collection-summary.tsx`
- Modify: `components/collection/quantity-control.tsx`

- [ ] **Step 1: Rewrite collection-summary.tsx with icon stat blocks**

Replace the entire contents of `components/collection/collection-summary.tsx` with:

```tsx
"use client";

import { useCollection } from "@/lib/hooks/use-collection";
import { usePrices } from "@/lib/hooks/use-prices";
import { formatPrice } from "@/lib/utils";
import { Layers, Sparkles, Coins } from "lucide-react";

export default function CollectionSummary() {
  const { data: collection } = useCollection();
  const { data: prices } = usePrices();

  const totalCards = collection?.reduce((sum, c) => sum + c.quantity, 0) ?? 0;
  const uniqueCards = collection?.length ?? 0;

  let estimatedValue: number | null = null;
  if (collection && prices) {
    const priceMap = new Map(prices.map((p) => [p.card_number, p.price_trend]));
    estimatedValue = collection.reduce((sum, c) => {
      const price = priceMap.get(c.card_number);
      return sum + (price ? price * c.quantity : 0);
    }, 0);
  }

  const stats = [
    { label: "Total Cards", value: totalCards, icon: Layers, color: "var(--accent)" },
    { label: "Unique", value: uniqueCards, icon: Sparkles, color: "var(--blue)" },
    { label: "Est. Value", value: estimatedValue !== null ? formatPrice(estimatedValue) : "—", icon: Coins, color: "var(--yellow)" },
  ];

  return (
    <div className="flex gap-3">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="flex flex-1 items-center gap-3 rounded-xl bg-[var(--surface)] p-4">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--elevated)]" style={{ color: stat.color }}>
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

- [ ] **Step 2: Rewrite quantity-control.tsx with icon buttons**

Replace the entire contents of `components/collection/quantity-control.tsx` with:

```tsx
"use client";

import { useCollectionQuantity, useUpdateQuantity } from "@/lib/hooks/use-collection";
import { Minus, Plus } from "lucide-react";

interface QuantityControlProps {
  cardNumber: string;
}

export default function QuantityControl({ cardNumber }: QuantityControlProps) {
  const quantity = useCollectionQuantity(cardNumber);
  const { mutate: updateQuantity } = useUpdateQuantity();

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => updateQuantity({ cardNumber, quantity: quantity - 1 })}
        disabled={quantity === 0}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-light)] bg-[var(--elevated)] text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-border)] hover:text-[var(--text-primary)] disabled:opacity-30"
      >
        <Minus size={14} />
      </button>
      <span className="min-w-[2ch] text-center text-lg font-bold">{quantity}</span>
      <button
        onClick={() => updateQuantity({ cardNumber, quantity: quantity + 1 })}
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--background)] transition-colors hover:bg-[var(--accent-hover)]"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Verify collection components**

```bash
npm run dev
```

Check collection page — stat blocks should have colored icons, quantity buttons should have +/- icons.

- [ ] **Step 4: Commit**

```bash
git add components/collection/collection-summary.tsx components/collection/quantity-control.tsx
git commit -m "feat: redesign collection summary with icon stat blocks, icon quantity controls"
```

---

### Task 7: Redesign deck components

**Files:**
- Modify: `components/decks/deck-list-card.tsx`
- Modify: `components/decks/deck-form.tsx`
- Modify: `components/decks/deck-card-row.tsx`

- [ ] **Step 1: Rewrite deck-list-card.tsx**

Replace the entire contents of `components/decks/deck-list-card.tsx` with:

```tsx
import Link from "next/link";
import type { Deck } from "@/lib/types";

interface DeckListCardProps {
  deck: Deck;
  cardCount: number;
  completionPercent: number;
}

export default function DeckListCard({ deck, cardCount, completionPercent }: DeckListCardProps) {
  return (
    <Link href={`/decks/${deck.id}`} className="block rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--accent-border)] hover:shadow-[0_4px_16px_var(--accent-glow)]">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">{deck.name}</h3>
        <span className="text-xs text-[var(--text-muted)]">{cardCount} cards</span>
      </div>
      {deck.description && <p className="mt-1 text-sm text-[var(--text-secondary)]">{deck.description}</p>}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--text-muted)]">Completion</span>
          <span className={completionPercent === 100 ? "font-medium text-[var(--success)]" : "text-[var(--text-primary)]"}>{completionPercent}%</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--elevated)]">
          <div className={`h-full rounded-full transition-all ${completionPercent === 100 ? "bg-[var(--success)]" : "bg-[var(--accent)]"}`} style={{ width: `${completionPercent}%` }} />
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Rewrite deck-form.tsx**

Replace the entire contents of `components/decks/deck-form.tsx` with:

```tsx
"use client";

import { useState } from "react";
import { useCreateDeck } from "@/lib/hooks/use-decks";
import { Plus } from "lucide-react";

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
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Deck name" className="w-full rounded-lg border border-[var(--border-light)] bg-[var(--elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" autoFocus />
      <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="w-full rounded-lg border border-[var(--border-light)] bg-[var(--elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" />
      <div className="flex gap-2">
        <button type="submit" disabled={!name.trim() || isPending} className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--background)] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50">
          <Plus size={15} />
          {isPending ? "Creating..." : "Create Deck"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-[var(--border-light)] bg-[var(--elevated)] px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-border)]">Cancel</button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Rewrite deck-card-row.tsx with icons**

Replace the entire contents of `components/decks/deck-card-row.tsx` with:

```tsx
"use client";

import Image from "next/image";
import { getCardImageUrl } from "@/lib/utils";
import { useUpdateDeckCard } from "@/lib/hooks/use-decks";
import { Minus, Plus } from "lucide-react";
import type { Card } from "@/lib/types";

interface DeckCardRowProps {
  card: Card;
  deckId: string;
  quantityInDeck: number;
  quantityOwned: number;
}

export default function DeckCardRow({ card, deckId, quantityInDeck, quantityOwned }: DeckCardRowProps) {
  const { mutate: updateDeckCard } = useUpdateDeckCard();
  const isMissing = quantityOwned < quantityInDeck;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="relative h-16 w-11 flex-shrink-0 overflow-hidden rounded-md border border-[var(--border)]">
        <Image src={getCardImageUrl(card.card_number)} alt={card.name} fill sizes="44px" className="object-cover" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{card.name}</p>
        <p className="text-xs text-[var(--text-muted)]">{card.card_number}</p>
        <p className={`text-xs font-medium ${isMissing ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
          {isMissing ? `Missing ${quantityInDeck - quantityOwned} of ${quantityInDeck}` : `Owned ${quantityOwned} of ${quantityInDeck}`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => updateDeckCard({ deckId, cardNumber: card.card_number, quantity: quantityInDeck - 1 })} className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border-light)] bg-[var(--elevated)] text-[var(--text-secondary)] hover:border-[var(--accent-border)]">
          <Minus size={13} />
        </button>
        <span className="min-w-[2ch] text-center text-sm font-bold">{quantityInDeck}</span>
        <button onClick={() => updateDeckCard({ deckId, cardNumber: card.card_number, quantity: quantityInDeck + 1 })} className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--accent)] text-[var(--background)] hover:bg-[var(--accent-hover)]">
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify deck components**

```bash
npm run dev
```

Check decks page — deck cards should have hover glow, form should have new styling, card rows should have icon buttons.

- [ ] **Step 5: Commit**

```bash
git add components/decks/deck-list-card.tsx components/decks/deck-form.tsx components/decks/deck-card-row.tsx
git commit -m "feat: redesign deck components with hover effects, icon buttons, new input styling"
```

---

### Task 8: Redesign sell components

**Files:**
- Modify: `components/sell/sell-card-row.tsx`
- Modify: `components/sell/sell-summary.tsx`

- [ ] **Step 1: Rewrite sell-summary.tsx with icon stat blocks**

Replace the entire contents of `components/sell/sell-summary.tsx` with:

```tsx
import { formatPrice } from "@/lib/utils";
import { PackageMinus, Coins } from "lucide-react";

interface SellSummaryProps {
  surplusCount: number;
  totalValue: number | null;
}

export default function SellSummary({ surplusCount, totalValue }: SellSummaryProps) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-1 items-center gap-3 rounded-xl bg-[var(--surface)] p-4">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--elevated)]" style={{ color: "var(--purple)" }}>
          <PackageMinus size={18} />
        </div>
        <div>
          <div className="text-lg font-bold">{surplusCount}</div>
          <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Surplus Cards</div>
        </div>
      </div>
      <div className="flex flex-1 items-center gap-3 rounded-xl bg-[var(--surface)] p-4">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--elevated)]" style={{ color: "var(--yellow)" }}>
          <Coins size={18} />
        </div>
        <div>
          <div className="text-lg font-bold">{totalValue !== null ? formatPrice(totalValue) : "—"}</div>
          <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Total Value</div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite sell-card-row.tsx with icons**

Replace the entire contents of `components/sell/sell-card-row.tsx` with:

```tsx
import Image from "next/image";
import { getCardImageUrl, formatPrice } from "@/lib/utils";
import { Coins, PackageMinus } from "lucide-react";
import type { SellableCard } from "@/lib/types";

interface SellCardRowProps {
  item: SellableCard;
  onClick: () => void;
}

export default function SellCardRow({ item, onClick }: SellCardRowProps) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-left transition-all duration-200 hover:border-[var(--accent-border)] hover:shadow-[0_4px_16px_var(--accent-glow)]">
      <div className="relative h-16 w-11 flex-shrink-0 overflow-hidden rounded-md border border-[var(--border)]">
        <Image src={getCardImageUrl(item.card.card_number)} alt={item.card.name} fill sizes="44px" className="object-cover" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{item.card.name}</p>
        <p className="text-xs text-[var(--text-muted)]">{item.card.card_number}</p>
        <p className="flex items-center gap-1 text-xs font-medium text-[var(--yellow)]">
          <PackageMinus size={12} />
          x{item.surplus} surplus
        </p>
      </div>
      <div className="text-right">
        <p className="flex items-center gap-1 text-sm font-bold text-[var(--green)]">
          <Coins size={14} />
          {formatPrice(item.total_value)}
        </p>
        <p className="text-xs text-[var(--text-muted)]">{formatPrice(item.price?.price_trend ?? null)} each</p>
      </div>
    </button>
  );
}
```

- [ ] **Step 3: Verify sell components**

```bash
npm run dev
```

Check sell page — summary should have icon stat blocks, sell rows should have coin/package icons.

- [ ] **Step 4: Commit**

```bash
git add components/sell/sell-summary.tsx components/sell/sell-card-row.tsx
git commit -m "feat: redesign sell components with icon stat blocks, colored price/surplus indicators"
```

---

### Task 9: Update all page files

**Files:**
- Modify: `app/database/page.tsx`
- Modify: `app/collection/page.tsx`
- Modify: `app/decks/page.tsx`
- Modify: `app/decks/[id]/page.tsx`
- Modify: `app/sell/page.tsx`
- Modify: `app/login/page.tsx`

- [ ] **Step 1: Update database/page.tsx**

Replace the entire contents of `app/database/page.tsx` with:

```tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useExpansions, useCardsByExpansion, useCardSearch, useCardsFiltered } from "@/lib/hooks/use-cards";
import { ArrowLeft, Check } from "lucide-react";
import CardSearchBar from "@/components/cards/card-search-bar";
import CardFilters from "@/components/cards/card-filters";
import CardGrid from "@/components/cards/card-grid";
import ExpansionGrid from "@/components/cards/expansion-grid";
import CardPanel from "@/components/cards/card-panel";
import type { Card, Expansion } from "@/lib/types";

export default function DatabasePage() {
  const searchParams = useSearchParams();
  const [showConfirmed, setShowConfirmed] = useState(false);

  useEffect(() => {
    if (searchParams.get("confirmed") === "true") {
      setShowConfirmed(true);
      const timeout = setTimeout(() => setShowConfirmed(false), 5000);
      return () => clearTimeout(timeout);
    }
  }, [searchParams]);

  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<{ color?: string; card_type?: string; rarity?: string }>({});
  const [selectedExpansion, setSelectedExpansion] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const { data: expansions, isLoading: loadingExpansions } = useExpansions();
  const { data: expansionCards, isLoading: loadingExpansionCards } = useCardsByExpansion(selectedExpansion);
  const { data: searchResults, isLoading: loadingSearch } = useCardSearch(searchQuery);
  const { data: filteredCards, isLoading: loadingFiltered } = useCardsFiltered(filters);

  const hasActiveSearch = searchQuery.length >= 2;
  const hasActiveFilters = Object.values(filters).some(Boolean);
  const showExpansions = !hasActiveSearch && !hasActiveFilters && !selectedExpansion;

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) setSelectedExpansion(null);
  }, []);

  const handleFilterChange = useCallback(
    (newFilters: { color?: string; card_type?: string; rarity?: string }) => {
      setFilters(newFilters);
      if (Object.values(newFilters).some(Boolean)) setSelectedExpansion(null);
    }, []
  );

  const handleExpansionSelect = useCallback((exp: Expansion) => {
    setSelectedExpansion(exp.code);
    setSearchQuery("");
    setFilters({});
  }, []);

  const handleCardClick = useCallback((card: Card) => { setSelectedCard(card); }, []);
  const handleClosePanel = useCallback(() => { setSelectedCard(null); }, []);
  const handleBack = useCallback(() => { setSelectedExpansion(null); }, []);

  let displayCards: Card[] | undefined;
  let isLoading = false;

  if (hasActiveSearch) { displayCards = searchResults; isLoading = loadingSearch; }
  else if (hasActiveFilters) { displayCards = filteredCards; isLoading = loadingFiltered; }
  else if (selectedExpansion) { displayCards = expansionCards; isLoading = loadingExpansionCards; }

  return (
    <div className="space-y-4">
      {showConfirmed && (
        <div className="flex items-center gap-2 rounded-xl border bg-[var(--green-translucent)] p-3 text-sm font-medium text-[var(--success)]" style={{ borderColor: "var(--green-border)" }}>
          <Check size={16} />
          <span className="flex-1">Email confirmed! You are now signed in.</span>
          <button onClick={() => setShowConfirmed(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">×</button>
        </div>
      )}
      <h1 className="text-2xl font-bold">Card Database</h1>
      <CardSearchBar onSearch={handleSearch} />
      <CardFilters filters={filters} onChange={handleFilterChange} />
      {selectedExpansion && !hasActiveSearch && !hasActiveFilters && (
        <button onClick={handleBack} className="flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] hover:underline">
          <ArrowLeft size={14} />
          Back to expansions
        </button>
      )}
      {isLoading && <p className="py-12 text-center text-[var(--text-muted)]">Loading...</p>}
      {showExpansions && !loadingExpansions && expansions && (
        <>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Browse by Expansion</h2>
          <ExpansionGrid expansions={expansions} onSelect={handleExpansionSelect} />
        </>
      )}
      {displayCards && !isLoading && <CardGrid cards={displayCards} onCardClick={handleCardClick} />}
      <CardPanel card={selectedCard} onClose={handleClosePanel} />
    </div>
  );
}
```

- [ ] **Step 2: Update collection/page.tsx**

Replace the auth guard return block and empty state text colors in `app/collection/page.tsx`. Replace the entire file with:

```tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import { useCollection, useCollectionMap } from "@/lib/hooks/use-collection";
import CardSearchBar from "@/components/cards/card-search-bar";
import CardGrid from "@/components/cards/card-grid";
import CollectionSummary from "@/components/collection/collection-summary";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import CardPanel from "@/components/cards/card-panel";
import Link from "next/link";
import { Layers, LogIn } from "lucide-react";
import type { Card } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

const supabase = createClient();

export default function CollectionPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const supabaseAuth = createClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const { data: collection, isLoading } = useCollection();
  const quantities = useCollectionMap();

  useEffect(() => {
    supabaseAuth.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthChecked(true);
    });
  }, [supabaseAuth.auth]);

  const cardNumbers = collection?.map((c) => c.card_number) ?? [];
  const { data: ownedCards } = useQuery<Card[]>({
    queryKey: ["collection-cards", cardNumbers],
    queryFn: async () => {
      if (cardNumbers.length === 0) return [];
      const { data, error } = await supabase.from("cards").select("*").in("card_number", cardNumbers).order("card_number");
      if (error) throw error;
      return data as Card[];
    },
    enabled: cardNumbers.length > 0,
  });

  const filteredCards = ownedCards?.filter((card) => {
    if (searchQuery.length < 2) return true;
    const q = searchQuery.toLowerCase();
    return card.name.toLowerCase().includes(q) || card.card_number.toLowerCase().includes(q);
  });

  const handleSearch = useCallback((query: string) => { setSearchQuery(query); }, []);
  const handleCardClick = useCallback((card: Card) => { setSelectedCard(card); }, []);
  const handleClosePanel = useCallback(() => { setSelectedCard(null); }, []);

  if (authChecked && !user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Layers size={40} className="text-[var(--border)]" />
        <p className="text-[var(--text-muted)]">Sign in to access your collection.</p>
        <Link href="/login" className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--background)] hover:bg-[var(--accent-hover)]">
          <LogIn size={15} />
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My Collection</h1>
      <CollectionSummary />
      <CardSearchBar onSearch={handleSearch} />
      {isLoading && <p className="py-12 text-center text-[var(--text-muted)]">Loading...</p>}
      {!isLoading && cardNumbers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <Layers size={40} className="mb-3 text-[var(--border)]" />
          <p className="text-sm text-[var(--text-muted)]">No cards in your collection yet.</p>
          <p className="text-xs text-[var(--text-dim)]">Browse the database to add some!</p>
        </div>
      )}
      {filteredCards && <CardGrid cards={filteredCards} quantities={quantities} onCardClick={handleCardClick} />}
      <CardPanel card={selectedCard} onClose={handleClosePanel} />
    </div>
  );
}
```

- [ ] **Step 3: Update decks/page.tsx**

Replace the entire contents of `app/decks/page.tsx` with:

```tsx
"use client";

import { useState, useEffect } from "react";
import { useDecks, useAllDeckCards } from "@/lib/hooks/use-decks";
import { useCollection } from "@/lib/hooks/use-collection";
import DeckListCard from "@/components/decks/deck-list-card";
import DeckForm from "@/components/decks/deck-form";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { PlusCircle, SquareStack, LogIn } from "lucide-react";
import type { User } from "@supabase/supabase-js";

export default function DecksPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const supabaseAuth = createClient();
  const [showForm, setShowForm] = useState(false);
  const { data: decks, isLoading } = useDecks();
  const { data: allDeckCards } = useAllDeckCards();
  const { data: collection } = useCollection();

  useEffect(() => {
    supabaseAuth.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthChecked(true);
    });
  }, [supabaseAuth.auth]);

  function getDeckStats(deckId: string) {
    const cards = allDeckCards?.filter((dc) => dc.deck_id === deckId) ?? [];
    const cardCount = cards.reduce((sum, dc) => sum + dc.quantity, 0);
    const collectionMap = new Map(collection?.map((c) => [c.card_number, c.quantity]) ?? []);
    let ownedCount = 0;
    let totalNeeded = 0;
    for (const dc of cards) {
      totalNeeded += dc.quantity;
      ownedCount += Math.min(collectionMap.get(dc.card_number) ?? 0, dc.quantity);
    }
    const completionPercent = totalNeeded > 0 ? Math.round((ownedCount / totalNeeded) * 100) : 100;
    return { cardCount, completionPercent };
  }

  if (authChecked && !user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <SquareStack size={40} className="text-[var(--border)]" />
        <p className="text-[var(--text-muted)]">Sign in to access your decks.</p>
        <Link href="/login" className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--background)] hover:bg-[var(--accent-hover)]">
          <LogIn size={15} />
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Decks</h1>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--background)] transition-colors hover:bg-[var(--accent-hover)]">
            <PlusCircle size={16} />
            New Deck
          </button>
        )}
      </div>
      {showForm && <DeckForm onCreated={() => setShowForm(false)} onCancel={() => setShowForm(false)} />}
      {isLoading && <p className="py-12 text-center text-[var(--text-muted)]">Loading...</p>}
      {!isLoading && decks && decks.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-16">
          <SquareStack size={40} className="mb-3 text-[var(--border)]" />
          <p className="text-sm text-[var(--text-muted)]">No decks yet.</p>
          <p className="text-xs text-[var(--text-dim)]">Create one to start planning!</p>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {decks?.map((deck) => {
          const { cardCount, completionPercent } = getDeckStats(deck.id);
          return <DeckListCard key={deck.id} deck={deck} cardCount={cardCount} completionPercent={completionPercent} />;
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update decks/[id]/page.tsx**

Replace the entire contents of `app/decks/[id]/page.tsx` with:

```tsx
"use client";

import { use, useState, useCallback } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useDeck, useDeckCards, useDeleteDeck } from "@/lib/hooks/use-decks";
import { useCollectionMap } from "@/lib/hooks/use-collection";
import { createClient } from "@/lib/supabase/client";
import DeckCardRow from "@/components/decks/deck-card-row";
import CardSearchBar from "@/components/cards/card-search-bar";
import CardGrid from "@/components/cards/card-grid";
import CardPanel from "@/components/cards/card-panel";
import { ArrowLeft, Plus, Trash2, AlertTriangle, Check, SquareStack } from "lucide-react";
import type { Card } from "@/lib/types";
import { useRouter } from "next/navigation";

const supabase = createClient();

export default function DeckDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: deckId } = use(params);
  const router = useRouter();
  const [addingCards, setAddingCards] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const { data: deck } = useDeck(deckId);
  const { data: deckCards } = useDeckCards(deckId);
  const quantities = useCollectionMap();
  const { mutate: deleteDeck } = useDeleteDeck();

  const cardNumbers = deckCards?.map((dc) => dc.card_number) ?? [];
  const { data: cardsInDeck } = useQuery<Card[]>({
    queryKey: ["deck-detail-cards", cardNumbers],
    queryFn: async () => {
      if (cardNumbers.length === 0) return [];
      const { data, error } = await supabase.from("cards").select("*").in("card_number", cardNumbers).order("card_number");
      if (error) throw error;
      return data as Card[];
    },
    enabled: cardNumbers.length > 0,
  });

  const { data: searchResults } = useQuery<Card[]>({
    queryKey: ["deck-add-search", searchQuery],
    queryFn: async () => {
      const { data, error } = await supabase.from("cards").select("*").or(`name.ilike.%${searchQuery}%,card_number.ilike.%${searchQuery}%`).order("card_number").limit(50);
      if (error) throw error;
      return data as Card[];
    },
    enabled: addingCards && searchQuery.length >= 2,
  });

  const deckCardMap = new Map(deckCards?.map((dc) => [dc.card_number, dc.quantity]) ?? []);

  const missingCount = cardsInDeck?.reduce((count, card) => {
    const needed = deckCardMap.get(card.card_number) ?? 0;
    const owned = quantities.get(card.card_number) ?? 0;
    return count + Math.max(0, needed - owned);
  }, 0) ?? 0;

  const handleSearch = useCallback((query: string) => { setSearchQuery(query); }, []);
  const handleCardClick = useCallback((card: Card) => { setSelectedCard(card); }, []);
  const handleDelete = useCallback(() => {
    if (confirm("Delete this deck?")) {
      deleteDeck(deckId, { onSuccess: () => router.push("/decks") });
    }
  }, [deleteDeck, deckId, router]);

  if (!deck) return <p className="py-12 text-center text-[var(--text-muted)]">Loading...</p>;

  return (
    <div className="space-y-4">
      <Link href="/decks" className="flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] hover:underline">
        <ArrowLeft size={14} />
        Decks
      </Link>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{deck.name}</h1>
          {deck.description && <p className="text-sm text-[var(--text-secondary)]">{deck.description}</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setAddingCards(!addingCards)} className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-[var(--background)] hover:bg-[var(--accent-hover)]">
            {addingCards ? <><Check size={14} /> Done</> : <><Plus size={14} /> Add Cards</>}
          </button>
          <button onClick={handleDelete} className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors" style={{ background: "var(--red-translucent)", borderColor: "var(--red-border)", color: "var(--danger)" }}>
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>
      {missingCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl border p-3 text-sm font-medium" style={{ background: "var(--red-translucent)", borderColor: "var(--red-border)", color: "var(--danger)" }}>
          <AlertTriangle size={16} />
          Missing {missingCount} card{missingCount !== 1 ? "s" : ""} to complete this deck.
        </div>
      )}
      {addingCards && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Search Cards to Add</h2>
          <CardSearchBar onSearch={handleSearch} />
          {searchResults && <CardGrid cards={searchResults} quantities={quantities} onCardClick={handleCardClick} />}
        </div>
      )}
      <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        Deck Cards ({cardNumbers.length} unique, {deckCards?.reduce((s, dc) => s + dc.quantity, 0) ?? 0} total)
      </h2>
      {cardsInDeck && cardsInDeck.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <SquareStack size={40} className="mb-3 text-[var(--border)]" />
          <p className="text-sm text-[var(--text-muted)]">No cards in this deck yet.</p>
          <p className="text-xs text-[var(--text-dim)]">Click "Add Cards" to search and add.</p>
        </div>
      )}
      <div className="space-y-2">
        {cardsInDeck?.map((card) => (
          <DeckCardRow key={card.card_number} card={card} deckId={deckId} quantityInDeck={deckCardMap.get(card.card_number) ?? 0} quantityOwned={quantities.get(card.card_number) ?? 0} />
        ))}
      </div>
      <CardPanel card={selectedCard} onClose={() => setSelectedCard(null)} />
    </div>
  );
}
```

- [ ] **Step 5: Update sell/page.tsx**

Replace the entire contents of `app/sell/page.tsx` with:

```tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import { useCollection } from "@/lib/hooks/use-collection";
import { useAllDeckCards } from "@/lib/hooks/use-decks";
import { usePrices } from "@/lib/hooks/use-prices";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { buildSellableCards, timeAgo } from "@/lib/utils";
import SellSummary from "@/components/sell/sell-summary";
import SellCardRow from "@/components/sell/sell-card-row";
import CardPanel from "@/components/cards/card-panel";
import Link from "next/link";
import { TrendingUp, Clock, LogIn } from "lucide-react";
import type { Card } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

const supabase = createClient();

export default function SellPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const supabaseAuth = createClient();
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const { data: collection } = useCollection();
  const { data: allDeckCards } = useAllDeckCards();
  const { data: prices } = usePrices();

  useEffect(() => {
    supabaseAuth.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthChecked(true);
    });
  }, [supabaseAuth.auth]);

  const cardNumbers = collection?.map((c) => c.card_number) ?? [];
  const { data: cards } = useQuery<Card[]>({
    queryKey: ["sell-cards", cardNumbers],
    queryFn: async () => {
      if (cardNumbers.length === 0) return [];
      const { data, error } = await supabase.from("cards").select("*").in("card_number", cardNumbers);
      if (error) throw error;
      return data as Card[];
    },
    enabled: cardNumbers.length > 0,
  });

  const sellableCards = cards && collection && allDeckCards && prices
    ? buildSellableCards(cards, collection, allDeckCards ?? [], prices)
    : [];

  const totalSurplus = sellableCards.reduce((sum, s) => sum + s.surplus, 0);
  const totalValue = sellableCards.reduce((sum, s) => sum + (s.total_value ?? 0), 0);

  const latestFetch = prices?.reduce((latest, p) => {
    return !latest || p.fetched_at > latest ? p.fetched_at : latest;
  }, "" as string);

  const handleCardClick = useCallback((card: Card) => { setSelectedCard(card); }, []);

  if (authChecked && !user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <TrendingUp size={40} className="text-[var(--border)]" />
        <p className="text-[var(--text-muted)]">Sign in to access the sell advisor.</p>
        <Link href="/login" className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--background)] hover:bg-[var(--accent-hover)]">
          <LogIn size={15} />
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Sell Advisor</h1>
      {sellableCards.length > 0 && <SellSummary surplusCount={totalSurplus} totalValue={totalValue > 0 ? totalValue : null} />}
      {latestFetch && (
        <p className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <Clock size={12} />
          Prices updated {timeAgo(latestFetch)}
        </p>
      )}
      {sellableCards.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <TrendingUp size={40} className="mb-3 text-[var(--border)]" />
          <p className="text-sm text-[var(--text-muted)]">No surplus cards to sell.</p>
          <p className="text-xs text-[var(--text-dim)]">Cards beyond your playset limit or deck needs will appear here.</p>
        </div>
      )}
      <div className="space-y-2">
        {sellableCards.map((item) => (
          <SellCardRow key={item.card.card_number} item={item} onClick={() => handleCardClick(item.card)} />
        ))}
      </div>
      <CardPanel card={selectedCard} onClose={() => setSelectedCard(null)} />
    </div>
  );
}
```

- [ ] **Step 6: Update login/page.tsx**

Replace the entire contents of `app/login/page.tsx` with:

```tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setError("Check your email for a confirmation link!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/database");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Card<span className="text-[var(--accent)]">Board</span></h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{isSignUp ? "Create an account" : "Sign in to your account"}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border-light)] bg-[var(--elevated)] px-3.5 py-2.5">
            <Mail size={16} className="flex-shrink-0 text-[var(--text-dim)]" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className="w-full bg-transparent text-sm outline-none placeholder-[var(--text-dim)]" />
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border-light)] bg-[var(--elevated)] px-3.5 py-2.5">
            <Lock size={16} className="flex-shrink-0 text-[var(--text-dim)]" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required minLength={6} className="w-full bg-transparent text-sm outline-none placeholder-[var(--text-dim)]" />
          </div>
          {error && <p className={`text-sm ${error.includes("Check your email") ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--background)] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50">{loading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}</button>
        </form>
        <p className="text-center text-sm text-[var(--text-muted)]">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button onClick={() => { setIsSignUp(!isSignUp); setError(null); }} className="font-medium text-[var(--accent)] hover:underline">{isSignUp ? "Sign in" : "Sign up"}</button>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Verify all pages**

```bash
npm run dev
```

Check every page: database, collection, decks, deck detail, sell, login. Verify:
- CardBoard branding shows in nav and login
- All icons render (Lucide)
- Colors are correct (teal accent, colored filters, green prices)
- Hover effects work on cards and buttons
- Empty states show icons
- Auth guard pages show icons

- [ ] **Step 8: Commit**

```bash
git add app/database/page.tsx app/collection/page.tsx app/decks/page.tsx "app/decks/[id]/page.tsx" app/sell/page.tsx app/login/page.tsx
git commit -m "feat: update all pages with CardBoard branding, Lucide icons, new color tokens"
```

---

### Task 10: Final build verification

**Files:** None (verification only)

- [ ] **Step 1: Run linter**

```bash
npm run lint
```

Fix any lint errors that appear.

- [ ] **Step 2: Run production build**

```bash
npm run build
```

Ensure no build errors.

- [ ] **Step 3: Commit any lint fixes**

If there were lint fixes:

```bash
git add -A
git commit -m "fix: resolve lint errors from UI redesign"
```

- [ ] **Step 4: Update CLAUDE.md with new app name**

In `CLAUDE.md`, update the project overview section to reference "CardBoard" instead of "DigiCollect" and note the general TCG focus instead of Digimon-only.

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with CardBoard branding"
```
