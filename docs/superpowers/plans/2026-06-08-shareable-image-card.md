# Shareable Image Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a seller download a PNG of their published sell list — a full grid of card thumbnails with quantities and asking prices — generated server-side from the share snapshot.

**Architecture:** A Node-runtime route `app/s/[token]/image/route.tsx` reads the snapshot via the existing `get_sell_share(p_token)` RPC and returns a PNG built with `next/og`'s `ImageResponse`. A pure `computeImageLayout` helper sizes the (dynamic-height) image. "Download image" anchors on the public page and the Share modal point at the route.

**Tech Stack:** Next.js 16 (App Router route handlers, `next/og`/Satori), React 19, TypeScript, Tailwind, Supabase, Lucide React, Vitest.

**Font note:** This relies on `ImageResponse`'s built-in default font (sufficient for Latin text) — no font file is bundled. If the manual test shows missing text, that's the signal to add a font; do not pre-optimize.

---

## File Structure

**New files:**
- `lib/share-image.ts` (+ `.test.ts`) — layout constants + pure `computeImageLayout`.
- `app/s/[token]/image/route.tsx` — the `ImageResponse` generator (Node runtime).

**Modified files:**
- `app/s/[token]/page.tsx` — add a "Download image" button.
- `components/sell/share-modal.tsx` — add a "Download image" link (shared state).

**Reused:** `lib/supabase/server.ts` (`createClient`), `get_sell_share` RPC, `lib/utils.ts` (`getCardImageUrl`), `SellSharePayloadItem` type.

---

## Task 1: `computeImageLayout` pure logic (TDD)

**Files:**
- Create: `lib/share-image.ts`
- Create: `lib/share-image.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from "vitest";
import {
  computeImageLayout,
  IMAGE_WIDTH,
  IMAGE_CAP,
} from "@/lib/share-image";

describe("computeImageLayout", () => {
  it("has a header + footer only for an empty list", () => {
    const l = computeImageLayout(0);
    expect(l).toMatchObject({ shown: 0, remaining: 0, rows: 0, width: IMAGE_WIDTH, height: 160 });
  });

  it("one card is one row", () => {
    const l = computeImageLayout(1);
    expect(l).toMatchObject({ shown: 1, remaining: 0, rows: 1, height: 384 });
  });

  it("six cards fit on one row", () => {
    expect(computeImageLayout(6).rows).toBe(1);
  });

  it("seven cards wrap to two rows and add a row of height", () => {
    const l = computeImageLayout(7);
    expect(l.rows).toBe(2);
    expect(l.height).toBe(624);
  });

  it("caps shown tiles at the cap and reports the remainder", () => {
    const l = computeImageLayout(IMAGE_CAP + 5);
    expect(l.shown).toBe(IMAGE_CAP);
    expect(l.remaining).toBe(5);
    expect(l.rows).toBe(10);
  });

  it("treats negative counts as zero", () => {
    expect(computeImageLayout(-3)).toMatchObject({ shown: 0, remaining: 0, rows: 0 });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `@/lib/share-image`.

- [ ] **Step 3: Implement `lib/share-image.ts`**

```ts
export const IMAGE_WIDTH = 1080;
export const IMAGE_COLUMNS = 6;
export const IMAGE_CAP = 60;
export const TILE_HEIGHT = 224;
export const ROW_GAP = 16;
export const HEADER_HEIGHT = 104;
export const FOOTER_HEIGHT = 56;

export interface ImageLayout {
  shown: number; // tiles actually rendered (min(count, cap))
  remaining: number; // count - shown, for the "+N more" note
  rows: number; // ceil(shown / columns)
  width: number;
  height: number; // header + body + footer
}

