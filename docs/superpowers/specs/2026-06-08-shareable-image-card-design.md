# Shareable Image Card — Design

**Date:** 2026-06-08
**Status:** Approved (pending implementation plan)
**Phase:** 2c of 3 (Sharing the sell list). Builds on the Phase 2b public share
page and its `sell_shares` snapshot + seller asking prices.

## Problem

Some marketplaces and social channels are image-first — a link preview isn't
enough, the seller wants an actual picture of the cards they're selling. There's
no way to produce one today.

## Goal

A downloadable PNG of the seller's published sell list — a full grid of card
thumbnails with prices — generated server-side from the share snapshot.

### Success criteria
- From a published share, the seller can download a PNG showing all listed cards
  (thumbnail + quantity + asking price), the title, contact note, and the share
  URL.
- The image reflects the published snapshot (the seller's asking prices), so it
  matches the public page.
- The image height scales with the number of cards (with a sane cap).

## Context

- Public share page `app/s/[token]/page.tsx` reads the snapshot via the anon
  `get_sell_share(p_token)` RPC (migration 008). Payload items are
  `SellSharePayloadItem { card_number, name, variant_name, image_url, quantity, price }`.
- `next/og` (`ImageResponse`, Satori-based) is available in Next 16.2.1; no OG
  setup exists yet.
- `getCardImageUrl(cardNumber)` (`lib/utils.ts`) gives the default CDN image URL
  fallback.
- The Share modal (`components/sell/share-modal.tsx`) shows the public link +
  actions in its "shared" state.

## Design

### 1. Image route
`app/s/[token]/image/route.tsx` — a **Node-runtime** route handler
(`export const runtime = "nodejs"`) that:
1. Reads the snapshot via `supabase.rpc("get_sell_share", { p_token })` using the
   anon server client. No row ⇒ return a 404 `Response`.
2. Builds the full-grid layout as JSX and returns
   `new ImageResponse(<Layout/>, { width, height, fonts })`.

Node runtime is required for the Supabase call and for reading the bundled font
file from disk.

### 2. Layout (full grid)
- **Width:** 1080px. **6 columns.**
- **Height:** computed — `HEADER_H + rows * (TILE_H + GAP) + FOOTER_H` where
  `rows = ceil(min(n, CAP) / 6)`.
- **Header:** the title (or "Cards for sale" default) and the contact note (if
  present).
- **Tiles:** each card as a thumbnail (`item.image_url ?? getCardImageUrl(card_number)`)
  with a quantity badge (`×N`, top-right) and a price badge (bottom: `€{price}` or
  "—").
- **Footer:** `<{origin}>/s/{token} · asking prices set by seller · made with CardBoard`.
- **Cap:** `CAP = 60`. Cards are sorted by price descending; if `n > CAP`, render
  the first `CAP` tiles and append "+{n − CAP} more — see the full list at the
  link" to the footer.

### 3. Dimension / cap logic (pure, tested)
`lib/share-image.ts`:
```ts
export const IMAGE_COLUMNS = 6;
export const IMAGE_CAP = 60;

export interface ImageLayout {
  shown: number;      // tiles rendered (min(n, CAP))
  remaining: number;  // n - shown (for "+N more")
  rows: number;       // ceil(shown / IMAGE_COLUMNS)
  width: number;      // 1080
  height: number;     // computed from rows + header + footer
}

export function computeImageLayout(cardCount: number): ImageLayout
```
Uses fixed layout constants (header/footer/tile heights, gap) defined in the
module. Empty list ⇒ `shown: 0, rows: 0`, a minimum height (header + footer).

### 4. Font
Satori needs an explicit font. Bundle an **Inter** weight (e.g.
`Inter-SemiBold.ttf`) under the route folder (e.g.
`app/s/[token]/image/Inter-SemiBold.ttf`) and load it with
`fs.readFileSync`/`readFile` into the `ImageResponse` `fonts` option. (Reuses the
app's existing Inter typeface.)

### 5. Card images in Satori
Satori fetches each `<img src>` at render. v1 trusts the snapshot URLs (they come
from synced card data). Each tile uses `image_url ?? getCardImageUrl(card_number)`.
A per-image fallback (pre-fetch + placeholder for unreachable URLs) is **out of
scope** for v1 — noted as a follow-on if broken images surface.

### 6. Download UX
Download is a plain same-origin anchor with the `download` attribute pointing at
the image route, so no client JS is needed:
```tsx
<a href={`/s/${token}/image`} download={`cardboard-${token}.png`}>Download image</a>
```
- **Public page** (`app/s/[token]/page.tsx`): a "Download image" button in/near
  the footer. The page already has `token`.
- **Share modal** (shared state): a "Download image" link alongside Copy / Update
  / Open, using `share.token`.

### Error handling
- Image route: missing/invalid token ⇒ 404 `Response` (no image).
- A card with no price renders "—"; no price never blocks generation.

## Out of scope (deliberately)
- The fixed **summary/OG-preview** layout (full grid chosen).
- **`<meta>` OpenGraph** tags for auto link previews (this is a manual download).
- **Per-image fallback hardening** (v1 trusts snapshot URLs).
- Caching/CDN tuning of the image route (defaults are fine; the route is cheap
  and re-published shares simply regenerate).

## Testing
- **Unit (Vitest):** `computeImageLayout` — rows and height for counts of 0, 1,
  6, 7, 60, 61 (cap + `remaining`), and column math.
- **Manual:** publish a share → "Download image" from both the public page and
  the Share modal → open the PNG: thumbnails load, prices/quantities correct,
  title + contact + share URL present, height grows with card count, and a
  >60-card list shows the "+N more" footer.
