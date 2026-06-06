# Public Sell-List Share Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user publish a public, read-only snapshot of their sell list at an unguessable `/s/{token}` URL that anyone can view without logging in, plus owner controls to publish, update, and stop sharing.

**Architecture:** A `sell_shares` table (one row per user, owner-only RLS) stores a frozen JSON snapshot. Anonymous read goes through a `SECURITY DEFINER` SQL function `get_sell_share(token)` (no service-role key, no table enumeration). The owner publishes via a modal on the sell page; the public page is a server component that calls the RPC and renders a list/grid of cards.

**Tech Stack:** Next.js 16 (App Router, async server components), React 19, TypeScript, Tailwind CSS 4, TanStack Query v5, Supabase (Postgres + RLS), Lucide React, Vitest.

---

## File Structure

**New files:**
- `supabase/migrations/008_sell_shares.sql` — table + RLS + `get_sell_share` RPC.
- `lib/sell-share-payload.ts` (+ `.test.ts`) — pure `buildSharePayload`.
- `lib/share-token.ts` (+ `.test.ts`) — pure `generateShareToken`.
- `lib/hooks/use-sell-share.ts` — fetch/publish/delete the owner's share.
- `components/share/public-sell-list.tsx` — renders payload items (list/grid).
- `components/sell/share-modal.tsx` — publish/manage modal.
- `app/s/[token]/page.tsx` — public server-component page.

**Modified files:**
- `lib/types.ts` — add `SellSharePayloadItem`, `SellShare`.
- `app/sell/page.tsx` — add a "Share" button + the modal.

**Reused (unchanged):** `components/cards/view-toggle.tsx` (`ViewToggle`, `CardView`), `components/cards/card-image.tsx`, `lib/utils.ts` (`formatPrice`), `lib/supabase/{client,server}.ts`.

> **Deploy note:** `008_sell_shares.sql` must be applied to the Supabase project (SQL editor or `supabase db push`) before the feature works at runtime. Local `build`/`lint`/`test` do not require it; the manual browser smoke test does.

---

## Task 1: Database migration (table + RLS + RPC)

**Files:**
- Create: `supabase/migrations/008_sell_shares.sql`

- [ ] **Step 1: Create the migration file with EXACTLY this content**

```sql
-- ============================================
-- Public sell-list shares (Phase 2b)
-- One row per user; payload is a frozen snapshot of their sell list.
-- ============================================
create table public.sell_shares (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token text unique not null,
  title text,
  contact_note text,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_sell_shares_token on public.sell_shares (token);

alter table public.sell_shares enable row level security;

create policy "Users can view their own share"
  on public.sell_shares for select
  using (auth.uid() = user_id);

create policy "Users can create their own share"
  on public.sell_shares for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own share"
  on public.sell_shares for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own share"
  on public.sell_shares for delete
  using (auth.uid() = user_id);

-- Public read by EXACT token only (no enumeration; no public select policy).
create or replace function public.get_sell_share(p_token text)
returns table (
  title text,
  contact_note text,
  payload jsonb,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select s.title, s.contact_note, s.payload, s.updated_at
  from public.sell_shares s
  where s.token = p_token;
$$;

grant execute on function public.get_sell_share(text) to anon, authenticated;
```

- [ ] **Step 2: Apply the migration if a Supabase CLI/link is available; otherwise flag it**

Run: `npx supabase db push` (only if the repo is linked to a Supabase project).
If the CLI is not installed or the project is not linked, do NOT block: this is a manual deploy step. Note in your report that migration 008 must be applied via the Supabase SQL editor before runtime testing.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/008_sell_shares.sql
git commit -m "feat: add sell_shares table, RLS, and get_sell_share RPC"
```

---

## Task 2: Types

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Append these interfaces to `lib/types.ts`**

```ts
export interface SellSharePayloadItem {
  card_number: string;
  name: string;
  variant_name: string;
  image_url: string | null;
  quantity: number;
  price: number | null;
}

