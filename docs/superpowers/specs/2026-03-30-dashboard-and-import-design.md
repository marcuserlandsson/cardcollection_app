# Dashboard & Collection Import Design

## Overview

Two features for CardBoard:
1. **Dashboard home page** — replaces the current `/database` redirect with a personal stats overview (authenticated) or welcome landing (guest)
2. **Collection import** — bulk import cards via text paste or CSV upload

## Feature 1: Dashboard

### Route

`/` — conditionally renders based on auth state.

### Authenticated Dashboard

**Stats Row** — 4 compact widgets in a horizontal flex row (matching existing `collection-summary` pattern):
- **Total Cards** — count of all owned cards (Lucide: `Layers`)
- **Unique Cards** — distinct card numbers owned (Lucide: `Fingerprint`)
- **Collection Value** — sum of (owned quantity x price_trend) (Lucide: `TrendingUp`)
- **Surplus Value** — sum of (surplus quantity x price_trend), yellow accent (Lucide: `CircleDollarSign`)

**Two-column section** (stacks vertically on mobile):

**Left — Deck Progress:**
- Lists each user deck with name, completion percentage, and a progress bar
- Color-coded: accent green for high completion, blue for mid, yellow/red for low
- Each row links to the deck detail page on click

**Right — Worth Selling:**
- Top 5 surplus cards ranked by total value (price_trend x surplus quantity)
- Each row: card name, surplus count, total value (yellow accent)
- "View all" link at bottom navigating to `/sell`
- Designed so this component can later swap to price-change detection once price history is available

**Empty states:**
- No collection: prompt to browse database or import cards
- No decks: prompt to create a deck
- No surplus: "Nothing to sell" message

**Data sources:** Reuses existing hooks — `useCollection`, `useDecks`, `useDeckCards`, `useAllDeckCards`, `usePrices`. Surplus calculation reuses `buildSellableCards()` from existing sell utils. No new API calls or database changes required.

### Guest Landing Page

**Hero section:**
- Headline: "Track your Digimon TCG collection"
- Subtitle: build decks, track prices, find surplus to sell
- Primary CTA: "Get Started" button linking to `/login` (accent colored)
- Secondary link: "Browse Card Database" linking to `/database`

**Feature highlights** — 3 cards in a row (stack on mobile), each with Lucide icon + title + one-line description:
- Collection tracking
- Deck building & completion tracking
- Sell advisor with Cardmarket pricing

Minimal design — no footer, no complex marketing. On-brand dark theme.

**Auth detection:** Page component checks Supabase auth state. Logged in renders dashboard, guest renders landing. Same pattern as existing protected pages.

## Feature 2: Collection Import

### Access Points

- Button on `/collection` page
- Link from dashboard empty state (when user has no collection)

### UI

Modal/drawer matching the existing card-panel sheet pattern. Two tabs:

**Text Paste tab:**
- Textarea for pasting card lists
- Flexible parser supports:
  - `BT1-001 3` or `BT1-001 x3` or `BT1-001,3`
  - One card per line
  - Ignores blank lines and comment lines
  - Unrecognized lines shown as errors

**CSV Upload tab:**
- File input accepting `.csv` and `.txt`
- Requires at minimum a card number column, optional quantity column (defaults to 1)
- Auto-detects common column names: `card_number`, `number`, `id`, `quantity`, `qty`, `count`

### Import Flow

1. User pastes text or uploads file
2. **Preview step** — displays parsed results:
   - List of recognized cards with quantities
   - Unrecognized lines flagged in red with reason
   - Summary: "42 cards recognized, 3 errors"
3. User reviews and clicks "Import"
4. **Merge behavior** — quantities are **added** to existing collection (not replaced). If user owns 2x BT1-001 and imports 3x, result is 5x.
5. Success message: "Added 42 cards to your collection"

### Parser

Utility function in `lib/`:

```typescript
type ParseResult = {
  parsed: Array<{ cardNumber: string; quantity: number }>;
  errors: Array<{ line: string; reason: string }>;
};

function parseCardList(input: string): ParseResult;
```

- Used by both text paste and CSV modes (CSV converted to text lines after column detection)
- Card numbers validated against the `cards` table before import
- Unknown card numbers appear in the error list during preview

### Database Changes

None. Uses existing `collection` table and `useUpdateQuantity` mutation. Import calls the same upsert logic as the existing +/- quantity controls, batched for performance.

## Non-Goals

- Price history / price change detection (future work, will replace the "Worth Selling" component)
- Card variant import (alt arts) — import by card number only
- Export functionality — not in scope for this iteration
- Social features or collection sharing
