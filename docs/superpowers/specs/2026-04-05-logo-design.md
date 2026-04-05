# CardBoard Logo Design Spec

## Summary

Replace the generic LayoutGrid Lucide icon and placeholder emoji favicon with a custom brand logo: two crossed trading cards with "CB" on the front card.

## Logo Concept

Two overlapping trading cards at slight angles — evoking cards in play or being traded. The front card features bold "CB" lettering (C in white, B in teal) centered within a subtle inner frame border. The back card sits behind at reduced opacity.

### Visual Details

- **Back card**: Rotated +12deg around center, `#1e2230` fill, `#2dd4a8` stroke at 2.5px, 0.45 opacity
- **Front card**: Rotated -6deg around center, `#1e2230` fill, `#2dd4a8` stroke at 2.5px, full opacity
- **Inner frame**: Inset rounded rect on front card, `#2dd4a8` stroke at 1.2px, 0.25 opacity
- **"C"**: White (`#ffffff`), 28pt system-ui, font-weight 900, text-anchor middle
- **"B"**: Teal (`#2dd4a8`), same font settings
- **Card corners**: `rx="7"` (outer card), `rx="4"` (inner frame)
- **Background**: Transparent outside the cards; dark fill inside the card shapes

### Reference

Based on iteration V1 from the brainstorming session — the "Bold + Frame, Centered 28pt" variant.

## Usage Contexts

### 1. Favicon (`/public/favicon.svg`)

- Replaces current emoji-based SVG (`📦`)
- SVG format for crisp rendering at all sizes
- Transparent background, card shapes retain their dark fill
- Must remain legible at 16x16 and 32x32

### 2. Nav Bar Icon (`components/nav/top-nav-bar.tsx`)

- Replaces `<LayoutGrid>` Lucide icon in the top nav
- Rendered as an inline SVG component or `<img>` referencing the SVG
- Sized to match current icon (~20px height)
- Sits next to existing "Card**Board**" text (unchanged)

### 3. Layout Metadata (`app/layout.tsx`)

- Update the `icons` config to reference the new favicon
- No changes to title or description

## Files to Create/Modify

| File | Action |
|------|--------|
| `public/favicon.svg` | Replace with new logo SVG |
| `components/nav/top-nav-bar.tsx` | Replace LayoutGrid import/usage with logo SVG |
| `app/layout.tsx` | Verify favicon reference still works (path unchanged) |

## Out of Scope

- PWA manifest icons (can be added later)
- Apple touch icon (can be added later)
- Full wordmark/logotype (the nav bar text treatment stays as-is)
- Marketing/social preview images
