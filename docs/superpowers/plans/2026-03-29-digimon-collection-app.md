# Digimon TCG Collection App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive web app for tracking Digimon TCG card collections, planning decks, and identifying surplus cards worth selling.

**Architecture:** Next.js App Router with Tailwind CSS for the frontend, Supabase (Postgres + Auth + RLS) for the backend, TanStack Query for client-side caching. Python scripts sync card data from the Digimon Card API and prices from Cardmarket/Cardtrader. Hosted on Vercel.

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS v4, @supabase/ssr, @tanstack/react-query v5, Python 3 (data sync scripts)

---

## File Structure

```
cardcollection_app/
├── app/
│   ├── layout.tsx                    # Root layout (html, body, providers, dark theme)
│   ├── page.tsx                      # Redirect to /database
│   ├── providers.tsx                 # QueryClientProvider + SupabaseProvider
│   ├── globals.css                   # Tailwind imports + dark theme base styles
│   ├── database/
│   │   └── page.tsx                  # Database tab: expansion grid + search + filters
│   ├── collection/
│   │   └── page.tsx                  # Collection tab: owned cards + summary stats
│   ├── decks/
│   │   ├── page.tsx                  # Deck list view
│   │   └── [id]/
│   │       └── page.tsx              # Deck detail view
│   ├── sell/
│   │   └── page.tsx                  # Sell advisor tab
│   ├── login/
│   │   └── page.tsx                  # Login/signup page
│   └── auth/
│       └── callback/
│           └── route.ts              # OAuth callback handler
├── components/
│   ├── nav/
│   │   ├── bottom-tab-bar.tsx        # Mobile bottom nav
│   │   ├── top-nav-bar.tsx           # Desktop top nav
│   │   └── app-shell.tsx             # Responsive shell (picks bottom/top nav)
│   ├── cards/
│   │   ├── card-grid.tsx             # Grid of card thumbnails
│   │   ├── card-thumbnail.tsx        # Single card thumbnail with quantity badge
│   │   ├── card-panel.tsx            # Slide-up card detail panel
│   │   ├── card-search-bar.tsx       # Search input
│   │   ├── card-filters.tsx          # Filter chips (color, type, rarity)
│   │   └── expansion-grid.tsx        # Grid of expansion tiles
│   ├── collection/
│   │   ├── quantity-control.tsx      # +/− buttons for owned quantity
│   │   └── collection-summary.tsx    # Stats banner (total cards, value)
│   ├── decks/
│   │   ├── deck-list-card.tsx        # Deck card in list (name, count, completion %)
│   │   ├── deck-card-row.tsx         # Card row in deck detail (quantity, owned status)
│   │   └── deck-form.tsx             # Create/edit deck form
│   └── sell/
│       ├── sell-summary.tsx          # "X surplus cards worth €Y" banner
│       └── sell-card-row.tsx         # Sellable card row (surplus, price, value)
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser Supabase client
│   │   ├── server.ts                 # Server Supabase client
│   │   └── middleware.ts             # Auth session refresh logic
│   ├── hooks/
│   │   ├── use-cards.ts              # useQuery hooks for cards, expansions, search
│   │   ├── use-collection.ts         # useQuery/useMutation for collection CRUD
│   │   ├── use-decks.ts              # useQuery/useMutation for decks CRUD
│   │   └── use-prices.ts            # useQuery for card prices
│   ├── types.ts                      # TypeScript types for all database tables
│   └── utils.ts                      # Sell logic calculation, formatters
├── middleware.ts                      # Next.js middleware (Supabase session refresh)
├── scripts/
│   ├── sync_cards.py                 # Fetch cards from Digimon Card API → Supabase
│   ├── sync_prices.py                # Fetch prices from Cardmarket/Cardtrader → Supabase
│   └── requirements.txt              # Python dependencies
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql    # Full database schema + RLS policies
├── .github/
│   └── workflows/
│       └── sync-data.yml             # Daily GitHub Actions for card + price sync
├── .env.local.example                # Template for environment variables
├── next.config.ts                    # Next.js config (image domains)
├── tailwind.config.ts                # Tailwind dark theme config
├── package.json
└── tsconfig.json
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `next.config.ts`, `tsconfig.json`, `.env.local.example`

- [ ] **Step 1: Initialize Next.js project**

Run from the repo root:

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm
```

When prompted, accept defaults. This creates the Next.js project in the current directory with TypeScript, Tailwind CSS, ESLint, and App Router.

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr @tanstack/react-query
```

- [ ] **Step 3: Create environment variable template**

Create `.env.local.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Add `.env.local` to `.gitignore` (should already be there from create-next-app).

- [ ] **Step 4: Configure Next.js for external card images**

Replace the contents of `next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "world.digimoncard.com",
        pathname: "/images/cardlist/card/**",
      },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 5: Set up dark theme base styles**

Replace `app/globals.css` with:

```css
@import "tailwindcss";

:root {
  --background: #0f1117;
  --surface: #1a1d2e;
  --surface-hover: #242838;
  --border: #2a2e3f;
  --text-primary: #e4e4e7;
  --text-secondary: #a1a1aa;
  --accent: #3b82f6;
  --accent-hover: #2563eb;
  --success: #22c55e;
  --danger: #ef4444;
}

body {
  background-color: var(--background);
  color: var(--text-primary);
}
```

- [ ] **Step 6: Verify the app starts**

```bash
npm run dev
```

Expected: App runs at http://localhost:3000 with a dark background. Stop the dev server after verifying.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with Tailwind and dependencies"
```

---

### Task 2: Supabase Database Schema

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/001_initial_schema.sql`:

```sql
-- ============================================
-- Cards table (synced from Digimon Card API)
-- ============================================
create table public.cards (
  card_number text primary key,
  name text not null,
  expansion text not null,
  card_type text not null,
  color text not null,
  rarity text,
  dp integer,
  play_cost integer,
  level integer,
  evolution_cost integer,
  image_url text,
  max_copies integer not null default 4,
  last_updated timestamptz not null default now()
);

alter table public.cards enable row level security;

create policy "Cards are publicly readable"
  on public.cards for select
  using (true);

create index idx_cards_expansion on public.cards (expansion);
create index idx_cards_name on public.cards using gin (name gin_trgm_ops);
create index idx_cards_color on public.cards (color);
create index idx_cards_card_type on public.cards (card_type);

-- ============================================
-- Collection table (user's owned cards)
-- ============================================
create table public.collection (
  user_id uuid references auth.users(id) on delete cascade not null,
  card_number text references public.cards(card_number) on delete cascade not null,
  quantity integer not null default 1 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, card_number)
);

alter table public.collection enable row level security;

create policy "Users can view their own collection"
  on public.collection for select
  using (auth.uid() = user_id);

create policy "Users can insert into their own collection"
  on public.collection for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own collection"
  on public.collection for update
  using (auth.uid() = user_id);

create policy "Users can delete from their own collection"
  on public.collection for delete
  using (auth.uid() = user_id);

-- ============================================
-- Decks table
-- ============================================
create table public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.decks enable row level security;

create policy "Users can view their own decks"
  on public.decks for select
  using (auth.uid() = user_id);

create policy "Users can insert their own decks"
  on public.decks for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own decks"
  on public.decks for update
  using (auth.uid() = user_id);

create policy "Users can delete their own decks"
  on public.decks for delete
  using (auth.uid() = user_id);

-- ============================================
-- Deck cards table
-- ============================================
create table public.deck_cards (
  deck_id uuid references public.decks(id) on delete cascade not null,
  card_number text references public.cards(card_number) on delete cascade not null,
  quantity integer not null default 1 check (quantity >= 1),
  primary key (deck_id, card_number)
);

alter table public.deck_cards enable row level security;

create policy "Users can view their own deck cards"
  on public.deck_cards for select
  using (
    exists (
      select 1 from public.decks
      where decks.id = deck_cards.deck_id
      and decks.user_id = auth.uid()
    )
  );

create policy "Users can insert into their own deck cards"
  on public.deck_cards for insert
  with check (
    exists (
      select 1 from public.decks
      where decks.id = deck_cards.deck_id
      and decks.user_id = auth.uid()
    )
  );

create policy "Users can update their own deck cards"
  on public.deck_cards for update
  using (
    exists (
      select 1 from public.decks
      where decks.id = deck_cards.deck_id
      and decks.user_id = auth.uid()
    )
  );

create policy "Users can delete their own deck cards"
  on public.deck_cards for delete
  using (
    exists (
      select 1 from public.decks
      where decks.id = deck_cards.deck_id
      and decks.user_id = auth.uid()
    )
  );

-- ============================================
-- Card prices table
-- ============================================
create table public.card_prices (
  card_number text primary key references public.cards(card_number) on delete cascade,
  price_avg numeric,
  price_low numeric,
  price_trend numeric,
  fetched_at timestamptz not null default now()
);

alter table public.card_prices enable row level security;

create policy "Card prices are publicly readable"
  on public.card_prices for select
  using (true);