export interface SellShare {
  user_id: string;
  token: string;
  title: string | null;
  contact_note: string | null;
  payload: SellSharePayloadItem[];
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add SellShare types"
```

---

## Task 3: `buildSharePayload` pure logic (TDD)

**Files:**
- Create: `lib/sell-share-payload.ts`
- Create: `lib/sell-share-payload.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from "vitest";
import { buildSharePayload } from "@/lib/sell-share-payload";
import type { Card, CardPrice, SellableCard } from "@/lib/types";

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

function makePrice(price_low: number | null, price_trend: number | null = null): CardPrice {
  return { card_number: "x", price_avg: null, price_low, price_trend, fetched_at: "" };
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
  it("maps a card using surplus quantity and the low price", () => {
    const items = [
      makeSellable({ card: makeCard("BT9-009", "WarGreymon", "Regular", "http://img/wg.png"), owned: 5, surplus: 3, price: makePrice(19.99) }),
    ];
    expect(buildSharePayload(items)).toEqual([
      { card_number: "BT9-009", name: "WarGreymon", variant_name: "Regular", image_url: "http://img/wg.png", quantity: 3, price: 19.99 },
    ]);
  });

  it("falls back to owned quantity and price_trend", () => {
    const items = [
      makeSellable({ card: makeCard("BT9-007", "Agumon"), owned: 2, surplus: 0, price: makePrice(null, 1.25) }),
    ];
    expect(buildSharePayload(items)[0]).toMatchObject({ quantity: 2, price: 1.25 });
  });

  it("passes through variant name and null price/image", () => {
    const items = [
      makeSellable({ card: makeCard("BT9-008", "Greymon", "Alt Art", null), owned: 1, surplus: 1, price: null }),
    ];
    expect(buildSharePayload(items)[0]).toEqual({
      card_number: "BT9-008",
      name: "Greymon",
      variant_name: "Alt Art",
      image_url: null,
      quantity: 1,
      price: null,
    });
  });

  it("returns an empty array for empty input", () => {
    expect(buildSharePayload([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `@/lib/sell-share-payload`.

- [ ] **Step 3: Implement `lib/sell-share-payload.ts`**

```ts
import type { SellableCard, SellSharePayloadItem } from "./types";

/**
 * Builds the frozen snapshot items for a public share from sellable cards.
 * Quantity and price mirror the CSV/text exports so all three agree.
 */
export function buildSharePayload(items: SellableCard[]): SellSharePayloadItem[] {
  return items.map((item) => ({
    card_number: item.card.card_number,
    name: item.card.name,
    variant_name: item.card.variant_name,
    image_url: item.card.image_url,
    quantity: item.surplus > 0 ? item.surplus : item.owned,
    price: item.price?.price_low ?? item.price?.price_trend ?? null,
  }));
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/sell-share-payload.ts lib/sell-share-payload.test.ts
git commit -m "feat: add buildSharePayload snapshot builder"
```

---

## Task 4: `generateShareToken` pure logic (TDD)

**Files:**
- Create: `lib/share-token.ts`
- Create: `lib/share-token.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from "vitest";
import { generateShareToken } from "@/lib/share-token";

describe("generateShareToken", () => {
  it("returns a 16-char token by default", () => {
    expect(generateShareToken()).toHaveLength(16);
  });

  it("respects a custom length", () => {
    expect(generateShareToken(24)).toHaveLength(24);
  });

  it("uses only URL-safe characters", () => {
    expect(generateShareToken(256)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("produces a different token on each call", () => {
    expect(generateShareToken()).not.toBe(generateShareToken());
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `@/lib/share-token`.

- [ ] **Step 3: Implement `lib/share-token.ts`**

```ts
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/**
 * Generates a URL-safe random token using the Web Crypto API.
 * Available in browsers and in Node's global `crypto` (the runtime here).
 */
export function generateShareToken(length = 16): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/share-token.ts lib/share-token.test.ts
git commit -m "feat: add generateShareToken"
```

---

## Task 5: `useSellShare` hooks

**Files:**
- Create: `lib/hooks/use-sell-share.ts`

- [ ] **Step 1: Create the hook file with EXACTLY this content**

```ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { buildSharePayload } from "@/lib/sell-share-payload";
import { generateShareToken } from "@/lib/share-token";
import type { SellShare, SellableCard } from "@/lib/types";

const supabase = createClient();

export function useSellShare() {
  return useQuery<SellShare | null>({
    queryKey: ["sell-share"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from("sell_shares")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return (data as SellShare | null) ?? null;
    },
  });
}

export function usePublishSellShare() {
  const queryClient = useQueryClient();
  return useMutation({
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
      if (error) throw error;
      return token;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sell-share"] }),
  });
}

export function useDeleteSellShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("sell_shares").delete().eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sell-share"] }),
  });
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/use-sell-share.ts
git commit -m "feat: add useSellShare publish/delete hooks"
```

---

## Task 6: `PublicSellList` component

**Files:**
- Create: `components/share/public-sell-list.tsx`

- [ ] **Step 1: Create the component with EXACTLY this content**

```tsx
"use client";

import { useState } from "react";
import CardImage from "@/components/cards/card-image";
import ViewToggle, { type CardView } from "@/components/cards/view-toggle";
import { formatPrice } from "@/lib/utils";
import type { SellSharePayloadItem } from "@/lib/types";

interface PublicSellListProps {
  items: SellSharePayloadItem[];
}

export default function PublicSellList({ items }: PublicSellListProps) {
  const [view, setView] = useState<CardView>("list");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-muted)]">{items.length} cards available</p>
        <ViewToggle view={view} onChange={setView} />
      </div>

      {view === "list" && (
        <div className="divide-y divide-[var(--border)]">
          {items.map((item) => (
            <div key={item.card_number} className="flex items-center gap-3 py-2">
              <div className="relative h-12 w-9 flex-none overflow-hidden rounded">
                <CardImage
                  cardNumber={item.card_number}
                  alt={item.name}
                  imageUrl={item.image_url}
                  fill
                  sizes="36px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--text-primary)]">{item.name}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {item.card_number}
                  {item.variant_name !== "Regular" && ` · ${item.variant_name}`}
                </p>
              </div>
              <span className="text-xs text-[var(--text-muted)]">{item.quantity}×</span>
              <span className="min-w-[64px] text-right text-sm font-bold text-[var(--green)]">
                {item.price !== null ? formatPrice(item.price) : "—"}
              </span>
            </div>
          ))}
        </div>
      )}

      {view === "grid" && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {items.map((item) => (
            <div
              key={item.card_number}
              className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]"
            >
              <div className="relative aspect-[5/7]">
                <CardImage
                  cardNumber={item.card_number}
                  alt={item.name}
                  imageUrl={item.image_url}
                  fill
                  sizes="(max-width: 768px) 33vw, 20vw"
                  className="object-cover"
                />
                <span className="absolute right-1 top-1 rounded-full border border-[var(--border-light)] bg-[var(--elevated)] px-2 py-0.5 text-xs font-bold text-[var(--text-primary)]">
                  {item.quantity}×
                </span>
              </div>
              <div className="p-2">
                <p className="truncate text-xs font-medium">{item.name}</p>
                <p className="text-xs font-bold text-[var(--green)]">
                  {item.price !== null ? formatPrice(item.price) : "—"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
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
git add components/share/public-sell-list.tsx
git commit -m "feat: add PublicSellList for the public share page"
```

---

## Task 7: `ShareModal` component

**Files:**
- Create: `components/sell/share-modal.tsx`

- [ ] **Step 1: Create the component with EXACTLY this content**

```tsx
"use client";

import { useState, useEffect } from "react";
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
  const { data: share } = useSellShare();
  const publish = usePublishSellShare();
  const del = useDeleteSellShare();

  const [title, setTitle] = useState("");
  const [contactNote, setContactNote] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(share?.title ?? "");
      setContactNote(share?.contact_note ?? "");
      setConfirmStop(false);
      setCopied(false);
    }
  }, [open, share]);

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
      <div className="fixed inset-x-4 top-[12vh] z-50 mx-auto max-w-md rounded-2xl bg-[var(--surface)] p-5 shadow-xl md:inset-x-auto md:w-[420px]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">
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
              <label className="mb-1 block text-xs text-[var(--text-muted)]">Page title (optional)</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                placeholder="e.g. Marcus's Digimon for sale"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--text-muted)]">Contact note (optional)</label>
              <input
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
              <label className="mb-1 block text-xs text-[var(--text-muted)]">Page title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--text-muted)]">Contact note</label>
              <input value={contactNote} onChange={(e) => setContactNote(e.target.value)} maxLength={140} className={inputClass} />
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
```

- [ ] **Step 2: Lint + type-check**

Run: `npm run lint`
Then: `npx tsc --noEmit`
Expected: no errors for the new file.

- [ ] **Step 3: Commit**

```bash
git add components/sell/share-modal.tsx
git commit -m "feat: add ShareModal publish/manage UI"
```

---

## Task 8: Public page `/s/[token]`

**Files:**
- Create: `app/s/[token]/page.tsx`

- [ ] **Step 1: Create the page with EXACTLY this content**

```tsx
import { notFound } from "next/navigation";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import PublicSellList from "@/components/share/public-sell-list";
import type { SellSharePayloadItem } from "@/lib/types";

interface SharePageProps {
  params: Promise<{ token: string }>;
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_sell_share", { p_token: token });

  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) notFound();

