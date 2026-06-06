# Copy Sell List as Text — Design

**Date:** 2026-06-06
**Status:** Approved (pending implementation plan)
**Phase:** 2a of 3 (Sharing the sell list). Sibling sub-features — public share page (2b) and image card (2c) — get their own specs. Cardmarket/CSV export already shipped.

## Problem

The sell page identifies which cards a user has surplus of and should sell, but
the only way to share that list is the CSV export (good for spreadsheets /
Cardmarket bulk upload, not for a forum or Discord post). Users want a quick way
to paste a human-readable "cards for sale" list into a chat or marketplace
thread.

## Goal

A "Copy list" button on the sell page that copies the currently-filtered
sellable cards to the clipboard as a marketplace-ready text block.

### Success criteria
- One click copies a formatted list to the clipboard.
- The copied text respects the active filter chip (All / Surplus / Sell-list /
  Spiked) — identical scope to the existing "Export CSV" button.
- Text and CSV always agree on quantity and price (shared data choices).
- Clear, brief visual confirmation ("Copied!") and a graceful failure state.

## Context: current implementation

- `app/sell/page.tsx` computes `filteredCards: SellableCard[]` (surplus +
  sell-list, filtered by the active chip) and already renders an "Export CSV"
  button that calls `generateSellCsv(filteredCards)` + `downloadCsv(...)`.
- `lib/export-csv.ts` defines the data conventions we mirror:
  - **Quantity** = `item.surplus > 0 ? item.surplus : item.owned`
  - **Price** = `item.price?.price_low ?? item.price?.price_trend ?? null`
  - **Total value** = `item.total_value`
- `SellableCard` (in `lib/types.ts`) carries `card` (with `name`,
  `card_number`, `variant_name`), `owned`, `surplus`, `price`, and
  `total_value`.

## Design

### Output format (marketplace line)
One line per card, nothing else — no total line, no footer:
```
{qty}x {name}[ · {variant}] ({card_number}) — €{price} ea
{qty}x {name}[ · {variant}] ({card_number}) — €{price} ea
...
```

Rules:
- **Quantity** — `surplus > 0 ? surplus : owned` (matches CSV).
- **Price** — `price_low ?? price_trend`. Formatted as `€{n.toFixed(2)} ea`. If
  a card has no price, omit the ` — €… ea` segment for that line (line ends
  after the card number).
- **Variant** — append ` · {variant_name}` after the name only when
  `variant_name !== "Regular"`.
- **No total line and no attribution footer** — the per-card prices are
  enough. The sell page already shows the aggregate via `SellSummary`
  ("Total value").
- **Empty list** — `formatSellListText([])` returns an empty string; the button
  is disabled in this case anyway.

### Components

**`lib/share-text.ts`** — pure function:
```ts
formatSellListText(items: SellableCard[]): string
```
No DOM, no clipboard — just string building. Mirrors `generateSellCsv`'s
quantity/price choices so the two exports never diverge. Unit-tested.

**`components/sell/copy-list-button.tsx`** — a small client component:
- Props: `{ items: SellableCard[] }`.
- Renders a button styled like the existing "Export CSV" button (bordered,
  `--text-secondary`), with a Lucide `Copy` icon and label "Copy list".
- On click: `await navigator.clipboard.writeText(formatSellListText(items))`.
  - Success → swap icon/label to `Check` + "Copied!" for ~2s, then revert.
  - Failure (clipboard API rejects, e.g. insecure context) → wrap in
    `try/catch`; briefly show "Copy failed" then revert.
- Disabled when `items.length === 0`.
- Uses a `useState` for the transient state and a `setTimeout` to revert
  (cleared on unmount).

**`app/sell/page.tsx`** — render `<CopyListButton items={filteredCards} />`
next to the existing "Export CSV" button (same row/container), passing the same
`filteredCards` so both buttons share scope. No other logic changes.

## Out of scope (deliberately)
- **Public share page (2b)** and **image card (2c)** — separate specs.
- **Configurable formats / toggles** (e.g. with/without prices) — YAGNI; one
  good default.
- **Clipboard fallback via hidden textarea** — the app is served over HTTPS
  where the async Clipboard API works; a `try/catch` failure state is enough.
- No backend, no database schema change.

## Testing
- **Unit (Vitest):** `formatSellListText` — quantity source (surplus vs owned),
  variant suffix shown only for non-Regular, line with missing price omits the
  price segment, no total or footer lines are emitted, empty list → "".
- **Manual:** click "Copy list" on the sell page under each filter, paste
  elsewhere, confirm contents match the on-screen rows; confirm the "Copied!"
  state and the disabled state when the list is empty.

## Future phases (context, not this spec)
- **2b — Public share page:** a read-only link of the sell list (public route,
  share token, snapshot-vs-live decision).
- **2c — Image card:** a generated PNG (thumbnails + prices) for social posts.