```

- [ ] **Step 2: Set up Supabase project**

1. Go to https://supabase.com and create a new project
2. Copy the project URL and anon key to `.env.local`
3. In the Supabase SQL Editor, enable the `pg_trgm` extension:

```sql
create extension if not exists pg_trgm;
```

4. Run the full contents of `001_initial_schema.sql` in the SQL Editor

- [ ] **Step 3: Verify tables exist**

In the Supabase dashboard, navigate to Table Editor and verify all 5 tables are created: `cards`, `collection`, `decks`, `deck_cards`, `card_prices`.

- [ ] **Step 4: Commit**

```bash
git add supabase/
git commit -m "feat: add database schema with RLS policies"
```

---

### Task 3: Supabase Client Setup + Auth Middleware

**Files:**
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts`, `middleware.ts`

- [ ] **Step 1: Create browser client**

Create `lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 2: Create server client**

Create `lib/supabase/server.ts`:

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore if
            // middleware is refreshing sessions.
          }
        },
      },
    }
  );
}
```

- [ ] **Step 3: Create middleware helper**

Create `lib/supabase/middleware.ts`:

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — must be called immediately after client creation.
  await supabase.auth.getUser();

  return supabaseResponse;
}
```

- [ ] **Step 4: Create Next.js middleware**

Create `middleware.ts` in the project root:

```typescript
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/ middleware.ts
git commit -m "feat: add Supabase client setup and auth middleware"
```

---

### Task 4: TypeScript Types + Utility Functions

**Files:**
- Create: `lib/types.ts`, `lib/utils.ts`

- [ ] **Step 1: Define database types**

Create `lib/types.ts`:

```typescript
export interface Card {
  card_number: string;
  name: string;
  expansion: string;
  card_type: string;
  color: string;
  rarity: string | null;
  dp: number | null;
  play_cost: number | null;
  level: number | null;
  evolution_cost: number | null;
  image_url: string | null;
  max_copies: number;
  last_updated: string;
}

export interface CollectionEntry {
  user_id: string;
  card_number: string;
  quantity: number;
  updated_at: string;
}

export interface Deck {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeckCard {
  deck_id: string;
  card_number: string;
  quantity: number;
}

export interface CardPrice {
  card_number: string;
  price_avg: number | null;
  price_low: number | null;
  price_trend: number | null;
  fetched_at: string;
}

export interface Expansion {
  code: string;
  name: string;
  card_count: number;
}

export interface SellableCard {
  card: Card;
  owned: number;
  needed: number;
  surplus: number;
  price: CardPrice | null;
  total_value: number | null;
}
```

- [ ] **Step 2: Create utility functions**

Create `lib/utils.ts`:

```typescript
import type { CollectionEntry, DeckCard, Card, CardPrice, SellableCard } from "./types";

/**
 * Calculate how many copies of a card are surplus (sellable).
 *
 * need = max(card.max_copies, sum of quantity across all decks)
 * surplus = owned - need
 */
export function calculateSurplus(
  card: Card,
  owned: number,
  deckUsages: DeckCard[]
): { needed: number; surplus: number } {
  const totalDeckNeed = deckUsages.reduce((sum, dc) => sum + dc.quantity, 0);
  const needed = Math.max(card.max_copies, totalDeckNeed);
  const surplus = Math.max(0, owned - needed);
  return { needed, surplus };
}

/**
 * Build the list of sellable cards with pricing.
 */
export function buildSellableCards(
  cards: Card[],
  collection: CollectionEntry[],
  deckCards: DeckCard[],
  prices: CardPrice[]
): SellableCard[] {
  const collectionMap = new Map(
    collection.map((c) => [c.card_number, c.quantity])
  );
  const priceMap = new Map(prices.map((p) => [p.card_number, p]));
  const deckCardsByCard = new Map<string, DeckCard[]>();
  for (const dc of deckCards) {
    const existing = deckCardsByCard.get(dc.card_number) || [];
    existing.push(dc);
    deckCardsByCard.set(dc.card_number, existing);
  }

  const sellable: SellableCard[] = [];

  for (const card of cards) {
    const owned = collectionMap.get(card.card_number) || 0;
    if (owned === 0) continue;

    const usages = deckCardsByCard.get(card.card_number) || [];
    const { needed, surplus } = calculateSurplus(card, owned, usages);

    if (surplus > 0) {
      const price = priceMap.get(card.card_number) || null;
      const totalValue = price?.price_trend ? surplus * price.price_trend : null;
      sellable.push({ card, owned, needed, surplus, price, total_value: totalValue });
    }
  }

  return sellable.sort(
    (a, b) => (b.total_value ?? 0) - (a.total_value ?? 0)
  );
}

/**
 * Format a EUR price for display.
 */
export function formatPrice(value: number | null): string {
  if (value === null) return "Price not available";
  return `€${value.toFixed(2)}`;
}

/**
 * Build card image URL from card number.
 * Digimon card images are hosted on the official Bandai site.
 */
export function getCardImageUrl(cardNumber: string): string {
  return `https://world.digimoncard.com/images/cardlist/card/${cardNumber}.png`;
}

/**
 * Format a relative time string (e.g., "2 hours ago").
 */
export function timeAgo(date: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(date).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts lib/utils.ts
git commit -m "feat: add TypeScript types and utility functions"
```

---

### Task 5: Providers + Root Layout

**Files:**
- Create: `app/providers.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create providers component**

Create `app/providers.tsx`:

```typescript
"use client";

import { isServer, QueryClient, QueryClientProvider } from "@tanstack/react-query";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
```

- [ ] **Step 2: Update root layout**

Replace `app/layout.tsx`:

```typescript
import type { Metadata } from "next";
import Providers from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "DigiCollect — Digimon TCG Collection Tracker",
  description: "Track your Digimon TCG card collection, plan decks, and find cards to sell.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify the app still starts**

```bash
npm run dev
```

Expected: App runs with no errors. The page should have a dark background.

- [ ] **Step 4: Commit**

```bash
git add app/providers.tsx app/layout.tsx
git commit -m "feat: add React Query provider and update root layout"
```

---

### Task 6: Responsive App Shell (Navigation)

**Files:**
- Create: `components/nav/bottom-tab-bar.tsx`, `components/nav/top-nav-bar.tsx`, `components/nav/app-shell.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create bottom tab bar (mobile)**

Create `components/nav/bottom-tab-bar.tsx`:

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/database", label: "Database", icon: "🔍" },
  { href: "/collection", label: "Collection", icon: "📦" },
  { href: "/decks", label: "Decks", icon: "🃏" },
  { href: "/sell", label: "Sell", icon: "💰" },
];

export default function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-[var(--border)] bg-[var(--surface)] md:hidden">
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-1 flex-col items-center gap-1 py-2 text-xs transition-colors ${
              isActive
                ? "text-[var(--accent)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Create top nav bar (desktop)**

Create `components/nav/top-nav-bar.tsx`:

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/database", label: "Database" },
  { href: "/collection", label: "Collection" },
  { href: "/decks", label: "Decks" },
  { href: "/sell", label: "Sell Advisor" },
];

export default function TopNavBar() {
  const pathname = usePathname();

  return (
    <nav className="hidden border-b border-[var(--border)] bg-[var(--surface)] md:block">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link href="/database" className="text-lg font-bold text-[var(--accent)]">
          DigiCollect
        </Link>
        <div className="flex gap-6">
          {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`text-sm transition-colors ${
                  isActive
                    ? "text-[var(--accent)] border-b-2 border-[var(--accent)] pb-1"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: Create app shell**

Create `components/nav/app-shell.tsx`:

```typescript
import BottomTabBar from "./bottom-tab-bar";
import TopNavBar from "./top-nav-bar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopNavBar />
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-4 md:px-6 md:pb-6">
        {children}
      </main>
      <BottomTabBar />
    </>
  );
}
```

- [ ] **Step 4: Integrate app shell into layout**

Update `app/layout.tsx` — replace the `<body>` contents:

```typescript
import type { Metadata } from "next";
import Providers from "./providers";
import AppShell from "@/components/nav/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "DigiCollect — Digimon TCG Collection Tracker",
  description: "Track your Digimon TCG card collection, plan decks, and find cards to sell.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Create redirect from root to /database**

Replace `app/page.tsx`:

```typescript
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/database");
}
```

- [ ] **Step 6: Create placeholder pages for all tabs**

Create `app/database/page.tsx`:

```typescript
export default function DatabasePage() {
  return <h1 className="text-2xl font-bold">Card Database</h1>;
}
```

Create `app/collection/page.tsx`:

```typescript
export default function CollectionPage() {
  return <h1 className="text-2xl font-bold">My Collection</h1>;
}
```

Create `app/decks/page.tsx`:

```typescript
export default function DecksPage() {
  return <h1 className="text-2xl font-bold">My Decks</h1>;
}
```

Create `app/sell/page.tsx`:

```typescript
export default function SellPage() {
  return <h1 className="text-2xl font-bold">Sell Advisor</h1>;
}
```

- [ ] **Step 7: Verify navigation works**

```bash
npm run dev
```

Expected: Visit http://localhost:3000 → redirects to /database. Desktop: top nav visible, tabs clickable. Resize to mobile width: bottom tabs appear, top nav hides. All 4 tabs navigate correctly.

- [ ] **Step 8: Commit**

```bash
git add components/nav/ app/
git commit -m "feat: add responsive navigation with bottom tabs and top nav bar"
```

---

### Task 7: Card Data Hooks

**Files:**
- Create: `lib/hooks/use-cards.ts`

- [ ] **Step 1: Create card query hooks**

Create `lib/hooks/use-cards.ts`:

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Card, Expansion } from "@/lib/types";

const supabase = createClient();

export function useExpansions() {
  return useQuery<Expansion[]>({
    queryKey: ["expansions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cards")
        .select("expansion")
        .order("expansion", { ascending: false });

      if (error) throw error;

      const counts = new Map<string, number>();
      for (const row of data) {
        counts.set(row.expansion, (counts.get(row.expansion) || 0) + 1);
      }

      return Array.from(counts.entries()).map(([code, card_count]) => ({
        code,
        name: code,
        card_count,
      }));
    },
  });
}