  const items = (row.payload as SellSharePayloadItem[]) ?? [];
  const title = row.title || "Cards for sale";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {row.contact_note && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
            <Mail size={14} />
            {row.contact_note}
          </p>
        )}
      </div>

      <PublicSellList items={items} />

      <div className="flex items-center justify-between border-t border-[var(--border)] pt-3 text-xs text-[var(--text-muted)]">
        <span>Prices via Cardmarket</span>
        <a href="/" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          Shared from CardBoard →
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: success; `/s/[token]` appears in the route list (as a dynamic `ƒ` route).

- [ ] **Step 3: Commit**

```bash
git add app/s/[token]/page.tsx
git commit -m "feat: add public /s/[token] share page"
```

---

## Task 9: Wire the Share button into the sell page

**Files:**
- Modify: `app/sell/page.tsx`

- [ ] **Step 1: Add imports**

After this existing import:
```tsx
import CopyListButton from "@/components/sell/copy-list-button";
```
add:
```tsx
import ShareModal from "@/components/sell/share-modal";
```
And add `Share2` to the existing lucide-react import. Change:
```tsx
import { TrendingUp, Clock, LogIn, Download } from "lucide-react";
```
to:
```tsx
import { TrendingUp, Clock, LogIn, Download, Share2 } from "lucide-react";
```

