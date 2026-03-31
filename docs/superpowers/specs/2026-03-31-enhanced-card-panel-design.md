# Enhanced Card Detail Panel Design

## Overview

Upgrade the existing card detail side panel with three new content sections (variants, deck usage, expansions) and change the desktop behavior from an overlay to a push-content panel that allows interacting with the card grid while open.

## Panel Behavior

### Desktop (md+)
- Fixed 400px sidebar on the right, slides in/out with CSS transition (`transform: translateX`)
- No dark backdrop — main content area shrinks by adding right padding when the panel is open
- Card grid remains fully visible and clickable while panel is open
- Clicking a different card swaps panel content without closing/reopening
- Close via X button in panel header or Escape key
- Panel-open state communicated via React context so `AppShell` can apply right padding to the main content area

### Mobile (<md)
- Unchanged: bottom sheet with dark overlay, max-height 80vh, rounded top corners, drag handle
- Backdrop click and Escape key close the panel

## Panel Content Sections (Top to Bottom)

### 1. Card Header (existing, unchanged)
Card image (128×180), name, card number, type/rarity/color tag pills.

### 2. Stats Row (existing, unchanged)
Level, Cost, DP, Evolution Cost — shown conditionally based on card type.

### 3. Variants (new)
- Row of small clickable thumbnails (card aspect ratio, ~36×50px) showing alt art versions
- Currently selected variant has accent-colored border
- Clicking a thumbnail swaps the main card image in the header
- Hidden entirely if the card has no variants in the `card_variants` table
- Uses `alt_art_url` from `card_variants` for alternate images, falls back to the base card image URL for the "Regular" variant

### 4. My Collection (existing, unchanged)
Quantity +/- control via `QuantityControl` component.

### 5. Used in Decks (new)
- Lists each user deck containing this card
- Each row: deck name + quantity in that deck (e.g. "Red Hybrid — x3")
- Rows link to the deck detail page (`/decks/[id]`)
- Empty state: "Not used in any deck" in muted text
- Data: filter `useAllDeckCards()` for matching card_number, cross-reference with `useDecks()` for deck names

### 6. Expansions (new)
- Shows which sets the card appears in as small pills/chips
- Each pill shows the expansion code (e.g. "BT-05", "ST-13")
- Always shown, even for single-expansion cards
- Data: `card_expansions` table filtered by card_number

### 7. Cardmarket Price (existing, unchanged)
Trend price + low price display.

## New Hooks

### `useCardVariants(cardNumber: string | null)`
- Query key: `["card-variants", cardNumber]`
- Fetches from `card_variants` table where `card_number` matches
- Returns `CardVariant[]` (id, card_number, variant_name, variant_index, tcgplayer_id, alt_art_url)
- Disabled when cardNumber is null

### `useCardExpansions(cardNumber: string | null)`
- Query key: `["card-expansions", cardNumber]`
- Fetches from `card_expansions` table where `card_number` matches
- Returns `{ card_number: string; expansion: string }[]`
- Disabled when cardNumber is null

## New Components

### `components/cards/card-variants.tsx`
- Props: `cardNumber: string`, `onVariantSelect: (imageUrl: string) => void`
- Renders row of variant thumbnails
- Manages selected variant state internally
- Calls `onVariantSelect` with the image URL when a variant is clicked

### `components/cards/card-deck-usage.tsx`
- Props: `cardNumber: string`
- Fetches deck data internally via hooks
- Renders list of deck rows or empty state

### `components/cards/card-expansions.tsx`
- Props: `cardNumber: string`
- Fetches expansion data internally via hook
- Renders row of expansion code pills

### `contexts/panel-context.tsx`
- React context providing `{ isPanelOpen: boolean }`
- The card panel sets this when it opens/closes
- `AppShell` reads it to apply `md:pr-[400px]` transition on the main content area

## Modified Files

- `components/cards/card-panel.tsx` — Add new sections, variant image swap state, remove desktop backdrop, add slide transition, integrate panel context
- `components/nav/app-shell.tsx` — Read panel context to add right padding when panel is open on desktop
- `lib/hooks/use-cards.ts` — Add `useCardVariants` and `useCardExpansions` hooks

## Database Changes

None. All required data exists in `card_variants` and `card_expansions` tables.

## Non-Goals

- Alt art cards as separate collection entities (future rework)
- Card effect/ability text display (not in current data model)
- Panel resizing
- Price history charts
