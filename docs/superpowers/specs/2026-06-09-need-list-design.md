# Need List — Design

**Date:** 2026-06-09
**Status:** Approved (pending implementation plan)
**Phase:** 3 of 3 (Need list / wishlist). Mirrors the existing Sell Advisor on the
"what to acquire" side: deck shortfalls + a manual wishlist, surfaced on a new
`/needs` page and nav tab.

## Problem

CardBoard tells you what you own and what's surplus to sell, but nothing tells
you what you're **missing**. A player building decks needs to know which cards
their decks are short on, and wants a place to track cards they intend to buy.

## Goal

A `/needs` page that shows, grouped by deck, the cards each deck is short on
(plus per-deck completion progress) and a manual wishlist section — with a
deduplicated estimated buy cost and a copy/export buy list.

### Success criteria

- For each deck, the page lists every card the deck wants more copies of than the
  user owns, with the quantity still needed and an estimated cost to acquire.
- Each deck shows a completion figure (cards you can field / cards the deck wants).
- A manual wishlist lets the user track cards to acquire with an editable target
  quantity; owning copies reduces (and can clear) the wishlist need.
- A top-of-page summary shows the **deduplicated** total cards needed and
  estimated cost, and a buy list can be copied as text and exported as CSV.

## Context

- Mirrors `app/sell/page.tsx` + `lib/sell-utils.ts` + `lib/hooks/use-sell-list.ts`.
- Needs are computed at **base-card level**: `totalOwned` for a base = sum of
  `collection.quantity` across that base's variants (same as `buildSellableCards`).
- `deck_cards` is keyed `(deck_id, card_number)`; a card appears at most once per
  deck. Deck cards are stored by base `card_number`.
- Prices: `card_prices` per `card_number`; unit price for need cost is
  `price_low ?? price_trend` (the cheapest acquisition estimate), falling back to
  the base card's price if the variant has none.
- Card variants already promoted to separate `cards` rows (migration 005) with
  `base_card_number` + `variant_name`.
- Existing patterns to reuse: `SellListToggle`, `SellCardRow`, `SellFilterChips`,
  `CopyListButton`, `generateSellCsv`/`downloadCsv`, `CardPanel`, auth gate.

## The need model (math)

All quantities are computed at **base-card level**. `totalOwned(base)` = sum of
owned quantities across the base's variants.

### 1. Per-deck shortfall (what each deck section shows)

For each deck, for each card it uses:

```
deckNeed = max(0, deckWants − totalOwned(base))
```

**Per-deck independent:** every deck section assumes it can use all of the user's
owned copies. A card shared by two decks appears in both sections, each computed
independently. (The page does not attempt to allocate physical copies across
decks.)

### 2. Wishlist shortfall

Each wishlist entry stores a `target` quantity (defaults to the card's
`max_copies` when added). The need:

```
wishNeed = max(0, target − totalOwned(base))
```

### 3. Global need (top summary + buy list — deduplicated)

Per base card, across all sources:

```
globalNeed = max(0, max(maxDeckWantsAcrossDecks, wishlistTarget) − totalOwned(base))
```

i.e. buy each distinct card **once**, sized to its single largest demand (most
demanding deck, or the wishlist target, whichever is higher). This is the
"swap cards between decks" model and follows from the per-deck-independent choice.

> This supersedes a "sum across decks" interpretation at the page-total level.
> The existing **Sell Advisor surplus** formula
> (`owned − max(max_copies, Σ deckWants)`) is **unchanged** by this work.

### Cost

For any need quantity `n` of a card with unit price `p = price_low ?? price_trend`:

```
estCost = p === null ? null : n * p
```

Cards with no listing show "—" for cost and contribute 0 to the total cost (but
still count toward the cards-needed total).

### Deck completion

For a deck:

```
want = Σ deckWants (over the deck's cards)
have = Σ min(totalOwned(base), deckWants) (over the deck's cards)
```

`have / want` is the completion figure. `have === want` ⇒ deck complete.

## Data model

### Migration `009_wishlist.sql`

```sql
create table public.wishlist (
  user_id uuid not null references auth.users(id) on delete cascade,
  card_number text not null references public.cards(card_number) on delete cascade,
  quantity integer not null default 4 check (quantity >= 1),
  added_at timestamptz not null default now(),
  primary key (user_id, card_number)
);

alter table public.wishlist enable row level security;

create policy "Users can view their own wishlist"
  on public.wishlist for select using (auth.uid() = user_id);
create policy "Users can add to their own wishlist"
  on public.wishlist for insert with check (auth.uid() = user_id);
create policy "Users can update their own wishlist"
  on public.wishlist for update using (auth.uid() = user_id);
create policy "Users can remove from their own wishlist"
  on public.wishlist for delete using (auth.uid() = user_id);
```