- [ ] **Step 2: Add modal open state**

Immediately after this existing line:
```tsx
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
```
add:
```tsx
  const [shareOpen, setShareOpen] = useState(false);
```

- [ ] **Step 3: Add the Share button to the button group**

Replace this block:
```tsx
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
```
with:
```tsx
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShareOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--elevated)]"
            >
              <Share2 size={15} />
              Share
            </button>
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
```

- [ ] **Step 4: Render the modal**

Replace this existing line near the end of the JSX:
```tsx
      <CardPanel card={selectedCard} onClose={() => setSelectedCard(null)} onCardSelect={setSelectedCard} />
```
with:
```tsx
      <CardPanel card={selectedCard} onClose={() => setSelectedCard(null)} onCardSelect={setSelectedCard} />
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} items={sellableCards} />
```

- [ ] **Step 5: Lint + build + test**

Run: `npm run lint` — expect no errors.
Run: `npm run build` — expect success.
Run: `npm test` — expect all unit tests pass.

- [ ] **Step 6: Manual smoke test (requires migration 008 applied to Supabase)**

Run `npm run dev`, sign in, open `/sell`:
- Click "Share" → modal opens in the "not shared" state → fill title + contact → "Publish & get link".
- Modal switches to the shared state showing `…/s/{token}`. Copy it; open in a private/incognito window (logged out) → the public page shows the title, contact note, card count, and the cards with the list/grid toggle.
- Back in the modal: edit the title → "Update snapshot" → refresh the public page → change reflected (same URL).
- "Stop sharing" → confirm prompt → confirm → reopen the public link → shows the not-found page.

- [ ] **Step 7: Commit**

```bash
git add app/sell/page.tsx
git commit -m "feat: add Share button to the sell page"
```

---

## Self-Review

**Spec coverage:**
- `sell_shares` table + owner RLS + `get_sell_share` SECURITY DEFINER RPC (no enumeration) → Task 1. ✅
- Snapshot payload shape + `buildSharePayload` mirroring CSV/text choices, incl. frozen `image_url` → Tasks 2, 3. ✅
- Unguessable token, reused across re-publishes; publish/update/delete under owner RLS → Tasks 4, 5. ✅
- Share modal: two states, title/contact inputs, copy link, update snapshot, open, stop-sharing with confirm → Task 7. ✅
- Public page at `/s/[token]` via RPC, title/contact/count, list+grid toggle, footer, notFound on missing → Tasks 6, 8. ✅
- Publishes all sellable cards (`items={sellableCards}`), not the filter → Task 9. ✅
- Out of scope (live data, multiple links, last-updated date, image card) → not implemented. ✅
- Deploy note: migration must be applied → Task 1 Step 2 + header note. ✅

**Placeholder scan:** No TBD/TODO/"handle edge cases"; every code step is complete. ✅

**Type consistency:** `SellSharePayloadItem`/`SellShare` (Task 2) used by `buildSharePayload` (Task 3), `useSellShare` (Task 5), `PublicSellList` (Task 6), and the page (Task 8). `buildSharePayload(items: SellableCard[]): SellSharePayloadItem[]` and `generateShareToken(length?)` signatures are consistent across Tasks 3–5. The publish mutation arg `{ title, contactNote, items, existingToken }` (Task 5) matches the call in Task 7. RPC param `p_token` matches between Task 1 (function) and Task 8 (call). `ShareModal({ open, onClose, items })` (Task 7) matches its use in Task 9. ✅
