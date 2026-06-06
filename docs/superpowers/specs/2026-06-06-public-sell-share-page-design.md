# Public Sell-List Share Page — Design

**Date:** 2026-06-06
**Status:** Approved (pending implementation plan)
**Phase:** 2b of 3 (Sharing the sell list). Sibling 2a (copy-as-text) shipped; 2c (image card) is a later spec.

## Problem

A user can see and export their sell list, but has no way to share it with
buyers who don't use the app. They want a link they can post in a Discord/forum
and have anyone open — no login — to see which cards are for sale and at what
price.

## Goal

A "Share" action on the sell page that publishes a public, read-only snapshot of
the user's sell list at an unguessable URL (`/s/{token}`), viewable by anyone
without logging in, plus owner controls to update or stop the share.

### Success criteria
- One click publishes the current sell list and yields a shareable link.
- The link renders for anonymous visitors (no login), showing the cards, prices,
  an optional title, and an optional contact note.
- The owner's live collection is never exposed — only the published snapshot.
- The owner can re-publish (refresh the snapshot, same link) and stop sharing
  (link 404s), with a confirmation before stopping.
- No share is enumerable: knowing the table exists does not reveal anyone's link.

## Context: current implementation

- Supabase access in the app uses the **anon key bound to the signed-in user via
  RLS** (`lib/supabase/client.ts`, `server.ts`). `collection` and `sell_list`
  are per-user isolated; there is **no service-role client** in the web app.
- `app/sell/page.tsx` computes `sellableCards: SellableCard[]` (all surplus +
  sell-list) and `filteredCards` (the active filter chip). The Share feature
  uses **`sellableCards`** (everything sellable), not the transient filter.
- Quantity/price conventions (shared with `lib/export-csv.ts` and
  `lib/share-text.ts`): quantity = `surplus > 0 ? surplus : owned`; price =
  `price_low ?? price_trend`.
- `proxy.ts` guards only `/collection`, `/decks`, `/sell`; `/s/...` is public.
- `components/cards/view-toggle.tsx` exports `ViewToggle` + `CardView` (reused).
- Migrations run to 007; this adds 008.

## Design

### 1. Data model & access

New table **`sell_shares`** (one row per user):

| column | type | notes |
| --- | --- | --- |
| `user_id` | uuid | PK, FK `auth.users(id)` on delete cascade |
| `token` | text | unique, not null — the unguessable URL slug |
| `title` | text | nullable — page heading |
| `contact_note` | text | nullable — how buyers reach the seller |
| `payload` | jsonb | not null — frozen array of snapshot items |
| `created_at` | timestamptz | default now() |
| `updated_at` | timestamptz | default now() |

**RLS:** owner-only policies for `select`, `insert`, `update`, `delete`
(`auth.uid() = user_id`). **No public select policy** (prevents table-wide
enumeration of tokens/payloads).

**Public read** via a `SECURITY DEFINER` SQL function:
```
get_sell_share(p_token text)
  returns table(title text, contact_note text, payload jsonb, updated_at timestamptz)
```
- `security definer`, `set search_path = public`, body:
  `select title, contact_note, payload, updated_at from public.sell_shares where token = p_token`.
- `grant execute` to `anon` and `authenticated`.
- Returns the matching row or no rows. Because lookup is by exact token only,
  shares cannot be enumerated.

This is the standard Supabase "shareable link" pattern and needs no
service-role key.

### 2. Snapshot payload

`payload` is a JSON array of self-contained items (so the public page needs no
further DB lookups and works for anonymous visitors):

```ts
interface SellSharePayloadItem {
  card_number: string;
  name: string;
  variant_name: string;
  image_url: string | null; // frozen so thumbnails render for anon
  quantity: number;          // surplus > 0 ? surplus : owned
  price: number | null;      // price_low ?? price_trend
}
```

Pure builder, unit-tested:
```ts
buildSharePayload(items: SellableCard[]): SellSharePayloadItem[]
```
Built from `sellableCards` (all sellable). Mirrors the copy/CSV quantity & price
choices. Empty input → `[]`.

### 3. Publish / manage flow (owner)

- **Token** — generated client-side by `generateShareToken()` in
  `lib/share-token.ts`: a URL-safe random string (16 chars from
  `crypto.getRandomValues`). Reused across re-publishes so the link is stable.
- **`lib/hooks/use-sell-share.ts`:**
  - `useSellShare()` — fetches the signed-in user's own `sell_shares` row (RLS),
    or null.
  - `usePublishSellShare()` — mutation taking `{ title, contactNote, items }`:
    reuse the existing token (from `useSellShare`) or generate a new one, then
    upsert `{ user_id, token, title, contact_note, payload: buildSharePayload(items), updated_at }`. Invalidates `["sell-share"]`.
  - `useDeleteSellShare()` — deletes the user's row. Invalidates `["sell-share"]`.
- **`components/sell/share-modal.tsx`** — two states:
  - *Not shared:* optional Title + Contact note inputs; "Publish & get link".
  - *Shared:* the public URL with a Copy button; a "live" indicator; actions
    **Update snapshot** (re-publish current cards + edited title/contact),
    **Open ↗**, and **Stop sharing**. "Stop sharing" requires an inline
    confirmation step before it deletes.
- **`app/sell/page.tsx`** — add a "Share" button beside Copy list / Export CSV
  that opens the modal with `items={sellableCards}`.

### 4. Public page

- **`app/s/[token]/page.tsx`** — server component; calls
  `supabase.rpc("get_sell_share", { p_token: token })` via the anon server
  client. If no row → `notFound()` (renders a clean "share link isn't available"
  state).
- Renders: title (or a generic default), contact note (if present), a card
  count, then the cards as a **list by default with a list/grid toggle**
  (reusing `ViewToggle`), and a footer "Prices via Cardmarket · Shared from
  CardBoard" linking to the app.
- **`components/share/public-sell-list.tsx`** — client component rendering the
  payload items in list or grid view (owns the `CardView` toggle state). Used by
  the public page.

### 5. Error handling
- Invalid / deleted token → `notFound()` on the public page.
- Publish/delete mutation errors surface a brief inline error in the modal
  (button returns to its idle state); no partial writes (single upsert/delete).

## Out of scope (deliberately)
- **Live data** (snapshot only — decided), **multiple links per user** (one),
  **last-updated date on the public page** (publisher chose not to show it),
  **image card (2c)** and any analytics/view counts.

## Testing
- **Unit (Vitest):** `buildSharePayload` (quantity source, price low/trend
  fallback, variant + image_url passthrough, empty → []); `generateShareToken`
  (length, URL-safe charset, uniqueness across calls).
- **Manual:** publish from the sell page → open the link in a private window
  (no login) → verify cards/prices/title/contact and the list/grid toggle →
  "Update snapshot" reflects changes on the same link → "Stop sharing" (confirm)
  → link 404s.
- **Deploy note:** migration `008_sell_shares.sql` must be applied to Supabase
  before the feature works.

## Future phases (context, not this spec)
- **2c — Image card:** a generated PNG of the sell list for image-only
  marketplaces/social.