Mirrors `sell_list` (migration 006) plus the editable `quantity` (target). The
`quantity` default of 4 matches the most common `max_copies`; the toggle sets it
to the card's actual `max_copies` on add.

> Deploy note: migration 009 must be applied manually in the Supabase SQL editor
> (the dev environment has no linked Supabase / Docker), same as migration 008.

### Types (`lib/types.ts`)

```ts
export interface WishlistEntry {
  user_id: string;
  card_number: string;
  quantity: number; // target
  added_at: string;
}

export interface NeededCard {
  card: Card;        // representative variant (Regular preferred)
  need: number;      // quantity still needed
  owned: number;     // totalOwned for the base
  price: CardPrice | null;
  est_cost: number | null;
}

export interface DeckNeedSection {
  deck: Deck;
  have: number;
  want: number;
  rows: NeededCard[]; // deckNeed > 0, sorted by est_cost desc
}

export interface BuyListItem {
  card: Card;
  need: number;       // globalNeed
  price: CardPrice | null;
  est_cost: number | null;
}
```

The representative variant for a base is chosen the same way `buildSellableCards`
sorts — "Regular" first, then by `card_number` — so display is deterministic.

## Data layer — `lib/hooks/use-wishlist.ts`

Mirrors `use-sell-list.ts`:

- `useWishlist()` → `WishlistEntry[]` for the current user (empty if signed out).
- `useSetWishlist()` → mutation `({ cardNumber, quantity }) ⇒ upsert` into
  `wishlist`, invalidates `["wishlist"]`.
- `useRemoveFromWishlist()` → mutation `(cardNumber) ⇒ delete`, invalidates
  `["wishlist"]`.

## Pure logic — `lib/need-utils.ts` (tested)

All functions are pure (no I/O), mirroring `lib/sell-utils.ts`.

```ts
export function totalOwnedByBase(
  cards: Card[], collection: CollectionEntry[]
): Map<string, number>;

export function pickRepresentativeVariant(variants: Card[]): Card;

export function buildDeckNeedSections(
  cards: Card[],
  collection: CollectionEntry[],
  decks: Deck[],
  allDeckCards: DeckCard[],
  prices: CardPrice[]
): DeckNeedSection[];   // ordered by deck updated_at desc; rows sorted by est_cost desc

export function buildWishlistNeeds(
  cards: Card[],
  collection: CollectionEntry[],
  wishlist: WishlistEntry[],
  prices: CardPrice[]
): NeededCard[];        // wishNeed > 0, sorted by est_cost desc

export function buildBuyList(
  sections: DeckNeedSection[],
  wishlistNeeds: NeededCard[]
): { items: BuyListItem[]; cardCount: number; totalCost: number };
```

- `buildDeckNeedSections`: group cards by base; for each deck, for each
  `deck_cards` row, compute `deckNeed`; include rows with `deckNeed > 0`; compute
  `have`/`want`. Price lookup falls back from variant to base.
- `buildBuyList`: per base card, take `max` need across all deck sections and the
  wishlist (NOT sum); produce one `BuyListItem` per distinct card; `cardCount` =
  Σ need; `totalCost` = Σ est_cost (skipping nulls). Sorted by est_cost desc.

## UI — `app/needs/page.tsx` (grouped by deck)

Client component with a `Suspense` wrapper, mirroring `app/sell/page.tsx`.

- **Auth gate:** signed-out users see a centered sign-in prompt (`ShoppingCart`
  icon, "Sign in to see what your decks need.", Sign In button) — same shape as the
  sell page gate.
- **Data:** `useCollection`, `useDecks`, `useAllDeckCards`, `usePrices`,
  `useWishlist`; fetch `Card[]` for all card numbers referenced by deck_cards +
  wishlist + collection via a `useQuery` (same approach as the sell page).
- **Header:** `<h1>Need List</h1>`; when there's anything to show, a summary line
  (`{cardCount} cards needed · est. €{totalCost} to complete`) with count in
  `--yellow` and cost in `--green`, plus **Copy buy list** (`CopyBuyListButton`,
  built on `formatBuyListText`) and **Export CSV** buttons on the right (both use
  the deduped `BuyListItem[]`). Mirrors the sell page header button group.
- **Deck sections** (`components/needs/deck-need-section.tsx`): for each section,
  a header row — deck name as a `<Link href="/decks/{id}">` + completion `have /
  want` and a thin progress bar (`--blue` at 50% opacity while incomplete,
  `--green` when complete, per the design system; bars never use the accent).
  Complete decks (`rows.length === 0`) render collapsed: name + `have/want` + a
  green check, no rows. Incomplete decks list `NeedCardRow`s.
