# Seller-Set Custom Prices in the Share — Design

**Date:** 2026-06-08
**Status:** Approved (pending implementation plan)
**Phase:** Extends Phase 2b (public sell-share page). Builds directly on the
`sell_shares` snapshot feature shipped on 2026-06-06.

## Problem

The public share page lists the seller's cards at the auto-fetched Cardtrader
market price, with no way for the seller to set their own asking price. Sellers
want to publish their own prices (e.g. a small discount, or a price for a card
with no market data).

## Goal

In the Share modal, let the seller set an asking price per card. The published
snapshot uses these prices; the public page presents them as the seller's
asking prices.

### Success criteria
- The Share modal shows every sellable card with an editable € price, prefilled
  sensibly, in both the publish and update states.
- Publishing stores the seller's prices in the snapshot; the public page shows
  them.
- Re-opening the modal prefills the prices the seller last published.
- No database schema change.

## Context: current implementation (Phase 2b)

- `sell_shares.payload` (jsonb) stores an array of `SellSharePayloadItem`
  (`card_number, name, variant_name, image_url, quantity, price`). `price` is
  currently the Cardtrader market price (`price_low ?? price_trend`).
- `lib/sell-share-payload.ts` → `buildSharePayload(items: SellableCard[])` maps
  sellable cards to payload items, deriving price from the market.
- `lib/hooks/use-sell-share.ts` → `usePublishSellShare()` calls
  `buildSharePayload(items)` and upserts the row (token reused across
  re-publishes).
- `components/sell/share-modal.tsx` — publish/update modal with Title + Contact
  inputs, seeded once per open via a `seededRef` + the query's `isFetched`.
- `app/s/[token]/page.tsx` — public page; footer currently reads "Prices via
  Cardtrader".

## Design

### Data model
**No schema change.** The seller's asking price per card is stored as the
`price` of each `SellSharePayloadItem` in the existing `payload`. There is no
separate overrides table/column — the published snapshot *is* the source of
truth for the seller's prices.

### Price prefill logic (in the modal)
The modal seeds an editable price map from `sellableCards` (all sellable) when
it opens, once per open. For each card, the initial input value is, in order:
1. the **last-published price** for that card (from the existing share's
   `payload`, matched by `card_number`), if a share exists and contains it;
2. otherwise the **Cardtrader market price** (`price_low ?? price_trend`);
3. otherwise empty.

Prices are held in component state as strings (controlled inputs):
`Record<cardNumber, string>`. Clearing an input ⇒ that card is published with
**no price** (renders "—" on the public page).

### `buildSharePayload` change
New signature (the modal owns the resolved prices):
```ts
buildSharePayload(
  items: SellableCard[],
  prices: Record<string, number | null>,
): SellSharePayloadItem[]
```
For each item: `price = prices[item.card.card_number] ?? null`; `quantity`,
`name`, `variant_name`, `image_url` come from the card exactly as before. It no
longer reads `item.price` (market price is resolved in the modal at seed time).

### Publish flow
`usePublishSellShare()`'s mutation argument gains
`prices: Record<string, number | null>`. It calls
`buildSharePayload(items, prices)` and upserts as today (token reused). The
modal converts its string price map to numbers via a `parsePrice` helper before
calling publish.

### `parsePrice` helper (pure, tested)
```ts
parsePrice(input: string): number | null
```
- Trim. Empty ⇒ `null`.
- Parse as a float (accept `,` or `.` decimal separator → normalize comma to
  dot). `NaN` ⇒ `null`. Negative ⇒ `null`.
- Otherwise return the number rounded to 2 decimals.

### Components / files

**New:**
- `components/sell/share-price-editor.tsx` — the per-card price list (keeps the
  already-large modal focused). Props: `{ items: SellableCard[]; prices: Record<string, string>; onChange: (cardNumber: string, value: string) => void }`.
  Renders a scrollable list (max-height, overflow-y-auto); each row shows the
  card name + variant (and card number) and a € number input bound to
  `prices[card_number]`. Shows the market price as a muted hint where available.

**Modified:**
- `lib/sell-share-payload.ts` (+ `.test.ts`) — new `buildSharePayload(items, prices)` signature.
- `lib/share-price.ts` (+ `.test.ts`) — new `parsePrice` helper. (Kept separate
  from `share-text`/`sell-share-payload` for one clear responsibility.)
- `lib/hooks/use-sell-share.ts` — `usePublishSellShare` accepts and forwards
  `prices`.
- `components/sell/share-modal.tsx` — add the price-map state (`Record<string, string>`),
  seed it once per open alongside title/contact (payload price → market →
  empty), render `<SharePriceEditor>`, and pass `parsePrice`-converted prices to
  `publish.mutate`.
- `app/s/[token]/page.tsx` — footer text → **"Asking prices set by seller"**.

## Error handling
- Invalid/blank/negative price input ⇒ treated as no price for that card (null),
  consistent with the public page's "—" rendering. No blocking validation.
- Publish/delete errors behave as today (mutation error; button returns to idle).

## Out of scope (deliberately)
- Custom prices in **Copy list** / **CSV export** (those remain market-based —
  this is share-only, per the request).
- A per-card "reset to market" button (clear + retype suffices).
- Any new persistence beyond the existing `payload` (no overrides table).

## Testing
- **Unit (Vitest):**
  - `buildSharePayload(items, prices)` — price taken from the map; card missing
    from the map ⇒ null; quantity (surplus vs owned), variant, image_url
    unchanged; empty input ⇒ [].
  - `parsePrice` — valid decimal, comma decimal, empty ⇒ null, non-numeric ⇒
    null, negative ⇒ null, rounding to 2 dp.
- **Manual:** open Share on `/sell` → edit a couple of prices (and clear one) →
  Publish → public `/s/{token}` shows the edited prices, "—" for the cleared
  one, and the "Asking prices set by seller" footer → re-open the modal and
  confirm the prices prefill from what was published.