export function useCardsByExpansion(expansion: string | null) {
  return useQuery<Card[]>({
    queryKey: ["cards", "expansion", expansion],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("expansion", expansion!)
        .order("card_number");

      if (error) throw error;
      return data as Card[];
    },
    enabled: !!expansion,
  });
}

export function useCardSearch(query: string) {
  return useQuery<Card[]>({
    queryKey: ["cards", "search", query],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .or(`name.ilike.%${query}%,card_number.ilike.%${query}%`)
        .order("card_number")
        .limit(100);

      if (error) throw error;
      return data as Card[];
    },
    enabled: query.length >= 2,
  });
}

export function useCardsFiltered(filters: {
  color?: string;
  card_type?: string;
  rarity?: string;
  expansion?: string;
}) {
  return useQuery<Card[]>({
    queryKey: ["cards", "filtered", filters],
    queryFn: async () => {
      let q = supabase.from("cards").select("*");

      if (filters.color) q = q.eq("color", filters.color);
      if (filters.card_type) q = q.eq("card_type", filters.card_type);
      if (filters.rarity) q = q.eq("rarity", filters.rarity);
      if (filters.expansion) q = q.eq("expansion", filters.expansion);

      const { data, error } = await q.order("card_number").limit(200);

      if (error) throw error;
      return data as Card[];
    },
    enabled: Object.values(filters).some(Boolean),
  });
}