- **`components/needs/need-card-row.tsx`:** thumbnail (`CardImage`), name, card
  number, a `need {n}` pill in `--yellow`, and on the right the est. cost in
  `--green` with a "€{unit} each" sub-line (or "No listings" when price is null).
  Clicking opens `CardPanel`. Styled like `SellCardRow`.
- **Wishlist section** (`components/needs/wishlist-section.tsx`): `★ Wishlist`
  header in `--purple`; each row is a `NeedCardRow` plus an inline quantity stepper
  (− / value / +) bound to `useSetWishlist` to edit the target, and a remove
  button (`useRemoveFromWishlist`). Shown only when the wishlist has entries; when
  the wishlist is empty the section is omitted (the case of nothing at all is
  handled by the overall empty state below).
- **Overall empty state:** when there are no deck needs and no wishlist entries,
  a centered `ShoppingCart` icon + "Build a deck or add cards to your wishlist to
  see what you need."
- **`CardPanel`** rendered at the bottom, opened by row clicks (same as sell page).

## Wishlist entry point — `components/needs/wishlist-toggle.tsx`

Mirrors `SellListToggle`, placed in `CardPanel` directly below the existing
Sell-list toggle:

- Reads `useWishlist`; `isOnList = wishlist.some(w => w.card_number === cardNumber)`.
- Not on list → "Add to wishlist" (neutral `--elevated`/`--border` style); on tap
  calls `useSetWishlist({ cardNumber, quantity: card.max_copies })`.
- On list → "On wishlist" (`--purple-translucent` / `--purple` / `--purple-border`,
  matching the sell toggle's selected style but in purple); on tap removes via
  `useRemoveFromWishlist`.
- Hidden for signed-out users. Loading uses a spinner like `SellListToggle`.

`CardPanel` must receive `card.max_copies` — it already has the full `card`, so no
new prop is needed.

## Navigation + buy-list text/CSV

- **New 6th tab "Needs"** (`ShoppingCart` icon, `href: "/needs"`) added to the
  `tabs` arrays in both `components/nav/top-nav-bar.tsx` and
  `components/nav/bottom-tab-bar.tsx`, positioned after "Sell".
- **`proxy.ts`:** add `/needs` to the protected-route list so signed-out users are
  redirected to `/login?next=/needs` (consistent with `/collection`, `/decks`,
  `/sell`).
- **`lib/buy-list-text.ts`:** `formatBuyListText(items: BuyListItem[]): string` —
  one line per card: `{need}x {name}[ · {variant}] ({card_number})[ — €{price}
  each]` (variant suffix only when not "Regular"; price suffix only when known).
  No total/footer. Mirrors `lib/share-text.ts`.
- **`components/needs/copy-buy-list-button.tsx`:** clipboard button with transient
  copied/error state, mirroring `components/sell/copy-list-button.tsx`.
- **`generateBuyCsv(items: BuyListItem[]): string`** added to `lib/export-csv.ts`
  (reusing `escapeCsvField`/`downloadCsv`). Columns: Card Number, Name, Expansion,
  Variant, Rarity, Quantity Needed, Price (EUR), Est. Cost (EUR).

## Testing

- **Unit (Vitest):**
  - `need-utils.ts`: `totalOwnedByBase` (sums variants); `buildDeckNeedSections`
    (deckNeed clamps at 0, owning enough drops a row, `have`/`want` math, ordering
    by est_cost desc, variant→base price fallback); `buildWishlistNeeds` (target −
    owned, drops cleared rows); `buildBuyList` (dedup by **max** across two decks +
    wishlist, `cardCount` and `totalCost` sums skip null costs).
  - `buy-list-text.ts`: line format with/without variant and price; empty list.
  - `export-csv.ts`: `generateBuyCsv` header + a row, field escaping, empty list.
- **Manual:** sign in; add cards to two decks (one card shared); own some copies;
  set wishlist targets; verify deck sections, completion bars, per-deck independent
  needs, deduped top total + cost, copy/export output, wishlist stepper +
  add/remove from the card panel, and the new nav tab + auth redirect.

## Out of scope (deliberately)

- **Allocating owned copies across decks** (per-deck independent was chosen).
- **A flat-list / filter-chip layout** (grouped-by-deck was chosen).
- **Public sharing of the need/buy list** (sharing is sell-side only for now).
- **Price-target alerts / "notify when cheaper"** — needs only shows current
  estimated cost.
- **Marketplace deep links** (Cardtrader search URLs) — copy/export text is enough
  for v1; can be a follow-on.