/** Sizes the share image (fixed width, height grows with the card count). */
export function computeImageLayout(cardCount: number): ImageLayout {
  const count = Math.max(cardCount, 0);
  const shown = Math.min(count, IMAGE_CAP);
  const remaining = count - shown;
  const rows = Math.ceil(shown / IMAGE_COLUMNS);
  const body = rows > 0 ? rows * TILE_HEIGHT + (rows - 1) * ROW_GAP : 0;
  const height = HEADER_HEIGHT + body + FOOTER_HEIGHT;
  return { shown, remaining, rows, width: IMAGE_WIDTH, height };
}
```

(Check the constants against the tests: height(0) = 104 + 0 + 56 = 160; height(1) = 104 + 224 + 56 = 384; height(7) = 104 + (2·224 + 16) + 56 = 624.)

- [ ] **Step 4: Run to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/share-image.ts lib/share-image.test.ts
git commit -m "feat: add computeImageLayout for the share image"
```

---

## Task 2: Image generation route

**Files:**
- Create: `app/s/[token]/image/route.tsx`

- [ ] **Step 1: Create the route with EXACTLY this content**

```tsx
import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { getCardImageUrl } from "@/lib/utils";
import { computeImageLayout, IMAGE_CAP } from "@/lib/share-image";
import type { SellSharePayloadItem } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_sell_share", { p_token: token });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) {
    return new Response("Not found", { status: 404 });
  }

  const allItems = (row.payload as SellSharePayloadItem[]) ?? [];
  const sorted = [...allItems].sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
  const layout = computeImageLayout(sorted.length);
  const items = sorted.slice(0, IMAGE_CAP);
  const title: string = row.title || "Cards for sale";
  const origin = new URL(req.url).origin;
  const footerLeft =
    `${origin}/s/${token} · asking prices set by seller` +
    (layout.remaining > 0 ? ` · +${layout.remaining} more at the link` : "");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0b0d12",
          color: "#e8ebf2",
          padding: 32,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            borderBottom: "1px solid #262b38",
            paddingBottom: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 36, fontWeight: 700 }}>{title}</div>
          {row.contact_note ? (
            <div style={{ fontSize: 18, color: "#9aa3b4", marginTop: 4 }}>{row.contact_note}</div>
          ) : null}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, flex: 1, alignContent: "flex-start" }}>
          {items.map((item) => {
            const src = item.image_url ?? getCardImageUrl(item.card_number);
            return (
              <div
                key={item.card_number}
                style={{
                  display: "flex",
                  width: 152,
                  height: 213,
                  position: "relative",
                  borderRadius: 8,
                  overflow: "hidden",
                  background: "#1a1f2b",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} width={152} height={213} style={{ objectFit: "cover" }} alt="" />
                <div
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    display: "flex",
                    background: "rgba(11,13,18,0.8)",
                    borderRadius: 999,
                    padding: "2px 8px",
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  {`×${item.quantity}`}
                </div>
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: "flex",
                    justifyContent: "center",
                    background: "rgba(11,13,18,0.85)",
                    padding: "3px 0",
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#5fd0a6",
                  }}
                >
                  {item.price !== null ? `€${item.price.toFixed(2)}` : "—"}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: "1px solid #262b38",
            paddingTop: 10,
            marginTop: 12,
            fontSize: 16,
            color: "#7c8597",
          }}
        >
          <div style={{ display: "flex" }}>{footerLeft}</div>
          <div style={{ display: "flex", color: "#2dd4a8", fontWeight: 700 }}>made with CardBoard</div>
        </div>
      </div>
    ),
    { width: layout.width, height: layout.height },
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: success; `/s/[token]/image` appears in the route list. (The route only needs to compile here; it isn't executed at build time.)

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors (the `<img>` is allowed via the inline `eslint-disable-next-line @next/next/no-img-element`).

- [ ] **Step 4: Commit**

```bash
git add app/s/[token]/image/route.tsx
git commit -m "feat: add share image generation route"
```

---

## Task 3: Download buttons (public page + share modal)

**Files:**
- Modify: `app/s/[token]/page.tsx`
- Modify: `components/sell/share-modal.tsx`

- [ ] **Step 1: Public page — add the Download icon to the import**

In `app/s/[token]/page.tsx`, change:
```tsx
import { Mail } from "lucide-react";
```
to:
```tsx
import { Mail, Download } from "lucide-react";
```

- [ ] **Step 2: Public page — add the Download button between the header and the list**

Replace:
```tsx
      </div>

      <PublicSellList items={items} />