export function useCard(cardNumber: string | null) {
  return useQuery<Card>({
    queryKey: ["cards", cardNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("card_number", cardNumber!)
        .single();

      if (error) throw error;
      return data as Card;
    },
    enabled: !!cardNumber,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/hooks/use-cards.ts
git commit -m "feat: add card data query hooks"
```

---

### Task 8: Python Card Sync Script

**Files:**
- Create: `scripts/sync_cards.py`, `scripts/requirements.txt`

- [ ] **Step 1: Create requirements file**

Create `scripts/requirements.txt`:

```
requests>=2.31.0
supabase>=2.0.0
python-dotenv>=1.0.0
```

- [ ] **Step 2: Create card sync script**

Create `scripts/sync_cards.py`:

```python
"""
Sync cards from the Digimon Card API into Supabase.

Usage:
    pip install -r scripts/requirements.txt
    python scripts/sync_cards.py

Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env or environment.
"""

import os
import sys
import time
import requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
DIGIMON_API_SEARCH = "https://digimoncard.io/api-public/search.php"
IMAGE_BASE_URL = "https://world.digimoncard.com/images/cardlist/card"

# Rate limiting: max 15 requests per 10 seconds
REQUEST_INTERVAL = 0.7  # seconds between requests

RARITY_MAP = {
    "c": "Common",
    "u": "Uncommon",
    "r": "Rare",
    "sr": "Super Rare",
    "sec": "Secret Rare",
    "p": "Promo",
}


def fetch_all_card_numbers() -> list[dict]:
    """Fetch the list of all card numbers from the API."""
    resp = requests.get(
        "https://digimoncard.io/api-public/getAllCards.php", timeout=30
    )
    resp.raise_for_status()
    return resp.json()


def fetch_card_details(card_number: str) -> dict | None:
    """Fetch full details for a single card."""
    resp = requests.get(
        DIGIMON_API_SEARCH,
        params={"n": "", "card": card_number},
        timeout=30,
    )
    resp.raise_for_status()
    results = resp.json()
    if not results:
        return None
    # Find exact match by card number
    for card in results:
        if card.get("id") == card_number:
            return card
    return results[0]


def transform_card(raw: dict) -> dict:
    """Transform API response into our database schema."""
    card_number = raw["id"]
    rarity_raw = (raw.get("rarity") or "").lower().strip()

    # Extract first set name as expansion
    set_names = raw.get("set_name", [])
    expansion = ""
    if set_names:
        # set_name is like "BT-01: Booster New Evolution" — extract code
        first_set = set_names[0]
        expansion = first_set.split(":")[0].strip() if ":" in first_set else first_set

    return {
        "card_number": card_number,
        "name": raw.get("name", ""),
        "expansion": expansion,
        "card_type": raw.get("type", ""),
        "color": raw.get("color", ""),
        "rarity": RARITY_MAP.get(rarity_raw, rarity_raw),
        "dp": raw.get("dp") if raw.get("dp") else None,
        "play_cost": raw.get("play_cost") if raw.get("play_cost") else None,
        "level": raw.get("level") if raw.get("level") else None,
        "evolution_cost": (
            raw.get("evolution_cost") if raw.get("evolution_cost") else None
        ),
        "image_url": f"{IMAGE_BASE_URL}/{card_number}.png",
        "max_copies": 4,
    }


def sync_cards():
    """Main sync function."""
    print("Connecting to Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    print("Fetching card list from Digimon Card API...")
    all_cards = fetch_all_card_numbers()
    print(f"Found {len(all_cards)} cards")

    # Fetch existing cards to know what we already have
    existing = set()
    result = supabase.table("cards").select("card_number").execute()
    for row in result.data:
        existing.add(row["card_number"])
    print(f"Already have {len(existing)} cards in database")

    # Fetch details for new cards
    new_cards = [c for c in all_cards if c["cardnumber"] not in existing]
    print(f"Need to fetch details for {len(new_cards)} new cards")

    batch = []
    for i, card_entry in enumerate(new_cards):
        card_number = card_entry["cardnumber"]
        print(f"  [{i+1}/{len(new_cards)}] Fetching {card_number}...")

        try:
            raw = fetch_card_details(card_number)
            if raw:
                batch.append(transform_card(raw))
        except Exception as e:
            print(f"    Error fetching {card_number}: {e}")

        # Upsert in batches of 50
        if len(batch) >= 50:
            print(f"  Upserting batch of {len(batch)} cards...")
            supabase.table("cards").upsert(batch).execute()
            batch = []

        time.sleep(REQUEST_INTERVAL)

    # Upsert remaining
    if batch:
        print(f"  Upserting final batch of {len(batch)} cards...")
        supabase.table("cards").upsert(batch).execute()

    # Final count
    result = supabase.table("cards").select("card_number", count="exact").execute()
    print(f"Done! Total cards in database: {result.count}")


if __name__ == "__main__":
    sync_cards()
```

- [ ] **Step 3: Test the script locally**

```bash
cd scripts
pip install -r requirements.txt
```

Create a `.env` file in the project root (if not using `.env.local`):
```
SUPABASE_URL=your-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Note: The service role key (not the anon key) is needed because the sync script bypasses RLS.

```bash
python scripts/sync_cards.py
```

Expected: The script fetches cards from the Digimon Card API and inserts them into Supabase. Check the Supabase Table Editor to confirm cards appear.

- [ ] **Step 4: Commit**

```bash
git add scripts/
git commit -m "feat: add Python card sync script for Digimon Card API"
```

---

### Task 9: Database Tab — Expansion Grid + Search + Filters

**Files:**
- Create: `components/cards/expansion-grid.tsx`, `components/cards/card-search-bar.tsx`, `components/cards/card-filters.tsx`, `components/cards/card-grid.tsx`, `components/cards/card-thumbnail.tsx`
- Modify: `app/database/page.tsx`

- [ ] **Step 1: Create card search bar**

Create `components/cards/card-search-bar.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";

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
    <input
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder="Search cards by name or number..."
      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none focus:border-[var(--accent)]"
    />
  );
}
```

- [ ] **Step 2: Create filter chips**

Create `components/cards/card-filters.tsx`:

```typescript
"use client";

interface CardFiltersProps {
  filters: { color?: string; card_type?: string; rarity?: string };
  onChange: (filters: { color?: string; card_type?: string; rarity?: string }) => void;
}

const COLORS = ["Red", "Blue", "Yellow", "Green", "Black", "Purple", "White"];
const TYPES = ["Digimon", "Tamer", "Option", "Digi-Egg"];
const RARITIES = ["Common", "Uncommon", "Rare", "Super Rare", "Secret Rare"];

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs transition-colors ${
        active
          ? "bg-[var(--accent)] text-white"
          : "bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
      }`}
    >
      {label}
    </button>
  );
}

export default function CardFilters({ filters, onChange }: CardFiltersProps) {
  function toggle(key: "color" | "card_type" | "rarity", value: string) {
    onChange({
      ...filters,
      [key]: filters[key] === value ? undefined : value,
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {COLORS.map((c) => (
        <FilterChip
          key={c}
          label={c}
          active={filters.color === c}
          onClick={() => toggle("color", c)}
        />
      ))}
      <span className="mx-1 self-center text-[var(--border)]">|</span>
      {TYPES.map((t) => (
        <FilterChip
          key={t}
          label={t}
          active={filters.card_type === t}
          onClick={() => toggle("card_type", t)}
        />
      ))}
      <span className="mx-1 self-center text-[var(--border)]">|</span>
      {RARITIES.map((r) => (
        <FilterChip
          key={r}
          label={r}
          active={filters.rarity === r}
          onClick={() => toggle("rarity", r)}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create card thumbnail**

Create `components/cards/card-thumbnail.tsx`:

```typescript
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
      className="group relative overflow-hidden rounded-lg bg-[var(--surface)] transition-colors hover:bg-[var(--surface-hover)]"
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
          <span className="absolute right-1 top-1 rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs font-bold text-white">
            x{quantity}
          </span>
        )}
      </div>
      <div className="p-2">
        <p className="truncate text-xs font-medium">{card.name}</p>
        <p className="text-xs text-[var(--text-secondary)]">{card.card_number}</p>
      </div>
    </button>
  );
}
```

- [ ] **Step 4: Create card grid**

Create `components/cards/card-grid.tsx`:

```typescript
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
      <p className="py-12 text-center text-[var(--text-secondary)]">
        No cards found.
      </p>
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

- [ ] **Step 5: Create expansion grid**

Create `components/cards/expansion-grid.tsx`:

```typescript
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
          className="rounded-lg bg-[var(--surface)] p-4 text-center transition-colors hover:bg-[var(--surface-hover)]"
        >
          <div className="text-sm font-bold text-[var(--accent)]">{exp.code}</div>
          <div className="mt-1 text-xs text-[var(--text-secondary)]">
            {exp.card_count} cards
          </div>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Build the database page**

Replace `app/database/page.tsx`:

```typescript
"use client";

import { useState, useCallback } from "react";
import { useExpansions, useCardsByExpansion, useCardSearch, useCardsFiltered } from "@/lib/hooks/use-cards";
import CardSearchBar from "@/components/cards/card-search-bar";
import CardFilters from "@/components/cards/card-filters";
import CardGrid from "@/components/cards/card-grid";
import ExpansionGrid from "@/components/cards/expansion-grid";
import type { Card, Expansion } from "@/lib/types";

export default function DatabasePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<{
    color?: string;
    card_type?: string;
    rarity?: string;
  }>({});
  const [selectedExpansion, setSelectedExpansion] = useState<string | null>(null);

  const { data: expansions, isLoading: loadingExpansions } = useExpansions();
  const { data: expansionCards, isLoading: loadingExpansionCards } =
    useCardsByExpansion(selectedExpansion);
  const { data: searchResults, isLoading: loadingSearch } = useCardSearch(searchQuery);
  const { data: filteredCards, isLoading: loadingFiltered } = useCardsFiltered(filters);

  const hasActiveSearch = searchQuery.length >= 2;
  const hasActiveFilters = Object.values(filters).some(Boolean);
  const showExpansions = !hasActiveSearch && !hasActiveFilters && !selectedExpansion;

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      setSelectedExpansion(null);
    }
  }, []);

  const handleFilterChange = useCallback(
    (newFilters: { color?: string; card_type?: string; rarity?: string }) => {
      setFilters(newFilters);
      if (Object.values(newFilters).some(Boolean)) {
        setSelectedExpansion(null);
      }
    },
    []
  );

  const handleExpansionSelect = useCallback((exp: Expansion) => {
    setSelectedExpansion(exp.code);
    setSearchQuery("");
    setFilters({});
  }, []);

  const handleCardClick = useCallback((card: Card) => {
    // TODO: Open card detail panel (Task 12)
    console.log("Card clicked:", card.card_number);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedExpansion(null);
  }, []);

  // Determine which cards to show
  let displayCards: Card[] | undefined;
  let isLoading = false;

  if (hasActiveSearch) {
    displayCards = searchResults;
    isLoading = loadingSearch;
  } else if (hasActiveFilters) {
    displayCards = filteredCards;
    isLoading = loadingFiltered;
  } else if (selectedExpansion) {
    displayCards = expansionCards;
    isLoading = loadingExpansionCards;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Card Database</h1>

      <CardSearchBar onSearch={handleSearch} />
      <CardFilters filters={filters} onChange={handleFilterChange} />

      {selectedExpansion && !hasActiveSearch && !hasActiveFilters && (
        <button
          onClick={handleBack}
          className="text-sm text-[var(--accent)] hover:underline"
        >
          ← Back to expansions
        </button>
      )}

      {isLoading && (
        <p className="py-12 text-center text-[var(--text-secondary)]">Loading...</p>
      )}

      {showExpansions && !loadingExpansions && expansions && (
        <>
          <h2 className="text-sm font-medium text-[var(--text-secondary)]">
            BROWSE BY EXPANSION
          </h2>
          <ExpansionGrid expansions={expansions} onSelect={handleExpansionSelect} />
        </>
      )}

      {displayCards && !isLoading && (
        <CardGrid cards={displayCards} onCardClick={handleCardClick} />
      )}
    </div>
  );
}
```

- [ ] **Step 7: Verify the database tab works**

```bash
npm run dev
```

Expected: Visit http://localhost:3000/database. See expansion grid (if cards are synced to Supabase). Typing in search replaces expansions with results. Clicking an expansion shows its cards. Filter chips toggle and filter cards.

- [ ] **Step 8: Commit**

```bash
git add components/cards/ app/database/
git commit -m "feat: add database tab with expansion grid, search, and filters"
```

---

### Task 10: Collection Hooks + Collection Tab

**Files:**
- Create: `lib/hooks/use-collection.ts`, `components/collection/quantity-control.tsx`, `components/collection/collection-summary.tsx`
- Modify: `app/collection/page.tsx`

- [ ] **Step 1: Create collection hooks**

Create `lib/hooks/use-collection.ts`:

```typescript
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { CollectionEntry } from "@/lib/types";

const supabase = createClient();

export function useCollection() {
  return useQuery<CollectionEntry[]>({
    queryKey: ["collection"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("collection")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return data as CollectionEntry[];
    },
  });
}

export function useCollectionQuantity(cardNumber: string) {
  const { data: collection } = useCollection();
  return collection?.find((c) => c.card_number === cardNumber)?.quantity ?? 0;
}

export function useCollectionMap() {
  const { data: collection } = useCollection();
  const map = new Map<string, number>();
  if (collection) {
    for (const entry of collection) {
      map.set(entry.card_number, entry.quantity);
    }
  }
  return map;
}

export function useUpdateQuantity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cardNumber,
      quantity,
    }: {
      cardNumber: string;
      quantity: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (quantity <= 0) {
        const { error } = await supabase
          .from("collection")
          .delete()
          .eq("user_id", user.id)
          .eq("card_number", cardNumber);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("collection").upsert({
          user_id: user.id,
          card_number: cardNumber,
          quantity,
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collection"] });
    },
  });
}
```

- [ ] **Step 2: Create quantity control component**

Create `components/collection/quantity-control.tsx`:

```typescript
"use client";

import { useCollectionQuantity, useUpdateQuantity } from "@/lib/hooks/use-collection";

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
        className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--surface-hover)] text-lg font-bold transition-colors hover:bg-[var(--border)] disabled:opacity-30"
      >
        -
      </button>
      <span className="min-w-[2ch] text-center text-lg font-bold">{quantity}</span>
      <button
        onClick={() => updateQuantity({ cardNumber, quantity: quantity + 1 })}
        className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--accent)] text-lg font-bold text-white transition-colors hover:bg-[var(--accent-hover)]"
      >
        +
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Create collection summary banner**

Create `components/collection/collection-summary.tsx`:

```typescript
"use client";

import { useCollection } from "@/lib/hooks/use-collection";
import { usePrices } from "@/lib/hooks/use-prices";
import { formatPrice } from "@/lib/utils";

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

  return (
    <div className="flex flex-wrap gap-6 rounded-lg bg-[var(--surface)] p-4">
      <div>
        <div className="text-xs text-[var(--text-secondary)]">TOTAL CARDS</div>
        <div className="text-xl font-bold">{totalCards}</div>
      </div>
      <div>
        <div className="text-xs text-[var(--text-secondary)]">UNIQUE</div>
        <div className="text-xl font-bold">{uniqueCards}</div>
      </div>
      <div>
        <div className="text-xs text-[var(--text-secondary)]">EST. VALUE</div>
        <div className="text-xl font-bold text-[var(--accent)]">
          {estimatedValue !== null ? formatPrice(estimatedValue) : "—"}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Build the collection page**

Replace `app/collection/page.tsx`:

```typescript
"use client";

import { useState, useCallback } from "react";
import { useCollection, useCollectionMap } from "@/lib/hooks/use-collection";
import CardSearchBar from "@/components/cards/card-search-bar";
import CardGrid from "@/components/cards/card-grid";
import CollectionSummary from "@/components/collection/collection-summary";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type { Card } from "@/lib/types";

const supabase = createClient();

export default function CollectionPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: collection, isLoading } = useCollection();
  const quantities = useCollectionMap();

  // Fetch full card data for owned cards
  const cardNumbers = collection?.map((c) => c.card_number) ?? [];
  const { data: ownedCards } = useQuery<Card[]>({
    queryKey: ["collection-cards", cardNumbers],
    queryFn: async () => {
      if (cardNumbers.length === 0) return [];
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .in("card_number", cardNumbers)
        .order("card_number");
      if (error) throw error;
      return data as Card[];
    },
    enabled: cardNumbers.length > 0,
  });

  const filteredCards = ownedCards?.filter((card) => {
    if (searchQuery.length < 2) return true;
    const q = searchQuery.toLowerCase();
    return (
      card.name.toLowerCase().includes(q) ||
      card.card_number.toLowerCase().includes(q)
    );
  });

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleCardClick = useCallback((card: Card) => {
    // TODO: Open card detail panel (Task 12)
    console.log("Card clicked:", card.card_number);
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My Collection</h1>

      <CollectionSummary />

      <CardSearchBar onSearch={handleSearch} />

      {isLoading && (
        <p className="py-12 text-center text-[var(--text-secondary)]">Loading...</p>
      )}

      {!isLoading && cardNumbers.length === 0 && (
        <p className="py-12 text-center text-[var(--text-secondary)]">
          No cards in your collection yet. Browse the database to add some!
        </p>
      )}

      {filteredCards && (
        <CardGrid
          cards={filteredCards}
          quantities={quantities}
          onCardClick={handleCardClick}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add lib/hooks/use-collection.ts components/collection/ app/collection/
git commit -m "feat: add collection tab with quantity tracking and summary stats"
```

---

### Task 11: Price Hooks

**Files:**
- Create: `lib/hooks/use-prices.ts`

- [ ] **Step 1: Create price query hook**

Create `lib/hooks/use-prices.ts`:

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { CardPrice } from "@/lib/types";

const supabase = createClient();

export function usePrices() {
  return useQuery<CardPrice[]>({
    queryKey: ["prices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("card_prices")
        .select("*");

      if (error) throw error;
      return data as CardPrice[];
    },
  });
}

export function useCardPrice(cardNumber: string | null) {
  return useQuery<CardPrice | null>({
    queryKey: ["prices", cardNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("card_prices")
        .select("*")
        .eq("card_number", cardNumber!)
        .maybeSingle();

      if (error) throw error;
      return data as CardPrice | null;
    },
    enabled: !!cardNumber,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/hooks/use-prices.ts
git commit -m "feat: add price query hooks"
```

---

### Task 12: Card Detail Panel (Slide-Up)

**Files:**
- Create: `components/cards/card-panel.tsx`
- Modify: `app/database/page.tsx`, `app/collection/page.tsx`

- [ ] **Step 1: Create the slide-up panel component**

Create `components/cards/card-panel.tsx`:

```typescript
"use client";

import { useEffect } from "react";
import Image from "next/image";
import { getCardImageUrl, formatPrice } from "@/lib/utils";
import { useCardPrice } from "@/lib/hooks/use-prices";
import QuantityControl from "@/components/collection/quantity-control";
import type { Card } from "@/lib/types";

interface CardPanelProps {
  card: Card | null;
  onClose: () => void;
}

export default function CardPanel({ card, onClose }: CardPanelProps) {
  const { data: price } = useCardPrice(card?.card_number ?? null);

  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (!card) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-[var(--surface)] p-4 shadow-xl md:bottom-auto md:right-0 md:top-0 md:left-auto md:w-[400px] md:max-h-full md:rounded-none md:rounded-l-2xl">
        {/* Drag handle (mobile) */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--border)] md:hidden" />

        <div className="flex gap-4">
          {/* Card image */}
          <div className="relative h-[180px] w-[128px] flex-shrink-0 overflow-hidden rounded-lg">
            <Image
              src={getCardImageUrl(card.card_number)}
              alt={card.name}
              fill
              sizes="128px"
              className="object-cover"
            />
          </div>

          {/* Card info */}
          <div className="flex-1 space-y-2">
            <h2 className="text-lg font-bold">{card.name}</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              {card.card_number} · {card.card_type} · {card.color}
              {card.rarity && ` · ${card.rarity}`}
            </p>

            <div className="flex flex-wrap gap-2">
              {card.level !== null && (
                <span className="rounded bg-[var(--background)] px-2 py-0.5 text-xs">
                  Lv.{card.level}
                </span>
              )}
              {card.play_cost !== null && (
                <span className="rounded bg-[var(--background)] px-2 py-0.5 text-xs">
                  Cost {card.play_cost}
                </span>
              )}
              {card.dp !== null && (
                <span className="rounded bg-[var(--background)] px-2 py-0.5 text-xs">
                  {card.dp} DP
                </span>
              )}
              {card.evolution_cost !== null && (
                <span className="rounded bg-[var(--background)] px-2 py-0.5 text-xs">
                  Evo {card.evolution_cost}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Collection controls */}
        <div className="mt-4 rounded-lg bg-[var(--background)] p-3">
          <div className="mb-2 text-xs text-[var(--text-secondary)]">MY COLLECTION</div>
          <QuantityControl cardNumber={card.card_number} />
        </div>

        {/* Price */}
        <div className="mt-3 rounded-lg bg-[var(--background)] p-3">
          <div className="mb-1 text-xs text-[var(--text-secondary)]">CARDMARKET PRICE</div>
          <div className="flex items-baseline gap-3">
            <span className="text-lg font-bold text-[var(--accent)]">
              {formatPrice(price?.price_trend ?? null)}
            </span>
            {price?.price_low !== null && price?.price_low !== undefined && (
              <span className="text-xs text-[var(--text-secondary)]">
                Low: {formatPrice(price.price_low)}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Integrate panel into the database page**

In `app/database/page.tsx`, add the panel state and component. Add at the top of the component:

```typescript
const [selectedCard, setSelectedCard] = useState<Card | null>(null);
```

Replace the `handleCardClick` callback:

```typescript
const handleCardClick = useCallback((card: Card) => {
  setSelectedCard(card);
}, []);

const handleClosePanel = useCallback(() => {
  setSelectedCard(null);
}, []);
```

Add the import at the top:

```typescript
import CardPanel from "@/components/cards/card-panel";
```

Add before the closing `</div>` of the return:

```typescript
<CardPanel card={selectedCard} onClose={handleClosePanel} />
```

- [ ] **Step 3: Integrate panel into the collection page**

Apply the same pattern to `app/collection/page.tsx` — add `selectedCard` state, update `handleCardClick`, import and render `CardPanel`.

- [ ] **Step 4: Verify panel works**

```bash
npm run dev
```

Expected: Click a card in the database or collection tab. A panel slides up from the bottom (mobile) or from the right (desktop). Shows card image, stats, +/− quantity controls, and price. Clicking backdrop or pressing Escape closes it. Clicking another card swaps the content.

- [ ] **Step 5: Commit**

```bash
git add components/cards/card-panel.tsx app/database/page.tsx app/collection/page.tsx
git commit -m "feat: add slide-up card detail panel with collection controls and pricing"
```

---

### Task 13: Deck Hooks + Deck List Page

**Files:**
- Create: `lib/hooks/use-decks.ts`, `components/decks/deck-list-card.tsx`, `components/decks/deck-form.tsx`
- Modify: `app/decks/page.tsx`

- [ ] **Step 1: Create deck hooks**

Create `lib/hooks/use-decks.ts`:

```typescript
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Deck, DeckCard } from "@/lib/types";

const supabase = createClient();

export function useDecks() {
  return useQuery<Deck[]>({
    queryKey: ["decks"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("decks")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as Deck[];
    },
  });
}

export function useDeck(deckId: string) {
  return useQuery<Deck>({
    queryKey: ["decks", deckId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("decks")
        .select("*")
        .eq("id", deckId)
        .single();

      if (error) throw error;
      return data as Deck;
    },
  });
}

export function useDeckCards(deckId: string) {
  return useQuery<DeckCard[]>({
    queryKey: ["deck-cards", deckId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deck_cards")
        .select("*")
        .eq("deck_id", deckId);

      if (error) throw error;
      return data as DeckCard[];
    },
  });
}

export function useAllDeckCards() {
  return useQuery<DeckCard[]>({
    queryKey: ["deck-cards", "all"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get all deck IDs for this user
      const { data: decks, error: decksError } = await supabase
        .from("decks")
        .select("id")
        .eq("user_id", user.id);
      if (decksError) throw decksError;

      if (decks.length === 0) return [];

      const deckIds = decks.map((d) => d.id);
      const { data, error } = await supabase
        .from("deck_cards")
        .select("*")
        .in("deck_id", deckIds);

      if (error) throw error;
      return data as DeckCard[];
    },
  });
}

export function useCreateDeck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("decks")
        .insert({ user_id: user.id, name, description: description || null })
        .select()
        .single();

      if (error) throw error;
      return data as Deck;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["decks"] });
    },
  });
}

export function useDeleteDeck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deckId: string) => {
      const { error } = await supabase.from("decks").delete().eq("id", deckId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["decks"] });
    },
  });
}

export function useUpdateDeckCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      deckId,
      cardNumber,
      quantity,
    }: {
      deckId: string;
      cardNumber: string;
      quantity: number;
    }) => {
      if (quantity <= 0) {
        const { error } = await supabase
          .from("deck_cards")
          .delete()
          .eq("deck_id", deckId)
          .eq("card_number", cardNumber);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("deck_cards").upsert({
          deck_id: deckId,
          card_number: cardNumber,
          quantity,
        });
        if (error) throw error;
      }
    },
    onSuccess: (_, { deckId }) => {
      queryClient.invalidateQueries({ queryKey: ["deck-cards", deckId] });
      queryClient.invalidateQueries({ queryKey: ["deck-cards", "all"] });
    },
  });
}
```

- [ ] **Step 2: Create deck list card component**

Create `components/decks/deck-list-card.tsx`:

```typescript
import Link from "next/link";
import type { Deck } from "@/lib/types";

interface DeckListCardProps {
  deck: Deck;
  cardCount: number;
  completionPercent: number;
}

export default function DeckListCard({
  deck,
  cardCount,
  completionPercent,
}: DeckListCardProps) {
  return (
    <Link
      href={`/decks/${deck.id}`}
      className="block rounded-lg bg-[var(--surface)] p-4 transition-colors hover:bg-[var(--surface-hover)]"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-bold">{deck.name}</h3>
        <span className="text-xs text-[var(--text-secondary)]">{cardCount} cards</span>
      </div>
      {deck.description && (
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{deck.description}</p>
      )}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--text-secondary)]">Completion</span>
          <span className={completionPercent === 100 ? "text-[var(--success)]" : "text-[var(--text-primary)]"}>
            {completionPercent}%
          </span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--background)]">
          <div
            className={`h-full rounded-full transition-all ${
              completionPercent === 100 ? "bg-[var(--success)]" : "bg-[var(--accent)]"
            }`}
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 3: Create deck form component**

Create `components/decks/deck-form.tsx`:

```typescript
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
    createDeck(
      { name: name.trim(), description: description.trim() || undefined },
      { onSuccess: () => onCreated() }
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg bg-[var(--surface)] p-4">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Deck name"
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        autoFocus
      />
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!name.trim() || isPending}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          {isPending ? "Creating..." : "Create Deck"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg bg-[var(--surface-hover)] px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--border)]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Build the decks list page**

Replace `app/decks/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useDecks, useDeckCards, useAllDeckCards } from "@/lib/hooks/use-decks";
import { useCollection } from "@/lib/hooks/use-collection";
import DeckListCard from "@/components/decks/deck-list-card";
import DeckForm from "@/components/decks/deck-form";

export default function DecksPage() {
  const [showForm, setShowForm] = useState(false);
  const { data: decks, isLoading } = useDecks();
  const { data: allDeckCards } = useAllDeckCards();
  const { data: collection } = useCollection();

  function getDeckStats(deckId: string) {
    const cards = allDeckCards?.filter((dc) => dc.deck_id === deckId) ?? [];
    const cardCount = cards.reduce((sum, dc) => sum + dc.quantity, 0);

    const collectionMap = new Map(
      collection?.map((c) => [c.card_number, c.quantity]) ?? []
    );

    let ownedCount = 0;
    let totalNeeded = 0;
    for (const dc of cards) {
      totalNeeded += dc.quantity;
      ownedCount += Math.min(
        collectionMap.get(dc.card_number) ?? 0,
        dc.quantity
      );
    }

    const completionPercent =
      totalNeeded > 0 ? Math.round((ownedCount / totalNeeded) * 100) : 100;

    return { cardCount, completionPercent };
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Decks</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            New Deck
          </button>
        )}
      </div>

      {showForm && (
        <DeckForm
          onCreated={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
        />
      )}

      {isLoading && (
        <p className="py-12 text-center text-[var(--text-secondary)]">Loading...</p>
      )}

      {!isLoading && decks && decks.length === 0 && !showForm && (
        <p className="py-12 text-center text-[var(--text-secondary)]">
          No decks yet. Create one to start planning!
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {decks?.map((deck) => {
          const { cardCount, completionPercent } = getDeckStats(deck.id);
          return (
            <DeckListCard
              key={deck.id}
              deck={deck}
              cardCount={cardCount}
              completionPercent={completionPercent}
            />
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add lib/hooks/use-decks.ts components/decks/ app/decks/page.tsx
git commit -m "feat: add deck list page with create form and completion tracking"
```

---

### Task 14: Deck Detail Page

**Files:**
- Create: `components/decks/deck-card-row.tsx`, `app/decks/[id]/page.tsx`

- [ ] **Step 1: Create deck card row component**

Create `components/decks/deck-card-row.tsx`:

```typescript
"use client";

import Image from "next/image";
import { getCardImageUrl } from "@/lib/utils";
import { useUpdateDeckCard } from "@/lib/hooks/use-decks";
import type { Card } from "@/lib/types";

interface DeckCardRowProps {
  card: Card;
  deckId: string;
  quantityInDeck: number;
  quantityOwned: number;
}

export default function DeckCardRow({
  card,
  deckId,
  quantityInDeck,
  quantityOwned,
}: DeckCardRowProps) {
  const { mutate: updateDeckCard } = useUpdateDeckCard();
  const isMissing = quantityOwned < quantityInDeck;

  return (
    <div className="flex items-center gap-3 rounded-lg bg-[var(--surface)] p-3">
      <div className="relative h-16 w-11 flex-shrink-0 overflow-hidden rounded">
        <Image
          src={getCardImageUrl(card.card_number)}
          alt={card.name}
          fill
          sizes="44px"
          className="object-cover"
        />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{card.name}</p>
        <p className="text-xs text-[var(--text-secondary)]">{card.card_number}</p>
        <p className={`text-xs ${isMissing ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
          {isMissing
            ? `Missing ${quantityInDeck - quantityOwned} of ${quantityInDeck}`
            : `Owned ${quantityOwned} of ${quantityInDeck}`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() =>
            updateDeckCard({
              deckId,
              cardNumber: card.card_number,
              quantity: quantityInDeck - 1,
            })
          }
          className="flex h-7 w-7 items-center justify-center rounded bg-[var(--surface-hover)] text-sm hover:bg-[var(--border)]"
        >
          -
        </button>
        <span className="min-w-[2ch] text-center text-sm font-bold">
          {quantityInDeck}
        </span>
        <button
          onClick={() =>
            updateDeckCard({
              deckId,
              cardNumber: card.card_number,
              quantity: quantityInDeck + 1,
            })
          }
          className="flex h-7 w-7 items-center justify-center rounded bg-[var(--accent)] text-sm text-white hover:bg-[var(--accent-hover)]"
        >
          +
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create deck detail page**

Create `app/decks/[id]/page.tsx`:

```typescript
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
import type { Card } from "@/lib/types";
import { useRouter } from "next/navigation";

const supabase = createClient();

export default function DeckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: deckId } = use(params);
  const router = useRouter();
  const [addingCards, setAddingCards] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const { data: deck } = useDeck(deckId);
  const { data: deckCards } = useDeckCards(deckId);
  const quantities = useCollectionMap();
  const { mutate: deleteDeck } = useDeleteDeck();

  // Fetch card data for cards in this deck
  const cardNumbers = deckCards?.map((dc) => dc.card_number) ?? [];
  const { data: cardsInDeck } = useQuery<Card[]>({
    queryKey: ["deck-detail-cards", cardNumbers],
    queryFn: async () => {
      if (cardNumbers.length === 0) return [];
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .in("card_number", cardNumbers)
        .order("card_number");
      if (error) throw error;
      return data as Card[];
    },
    enabled: cardNumbers.length > 0,
  });

  // Search for cards to add
  const { data: searchResults } = useQuery<Card[]>({
    queryKey: ["deck-add-search", searchQuery],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .or(`name.ilike.%${searchQuery}%,card_number.ilike.%${searchQuery}%`)
        .order("card_number")
        .limit(50);
      if (error) throw error;
      return data as Card[];
    },
    enabled: addingCards && searchQuery.length >= 2,
  });

  const deckCardMap = new Map(
    deckCards?.map((dc) => [dc.card_number, dc.quantity]) ?? []
  );

  const missingCount = cardsInDeck?.reduce((count, card) => {
    const needed = deckCardMap.get(card.card_number) ?? 0;
    const owned = quantities.get(card.card_number) ?? 0;
    return count + Math.max(0, needed - owned);
  }, 0) ?? 0;

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleCardClick = useCallback((card: Card) => {
    setSelectedCard(card);
  }, []);

  const handleDelete = useCallback(() => {
    if (confirm("Delete this deck?")) {
      deleteDeck(deckId, { onSuccess: () => router.push("/decks") });
    }
  }, [deleteDeck, deckId, router]);

  if (!deck) return <p className="py-12 text-center text-[var(--text-secondary)]">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/decks" className="text-sm text-[var(--accent)] hover:underline">
          ← Decks
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{deck.name}</h1>
          {deck.description && (
            <p className="text-sm text-[var(--text-secondary)]">{deck.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setAddingCards(!addingCards)}
            className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm text-white hover:bg-[var(--accent-hover)]"
          >
            {addingCards ? "Done" : "Add Cards"}
          </button>
          <button
            onClick={handleDelete}
            className="rounded-lg bg-[var(--danger)] px-3 py-1.5 text-sm text-white hover:opacity-80"
          >
            Delete
          </button>
        </div>
      </div>

      {missingCount > 0 && (
        <div className="rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30 p-3 text-sm text-[var(--danger)]">
          Missing {missingCount} card{missingCount !== 1 ? "s" : ""} to complete this deck.
        </div>
      )}

      {addingCards && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-[var(--text-secondary)]">SEARCH CARDS TO ADD</h2>
          <CardSearchBar onSearch={handleSearch} />
          {searchResults && (
            <CardGrid cards={searchResults} quantities={quantities} onCardClick={handleCardClick} />
          )}
        </div>
      )}

      <h2 className="text-sm font-medium text-[var(--text-secondary)]">
        DECK CARDS ({cardNumbers.length} unique, {deckCards?.reduce((s, dc) => s + dc.quantity, 0) ?? 0} total)
      </h2>

      {cardsInDeck && cardsInDeck.length === 0 && (
        <p className="py-8 text-center text-[var(--text-secondary)]">
          No cards in this deck yet. Click "Add Cards" to search and add.
        </p>
      )}

      <div className="space-y-2">
        {cardsInDeck?.map((card) => (
          <DeckCardRow
            key={card.card_number}
            card={card}
            deckId={deckId}
            quantityInDeck={deckCardMap.get(card.card_number) ?? 0}
            quantityOwned={quantities.get(card.card_number) ?? 0}
          />
        ))}
      </div>

      <CardPanel card={selectedCard} onClose={() => setSelectedCard(null)} />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/decks/deck-card-row.tsx app/decks/\[id\]/
git commit -m "feat: add deck detail page with card management and missing cards"
```

---

### Task 15: Sell Advisor Tab

**Files:**
- Create: `components/sell/sell-summary.tsx`, `components/sell/sell-card-row.tsx`
- Modify: `app/sell/page.tsx`

- [ ] **Step 1: Create sell summary banner**

Create `components/sell/sell-summary.tsx`:

```typescript
import { formatPrice } from "@/lib/utils";

interface SellSummaryProps {
  surplusCount: number;
  totalValue: number | null;
}

export default function SellSummary({ surplusCount, totalValue }: SellSummaryProps) {
  return (
    <div className="rounded-lg bg-[var(--surface)] p-4">
      <p className="text-lg font-bold">
        You have{" "}
        <span className="text-[var(--accent)]">{surplusCount}</span>{" "}
        surplus card{surplusCount !== 1 ? "s" : ""} worth approximately{" "}
        <span className="text-[var(--accent)]">
          {totalValue !== null ? formatPrice(totalValue) : "unknown"}
        </span>
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Create sell card row**

Create `components/sell/sell-card-row.tsx`:

```typescript
import Image from "next/image";
import { getCardImageUrl, formatPrice } from "@/lib/utils";
import type { SellableCard } from "@/lib/types";

interface SellCardRowProps {
  item: SellableCard;
  onClick: () => void;
}

export default function SellCardRow({ item, onClick }: SellCardRowProps) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg bg-[var(--surface)] p-3 text-left transition-colors hover:bg-[var(--surface-hover)]"
    >
      <div className="relative h-16 w-11 flex-shrink-0 overflow-hidden rounded">
        <Image
          src={getCardImageUrl(item.card.card_number)}
          alt={item.card.name}
          fill
          sizes="44px"
          className="object-cover"
        />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{item.card.name}</p>
        <p className="text-xs text-[var(--text-secondary)]">{item.card.card_number}</p>
        <p className="text-xs text-[var(--accent)]">
          x{item.surplus} surplus
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold">
          {formatPrice(item.total_value)}
        </p>
        <p className="text-xs text-[var(--text-secondary)]">
          {formatPrice(item.price?.price_trend ?? null)} each
        </p>
      </div>
    </button>
  );
}
```

- [ ] **Step 3: Build the sell advisor page**

Replace `app/sell/page.tsx`:

```typescript
"use client";

import { useState, useCallback } from "react";
import { useCollection } from "@/lib/hooks/use-collection";
import { useAllDeckCards } from "@/lib/hooks/use-decks";
import { usePrices } from "@/lib/hooks/use-prices";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { buildSellableCards, timeAgo } from "@/lib/utils";
import SellSummary from "@/components/sell/sell-summary";
import SellCardRow from "@/components/sell/sell-card-row";
import CardPanel from "@/components/cards/card-panel";
import type { Card } from "@/lib/types";

const supabase = createClient();

export default function SellPage() {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const { data: collection } = useCollection();
  const { data: allDeckCards } = useAllDeckCards();
  const { data: prices } = usePrices();

  // Fetch all card data for owned cards
  const cardNumbers = collection?.map((c) => c.card_number) ?? [];
  const { data: cards } = useQuery<Card[]>({
    queryKey: ["sell-cards", cardNumbers],
    queryFn: async () => {
      if (cardNumbers.length === 0) return [];
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .in("card_number", cardNumbers);
      if (error) throw error;
      return data as Card[];
    },
    enabled: cardNumbers.length > 0,
  });

  const sellableCards =
    cards && collection && allDeckCards && prices
      ? buildSellableCards(cards, collection, allDeckCards ?? [], prices)
      : [];

  const totalSurplus = sellableCards.reduce((sum, s) => sum + s.surplus, 0);
  const totalValue = sellableCards.reduce(
    (sum, s) => sum + (s.total_value ?? 0),
    0
  );

  // Find latest price fetch time
  const latestFetch = prices?.reduce((latest, p) => {
    return !latest || p.fetched_at > latest ? p.fetched_at : latest;
  }, "" as string);

  const handleCardClick = useCallback((card: Card) => {
    setSelectedCard(card);
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Sell Advisor</h1>

      {sellableCards.length > 0 && (
        <SellSummary
          surplusCount={totalSurplus}
          totalValue={totalValue > 0 ? totalValue : null}
        />
      )}

      {latestFetch && (
        <p className="text-xs text-[var(--text-secondary)]">
          Prices updated {timeAgo(latestFetch)}
        </p>
      )}

      {sellableCards.length === 0 && (
        <p className="py-12 text-center text-[var(--text-secondary)]">
          No surplus cards to sell. Cards beyond your playset limit (4) or deck needs will appear here.
        </p>
      )}

      <div className="space-y-2">
        {sellableCards.map((item) => (
          <SellCardRow
            key={item.card.card_number}
            item={item}
            onClick={() => handleCardClick(item.card)}
          />
        ))}
      </div>

      <CardPanel card={selectedCard} onClose={() => setSelectedCard(null)} />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/sell/ app/sell/
git commit -m "feat: add sell advisor tab with surplus detection and pricing"
```

---

### Task 16: Authentication (Login Page + OAuth Callback)

**Files:**
- Create: `app/login/page.tsx`, `app/auth/callback/route.ts`
- Modify: `components/nav/top-nav-bar.tsx`

- [ ] **Step 1: Create login page**

Create `app/login/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

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
          <h1 className="text-2xl font-bold text-[var(--accent)]">DigiCollect</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {isSignUp ? "Create an account" : "Sign in to your account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            minLength={6}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
          />

          {error && (
            <p className={`text-sm ${error.includes("Check your email") ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[var(--accent)] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {loading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--text-secondary)]">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="text-[var(--accent)] hover:underline"
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create OAuth callback route**

Create `app/auth/callback/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/database";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
```

- [ ] **Step 3: Add auth status to top nav bar**

Update `components/nav/top-nav-bar.tsx` — add user state and sign out:

```typescript
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const tabs = [
  { href: "/database", label: "Database" },
  { href: "/collection", label: "Collection" },
  { href: "/decks", label: "Decks" },
  { href: "/sell", label: "Sell Advisor" },
];

export default function TopNavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/database");
    router.refresh();
  }

  return (
    <nav className="hidden border-b border-[var(--border)] bg-[var(--surface)] md:block">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link href="/database" className="text-lg font-bold text-[var(--accent)]">
          DigiCollect
        </Link>
        <div className="flex items-center gap-6">
          {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`text-sm transition-colors ${
                  isActive
                    ? "text-[var(--accent)] border-b-2 border-[var(--accent)] pb-1"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
          {user ? (
            <button
              onClick={handleSignOut}
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Sign Out
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm text-white hover:bg-[var(--accent-hover)]"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/login/ app/auth/ components/nav/top-nav-bar.tsx
git commit -m "feat: add authentication with login page and nav sign in/out"
```

---

### Task 17: Price Sync Script

**Files:**
- Create: `scripts/sync_prices.py`

- [ ] **Step 1: Create price sync script**

Create `scripts/sync_prices.py`:

```python
"""
Sync card prices into Supabase.

Tries Cardmarket API first (requires CARDMARKET_APP_TOKEN and CARDMARKET_APP_SECRET).
Falls back to Cardtrader API (requires CARDTRADER_ACCESS_TOKEN).
If neither is configured, exits with a warning.

Usage:
    python scripts/sync_prices.py
"""

import os
import sys
import time
import requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# Optional: Cardmarket credentials
CARDMARKET_APP_TOKEN = os.environ.get("CARDMARKET_APP_TOKEN")
CARDMARKET_APP_SECRET = os.environ.get("CARDMARKET_APP_SECRET")

# Optional: Cardtrader credentials
CARDTRADER_ACCESS_TOKEN = os.environ.get("CARDTRADER_ACCESS_TOKEN")


def fetch_prices_cardtrader(card_numbers: list[str]) -> dict[str, dict]:
    """
    Fetch prices from Cardtrader API.
    Returns a dict of card_number -> {price_avg, price_low, price_trend}.
    """
    if not CARDTRADER_ACCESS_TOKEN:
        return {}

    headers = {"Authorization": f"Bearer {CARDTRADER_ACCESS_TOKEN}"}
    prices = {}

    # Cardtrader's marketplace API — fetch Digimon TCG products
    try:
        resp = requests.get(
            "https://api.cardtrader.com/api/v2/marketplace/products",
            params={"game_id": 7},  # Digimon TCG game ID on Cardtrader
            headers=headers,
            timeout=30,
        )
        resp.raise_for_status()
        products = resp.json()

        for product in products:
            # Map Cardtrader product to our card numbers
            card_id = product.get("properties_hash", {}).get("collector_number", "")
            if card_id in card_numbers:
                price_cents = product.get("price", {}).get("cents", 0)
                price_eur = price_cents / 100.0
                if card_id not in prices or price_eur < (prices[card_id].get("price_low") or float("inf")):
                    prices.setdefault(card_id, {
                        "price_avg": price_eur,
                        "price_low": price_eur,
                        "price_trend": price_eur,
                    })
                    prices[card_id]["price_low"] = min(
                        prices[card_id]["price_low"], price_eur
                    )
    except Exception as e:
        print(f"Cardtrader API error: {e}")

    return prices


def fetch_prices_cardmarket(card_numbers: list[str]) -> dict[str, dict]:
    """
    Fetch prices from Cardmarket API (OAuth 1.0).
    Returns a dict of card_number -> {price_avg, price_low, price_trend}.

    Requires seller account credentials.
    """
    if not CARDMARKET_APP_TOKEN or not CARDMARKET_APP_SECRET:
        return {}

    # Cardmarket API requires OAuth 1.0 signing.
    # This is a placeholder — the actual implementation depends on
    # the Cardmarket API endpoints and OAuth library.
    print("Cardmarket API integration: credentials found but not yet implemented.")
    print("Falling back to Cardtrader...")
    return {}


def sync_prices():
    """Main price sync function."""
    print("Connecting to Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    # Get all card numbers from the database
    result = supabase.table("cards").select("card_number").execute()
    card_numbers = [row["card_number"] for row in result.data]
    print(f"Found {len(card_numbers)} cards to price")

    # Try Cardmarket first, then Cardtrader
    prices = fetch_prices_cardmarket(card_numbers)

    if not prices:
        print("Trying Cardtrader API...")
        prices = fetch_prices_cardtrader(card_numbers)

    if not prices:
        print("No price source configured or available.")
        print("Set CARDMARKET_APP_TOKEN/CARDMARKET_APP_SECRET or CARDTRADER_ACCESS_TOKEN")
        sys.exit(0)

    print(f"Got prices for {len(prices)} cards")

    # Upsert prices in batches
    batch = []
    for card_number, price_data in prices.items():
        batch.append({
            "card_number": card_number,
            "price_avg": price_data.get("price_avg"),
            "price_low": price_data.get("price_low"),
            "price_trend": price_data.get("price_trend"),
        })

        if len(batch) >= 100:
            supabase.table("card_prices").upsert(batch).execute()
            batch = []

    if batch:
        supabase.table("card_prices").upsert(batch).execute()

    result = supabase.table("card_prices").select("card_number", count="exact").execute()
    print(f"Done! Total priced cards: {result.count}")


if __name__ == "__main__":
    sync_prices()
```

- [ ] **Step 2: Commit**

```bash
git add scripts/sync_prices.py
git commit -m "feat: add price sync script with Cardmarket/Cardtrader fallback"
```

---

### Task 18: GitHub Actions Workflow for Data Sync

**Files:**
- Create: `.github/workflows/sync-data.yml`

- [ ] **Step 1: Create the workflow file**

Create `.github/workflows/sync-data.yml`:

```yaml
name: Sync Card Data & Prices

on:
  schedule:
    # Run daily at 6:00 UTC
    - cron: "0 6 * * *"
  workflow_dispatch: # Allow manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install dependencies
        run: pip install -r scripts/requirements.txt

      - name: Sync cards from Digimon Card API
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: python scripts/sync_cards.py

      - name: Sync prices
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          CARDMARKET_APP_TOKEN: ${{ secrets.CARDMARKET_APP_TOKEN }}
          CARDMARKET_APP_SECRET: ${{ secrets.CARDMARKET_APP_SECRET }}
          CARDTRADER_ACCESS_TOKEN: ${{ secrets.CARDTRADER_ACCESS_TOKEN }}
        run: python scripts/sync_prices.py
```

- [ ] **Step 2: Document the required secrets**

Update `.env.local.example`:

```env
# Frontend (used by Next.js)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Scripts (used by Python sync scripts — also set as GitHub Actions secrets)
SUPABASE_URL=your-supabase-project-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Price sync (optional — at least one needed for prices)
CARDMARKET_APP_TOKEN=your-cardmarket-app-token
CARDMARKET_APP_SECRET=your-cardmarket-app-secret
CARDTRADER_ACCESS_TOKEN=your-cardtrader-access-token
```

- [ ] **Step 3: Commit**

```bash
git add .github/ .env.local.example
git commit -m "feat: add GitHub Actions workflow for daily card and price sync"
```

---

### Task 19: Final Integration + Polish

**Files:**
- Modify: `app/database/page.tsx`, `app/collection/page.tsx`, `middleware.ts`

- [ ] **Step 1: Update middleware to allow public routes**

The current middleware refreshes sessions on all routes. Update it to not redirect unauthenticated users — we allow guest browsing of the database. The middleware only needs to refresh sessions, not enforce auth. Verify that `lib/supabase/middleware.ts` does NOT redirect to login (it shouldn't based on Task 3 — the `updateSession` function only calls `getUser()` to refresh, no redirect logic).

- [ ] **Step 2: Add "sign in required" messaging for protected features**

Collection, Decks, and Sell tabs need auth. Add a check at the top of each protected page. For example, in `app/collection/page.tsx`, add before the main return:

```typescript
// Add this import
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";

// Add inside the component, before other hooks:
const [user, setUser] = useState<User | null>(null);
const [authChecked, setAuthChecked] = useState(false);
const supabase = createClient();

useEffect(() => {
  supabase.auth.getUser().then(({ data: { user } }) => {
    setUser(user);
    setAuthChecked(true);
  });
}, [supabase.auth]);

if (authChecked && !user) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <p className="text-[var(--text-secondary)]">Sign in to access your collection.</p>
      <Link
        href="/login"
        className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm text-white hover:bg-[var(--accent-hover)]"
      >
        Sign In
      </Link>
    </div>
  );
}
```

Apply the same pattern to `app/decks/page.tsx` and `app/sell/page.tsx`.

- [ ] **Step 3: Verify full app flow**

```bash
npm run dev
```

Test the complete flow:
1. Visit /database — browse expansions without auth
2. Click a card — panel opens with "Price not available" and quantity at 0
3. Try /collection — shows "Sign in" prompt
4. Go to /login — create account
5. After login, /collection shows empty state
6. Go to /database, click a card, use +/− to add to collection
7. Check /collection — card appears with quantity
8. Go to /decks — create a deck, add cards from search
9. Check /sell — shows surplus cards if any exist

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add auth guards for protected pages and final integration"
```

---

### Task 20: Update CLAUDE.md and README

**Files:**
- Modify: `CLAUDE.md`, `README.md`

- [ ] **Step 1: Update CLAUDE.md with current architecture**

Update `CLAUDE.md` to reflect the implemented architecture, file structure, and development commands:

```markdown
# CLAUDE.md

## Project Overview

DigiCollect — a responsive web app for tracking Digimon TCG card collections, planning decks, and identifying surplus cards worth selling on Cardmarket.

## Tech Stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS
- **Backend:** Supabase (Postgres, Auth, Row Level Security)
- **Hosting:** Vercel (free tier)
- **Card Data:** Digimon Card API (https://digimoncard.io/api-public/)
- **Price Data:** Cardmarket API (primary), Cardtrader API (fallback)
- **Data Sync:** Python scripts + GitHub Actions (daily cron)
- **Client Caching:** TanStack Query (React Query)

## Development

```bash
npm run dev     # Start dev server at localhost:3000
npm run build   # Production build
npm run lint    # ESLint check
```

## Data Sync

```bash
pip install -r scripts/requirements.txt
python scripts/sync_cards.py    # Sync cards from Digimon Card API
python scripts/sync_prices.py   # Sync prices from Cardmarket/Cardtrader
```

Requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` env vars.

## Key Architecture Decisions

- Card images served from Bandai CDN: `https://world.digimoncard.com/images/cardlist/card/{card_number}.png`
- Sell logic: `surplus = owned - max(max_copies, sum across all decks)`
- Guest browsing allowed for card database; auth required for collection/decks/sell
- Bottom tab nav on mobile, top nav on desktop (768px breakpoint)
- Supabase RLS enforces per-user data isolation

## Database Schema

See `supabase/migrations/001_initial_schema.sql` for the full schema.
Tables: `cards`, `collection`, `decks`, `deck_cards`, `card_prices`
```

- [ ] **Step 2: Update README with setup instructions**

Update `README.md` with current setup instructions and feature status.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "docs: update CLAUDE.md and README with current architecture"
```
