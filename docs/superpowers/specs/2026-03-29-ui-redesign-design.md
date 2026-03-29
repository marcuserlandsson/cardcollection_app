# CardBoard UI Redesign Spec

## Overview

Redesign the DigiCollect app (renamed to **CardBoard**) with a premium, modern aesthetic. The current UI has a monotone dark green palette, emoji nav icons, system fonts, and basic component styling. This redesign introduces a neutral dark slate palette with purposeful accent colors, Inter typography, Lucide icons throughout, and polished component design.

## Name Change

- **Old:** DigiCollect
- **New:** CardBoard
- Logo treatment: "Card" in primary text color, "Board" in accent (#2dd4a8)
- Rationale: TCG-agnostic name that supports future expansion to other card games. Playful double meaning (cardboard material + card dashboard).

## Design System

### Color Palette

| Role            | Hex        | Usage                                    |
|-----------------|------------|------------------------------------------|
| Background      | `#111318`  | Page base                                |
| Surface         | `#161921`  | Cards, panels, frames                    |
| Elevated        | `#1e2230`  | Inputs, chips, stat blocks               |
| Border          | `#252a36`  | Primary borders, dividers                |
| Border Light    | `#2d3344`  | Input borders, subtle separators         |
| Text Primary    | `#ebedf0`  | Headings, names, important text          |
| Text Secondary  | `#9ca3af`  | Body text, descriptions                  |
| Text Muted      | `#6b7280`  | Labels, placeholders, inactive           |
| Text Dim        | `#4b5563`  | Hints, disabled text                     |
| Accent          | `#2dd4a8`  | Active states, CTA buttons, primary      |
| Red             | `#f87171`  | Red cards, danger, missing, delete       |
| Blue            | `#60a5fa`  | Blue cards                               |
| Yellow          | `#facc15`  | Yellow cards, rarity, warnings           |
| Purple          | `#a78bfa`  | Purple cards, type tags                  |
| Green           | `#4ade80`  | Success, owned, sell prices              |

**Key principle:** Backgrounds stay neutral (no color tinting). Color is only used for interactive elements, status indicators, and category semantics.

### Typography

- **Font:** Inter (Google Fonts)
- **Weights:** 400 (body), 500 (labels), 600 (headings, buttons), 700 (stats, emphasis)
- **Scale:** System default rem scale with text-xs through text-2xl

### Icons

- **Library:** Lucide React (`lucide-react` package)
- **Style:** Consistent line icons, default stroke width
- **Usage locations:**
  - Navigation tabs (desktop + mobile)
  - Search bars (search icon, filter icon)
  - Buttons (plus, trash, check, download, etc.)
  - Stat widgets (colored icon badges)
  - Filter chips (contextual icons per category)
  - Quantity controls (plus/minus)
  - Sell advisor rows (coins, package-minus)
  - Empty states (large muted icon)
  - Login form (mail, lock)

### Component Tokens

- **Border radius:** 8-12px on cards/panels, 20px on chips, 6-8px on buttons
- **Transitions:** 150-200ms ease on all interactive elements
- **Shadows:** Subtle accent-tinted box-shadow on hover (`rgba(45,212,168,0.1)`)

## Navigation Redesign

### Desktop Top Nav
- Semi-transparent background with `backdrop-filter: blur(12px)`
- Border-bottom with subtle accent tint: `rgba(45,212,168,0.15)`
- Logo left: "Card**Board**" with accent-colored "Board"
- Center: Pill-style tab switcher in a container (`#252a36` background, rounded)
  - Active tab: accent fill (`#2dd4a8`) with dark text
  - Inactive: muted text
  - Each tab has a Lucide icon + label
- Right: Auth button (Sign In / Sign Out)

### Mobile Bottom Bar
- Same glass blur effect
- 4 tabs with Lucide icons stacked above small labels
- Active: accent color icon + text
- Inactive: dim gray (`#4b5563`)

### Tab Icons
| Tab        | Icon           |
|------------|----------------|
| Database   | `search`       |
| Collection | `layers`       |
| Decks      | `square-stack`  |
| Sell       | `trending-up`  |

## Page-by-Page Changes

### Database Page
- Search bar: elevated background, `search` icon prefix, `sliders-horizontal` filter button (accent fill)
- Color filter chips: each uses its actual card color (red chip = translucent red bg + red text, etc.)
- Card type chips with contextual icons: `swords` (Digimon), `user` (Tamer), `zap` (Option), `egg` (Digi-Egg)
- Card grid: subtle border on thumbnails, hover adds accent border glow + `translateY(-3px)` lift
- Owned quantity badges: teal accent pill in top-right corner of card thumbnails

### Collection Page
- Stats bar: 3 stat blocks with colored icon badges
  - `layers` / teal → Total Cards
  - `sparkles` / blue → Unique
  - `coins` / yellow → Est. Value
- Same card grid with hover effects as database
- Card detail panel redesign (see Shared Components)

### Decks Page
- "New Deck" button: primary accent with `plus-circle` icon
- Deck list cards: surface background, card count, description, completion progress bar
- Progress bar: accent fill, green (`#4ade80`) when 100% complete
- Deck detail page:
  - Card rows with thumbnail, name/info, `plus`/`minus` quantity controls
  - Status indicator: red text if cards are missing, green if owned
  - "Add Cards" button with `plus` icon, "Delete" with `trash-2` icon
- Empty state: large muted `square-stack` icon + "No decks yet" + CTA button

### Sell Page
- Summary stats with colored icon badges:
  - `package-minus` / purple → Surplus Count
  - `coins` / yellow → Total Value
- Timestamp with `clock` icon
- Sell rows: card info + `coins` icon with green price + `package-minus` with yellow surplus count

### Login Page
- Centered card on surface background
- "Card**Board**" logo at top
- Input fields with icon prefixes: `mail` for email, `lock` for password
- Primary accent submit button
- Toggle link between sign in / sign up

## Shared Component Specifications

### Buttons
| Variant   | Background                    | Text/Icon  | Border                        |
|-----------|-------------------------------|------------|-------------------------------|
| Primary   | `#2dd4a8`                     | `#111318`  | none                          |
| Secondary | `#252a36`                     | `#9ca3af`  | `1px solid #2d3344`           |
| Danger    | `rgba(239,68,68,0.12)`        | `#f87171`  | `1px solid rgba(239,68,68,0.2)` |
| Success   | `rgba(34,197,94,0.12)`        | `#4ade80`  | `1px solid rgba(34,197,94,0.2)` |

All buttons: icon + label, 8px radius, 150ms transition, `font-weight: 600`.

### Inputs
- Background: `#1e2230`
- Border: `1px solid #2d3344`
- Focus: accent border
- Radius: 10px
- Optional icon prefix (search, mail, lock)

### Cards/Panels
- Background: `#161921`
- Border: `1px solid #252a36`
- Radius: 12px
- Hover: accent border + `box-shadow: 0 4px 16px rgba(45,212,168,0.1)` + `translateY(-3px)`

### Filter Chips
- Inactive: `#1e2230` bg, `#2d3344` border, `#9ca3af` text
- Active (default): translucent accent bg `rgba(45,212,168,0.12)`, accent border `rgba(45,212,168,0.3)`, accent text + `check` icon
- Active (colored): translucent version of category color (e.g., red = `rgba(239,68,68,0.1)` bg, `rgba(239,68,68,0.25)` border, `#f87171` text)
- Radius: 20px (pill shape)

### Detail Panel
- Layout: bottom sheet on mobile (rounded-t-2xl), right sidebar on desktop (400px, rounded-l-2xl)
- Backdrop: `bg-black/50`
- Content: card image, row of colored type/rarity/color tags, stat blocks (owned/price/DP), primary + secondary action buttons with icons

### Stat Blocks
- Elevated background, 10px radius
- Left: colored icon in a badge container (`#252a36` bg, 8px radius)
- Right: large value text (primary color, bold) + small label (muted, uppercase)

### Empty States
- Large muted Lucide icon (40px, dim color)
- Title (text-secondary)
- Description (text-muted)
- CTA button (primary, with icon)

## Dependencies to Add

- `lucide-react` — Icon library
- `@fontsource/inter` or Google Fonts link — Typography

## Out of Scope

- No structural layout changes (no sidebar nav, no page restructuring)
- No animated card effects (tilt, shine)
- No new features — purely visual/design improvements
- No changes to data fetching, auth flow, or business logic