```
with:
```tsx
      </div>

      <a
        href={`/s/${token}/image`}
        download={`cardboard-${token}.png`}
        className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--elevated)]"
      >
        <Download size={15} />
        Download image
      </a>

      <PublicSellList items={items} />
```

- [ ] **Step 3: Share modal — add `Download` to the lucide import**

In `components/sell/share-modal.tsx`, change:
```tsx
import { X, Copy, Check, ExternalLink, Loader2 } from "lucide-react";
```
to:
```tsx
import { X, Copy, Check, ExternalLink, Loader2, Download } from "lucide-react";
```

- [ ] **Step 4: Share modal — add a "Download image" link after the Update/Open row**

In the `{share && (...)}` block, replace:
```tsx
              <a
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--border-light)] py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--elevated)]"
              >
                Open <ExternalLink size={14} />
              </a>
            </div>
```
with:
```tsx
              <a
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--border-light)] py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--elevated)]"
              >
                Open <ExternalLink size={14} />
              </a>
            </div>

            <a
              href={`/s/${share.token}/image`}
              download={`cardboard-${share.token}.png`}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border-light)] py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--elevated)]"
            >
              <Download size={14} />
              Download image
            </a>
```

- [ ] **Step 5: Lint + build + test**

Run: `npm run lint` — expect no errors.
Run: `npm run build` — expect success.
Run: `npm test` — expect all tests pass.

- [ ] **Step 6: Manual smoke test (requires a published share)**

Run `npm run dev`, sign in, publish a share from `/sell`, then:
- On the public `/s/{token}` page, click "Download image" → a PNG downloads.
- Open it: card thumbnails render, each with its `×qty` and `€price` (or "—"), the title + contact at top, the share URL + "made with CardBoard" footer, and the height grows with the number of cards.
- In the Share modal (shared state), the "Download image" link downloads the same image.
- If the image has text missing entirely, the default font isn't available — report it (would need a bundled font); otherwise done.

- [ ] **Step 7: Commit**

```bash
git add app/s/[token]/page.tsx components/sell/share-modal.tsx
git commit -m "feat: add Download image buttons to share page and modal"
```

---

## Self-Review

**Spec coverage:**
- Node-runtime route returning a PNG via next/og, reading the snapshot through `get_sell_share` → Task 2. ✅
- Full-grid layout: 1080 wide, 6 cols, header (title + contact), tiles (thumb + ×qty + €price), footer (URL + "asking prices set by seller" + branding) → Task 2. ✅
- Dynamic height + cap at 60 sorted by price desc, "+N more" note → Tasks 1 (`computeImageLayout`) + 2 (sort/slice/footer). ✅
- Thumbnail fallback `image_url ?? getCardImageUrl` → Task 2. ✅
- 404 on missing/invalid token → Task 2. ✅
- Download anchors (same-origin, `download` attr) on the public page and Share modal → Task 3. ✅
- Unit tests for the layout helper → Task 1. ✅
- Out of scope (summary layout, OG meta tags, per-image fallback, font bundling) → not implemented; default font used per the plan note. ✅

**Placeholder scan:** No TBD/TODO; every code step is complete. ✅

**Type consistency:** `computeImageLayout(cardCount: number): ImageLayout` and `IMAGE_CAP`/`IMAGE_WIDTH` (Task 1) are imported and used in Task 2. The route reads `SellSharePayloadItem` fields (`card_number`, `image_url`, `quantity`, `price`) that match `lib/types.ts`. `getCardImageUrl(cardNumber)` matches `lib/utils.ts`. Download anchors use `token` (page) and `share.token` (modal), both strings. ✅
