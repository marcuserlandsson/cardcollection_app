# Fast Collection Entry — Design

**Date:** 2026-06-06
**Status:** Approved (pending implementation plan)
**Phase:** 1 of 3 (Entry → Sharing → Need list)

## Problem

A user with a large pile of unsorted physical cards has no fast way to get them
into the app. Today the only path to add a card is: browse the database → open
the card panel → bump its quantity. The collection page's search filters only
cards already owned, so there is no dedicated surface for adding *new* cards in
bulk. This makes documenting a real-world collection tedious.

## Goal

A dedicated entry surface that makes blitzing through a physical pile fast,
with three complementary input modes sharing one live session tray and a
list/grid view toggle.

### Success criteria
- A user can add dozens of cards in one sitting with minimal clicks/keystrokes.
- Alt arts and other variants are addable as distinct cards (matches existing
  per-variant model used by selling).
- Every add is persisted immediately; closing the tab loses nothing.
- Works on desktop (keyboard-first) and mobile (touch-friendly).

## Context: current implementation

- **Variants are already separate cards.** Migration `005_promote_variants.sql`
  promoted each art version into its own `cards` row with a synthetic
  `card_number` suffix (`…-V2`, etc.) and a shared `base_card_number`. The
  `Card` type carries `base_card_number` and `variant_name`.
- **Collection is keyed by `(user_id, card_number)`** with a single `quantity`
  column (`001_initial_schema.sql`). Because variants are distinct card_numbers,
  the collection already tracks them separately. **No schema change is needed.**
- **Condition is not tracked anywhere** and is intentionally left out of entry
  (see Out of Scope).
- **Bulk paste already exists**: `components/collection/import-modal.tsx` +
  `lib/import-parser.ts`, triggered by an "Import" button on the collection page.

### Reusable building blocks
- `components/collection/quantity-control.tsx` — the `−/+` stepper
- `components/cards/card-search-bar.tsx` — search input
- `components/cards/card-grid.tsx`, `card-thumbnail.tsx` — grid w/ quantity badges
- `components/cards/expansion-grid.tsx` — expansion selection/data
- `lib/import-parser.ts` — bulk paste parsing
- `lib/hooks/use-cards.ts` (`useCards`), `lib/hooks/use-collection.ts`
  (`useCollectionMap`, `useUpdateQuantity`)

## Design

### Where it lives
- New route: **`app/collection/add/page.tsx`**.
- Entry point: an **"Add cards"** button on `app/collection/page.tsx`, beside the
  existing Import button.
- A **mode switcher** at the top of the add page with three tabs:
  **Search · Set checklist · Paste**. Tabs use the inline underline style (per
  the design system's distinction from the accent-pill main nav).

### Mode 1 — Search & add (the workhorse)
Chosen layout (validated visually): keyboard-first results list with a live
session tray on the right.
- Search input (reuse `card-search-bar`) matches on card name and card_number.
- Results render as a **compact list by default**, with a **list/grid toggle**.
  - List row: card_number · thumbnail · name · `variant_name` (when not
    "Regular") · current owned count · `quantity-control` stepper.
  - Grid view: `card-grid`/`card-thumbnail` with quantity badge; click a
    thumbnail to `+1`.
- **Variants appear as separate rows/cards**, each labeled with `variant_name`
  ("Alternate Art", "Rare Pull", …) and showing its own art (`image_url`).

### Mode 2 — Set checklist
- Pick an expansion (reuse expansion selection data/`expansion-grid`).
- Show every card in that expansion (including variant rows) with a
  `quantity-control` stepper.
- A **completion bar** at top: `owned / total` (e.g. "42 / 115 owned · 18
  surplus"), styled as a muted `--blue` progress bar per the design system.
- **Filter tabs:** All · Missing only · Owned · Surplus (inline underline tabs).
- **List default, grid toggle** (same toggle component as Mode 1). Grid view
  dims/dashes missing cards so gaps stand out.

### Mode 3 — Paste
- The existing bulk import surfaced as a tab rather than a separate modal.
- Reuse `import-parser.ts` parsing and the `import-modal` write logic.
- The standalone Import button/modal on the collection page is superseded by
  this tab (the modal component's logic is reused; the separate trigger is
  removed to avoid two entry points).

### Shared — Live session tray
- A right rail on desktop; a collapsible bottom sheet on mobile.
- Shows a running list of cards added **this session**, a **total count**, and
  per-item **undo** (decrement / remove).
- **Pure UX layer.** Every `+`/`−` writes immediately through
  `useUpdateQuantity` (immediate upsert/delete). The tray is local session state
  derived from those actions — there is no deferred batch write to lose.
- Undo on a tray item issues the inverse `useUpdateQuantity` call.

### Shared — List/grid view toggle
- A small control (list/grid icons) used by both Search and Set checklist modes.
- Default: compact list. Preference persisted in local state (and optionally
  localStorage) so it sticks within a session.

## Data flow
1. User adds via any mode → `useUpdateQuantity({ cardNumber, quantity })`.
2. Mutation upserts (`quantity > 0`) or deletes (`quantity <= 0`) the
   `collection` row, then invalidates the `["collection"]` query.
3. The session tray appends/updates a local entry for that card_number.
4. Completion bar and owned counts read from `useCollectionMap()`.

## Components

### New
- `app/collection/add/page.tsx` — the add surface; hosts mode tabs + tray.
- `components/collection/add-mode-tabs.tsx` — Search/Set checklist/Paste switcher.
- `components/collection/entry-session-tray.tsx` — running session list + undo.
- `components/collection/set-checklist.tsx` — expansion checklist with completion
  bar + filter tabs.
- `components/cards/view-toggle.tsx` — shared list/grid toggle control.

### Modified
- `app/collection/page.tsx` — add the "Add cards" button; remove the standalone
  Import button/modal trigger (folded into the Paste tab).

### Reused (unchanged)
- `quantity-control`, `card-search-bar`, `card-grid`, `card-thumbnail`,
  `expansion-grid`, `import-parser`, `useCards`, `useCollectionMap`,
  `useUpdateQuantity`.

## Out of scope (deliberately)
- **Condition tagging** (NM/LP/…): deferred to Phase 2 (sharing/sell flow), where
  condition affects price. Collection stays pure quantity.
- **Camera / OCR scan**: not pursued.
- **Manual wishlist & auto-from-decks need list**: Phase 3.
- **Applying the list/grid toggle to other pages** (database, etc.): out of scope
  for this phase; the toggle component is built to be reusable later.

## Testing
- **Unit:** the set-checklist filter logic (All/Missing/Owned/Surplus) and the
  session-tally reducer (add/undo/dedupe by card_number).
- **Manual smoke test:** each mode writes correctly to `collection`; variants add
  to their own card_number; undo reverses correctly; mobile bottom-sheet tray.

## Future phases (for context, not this spec)
- **Phase 2 — Sharing the sell list:** copy-paste text → public share page →
  image card → Cardmarket export (the export deserves its own mini-spec).
- **Phase 3 — Need list:** auto-from-decks gaps + a manual wishlist.
