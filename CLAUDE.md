# CLAUDE.md

## Project Overview

CardBoard — a responsive web app for tracking TCG card collections, planning decks, and identifying surplus cards worth selling on Cardmarket. Currently focused on Digimon TCG with plans to support additional TCGs.

## Tech Stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, Lucide React (icons), Inter (font)
- **Backend:** Supabase (Postgres, Auth, Row Level Security)
- **Hosting:** Vercel (free tier)
- **Card Data:** Digimon Card API (https://digimoncard.io/api-public/)
- **Price Data:** Cardmarket API (primary), Cardtrader API (fallback)
- **Data Sync:** Python scripts + GitHub Actions (daily cron)
- **Client Caching:** TanStack Query (React Query)

## Development

```bash
npm run dev     # Start dev server at localhost:3000
npm run build   # Production build
npm run lint    # ESLint check
```

## Data Sync

```bash
pip install -r scripts/requirements.txt
python scripts/sync_cards.py    # Sync cards from Digimon Card API
python scripts/sync_prices.py   # Sync prices from Cardmarket/Cardtrader
```

Requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` env vars.

## Key Architecture Decisions

- Regular card images: `https://images.digimoncard.io/images/cards/{card_number}.jpg`
- Variant card images: `https://world.digimoncard.com/images/cardlist/card/{card_number}_P{N}.png` (N = variant_index - 1)
- CardTrader images override variant URLs when available (most reliable per-variant source)
- Card variants (alt arts, reprints) documented in `docs/card-variants.md`
- Sell logic: `surplus = owned - max(max_copies, sum across all decks)`
- Guest browsing allowed for card database; auth required for collection/decks/sell
- Bottom tab nav on mobile, top nav on desktop (768px breakpoint)
- Supabase RLS enforces per-user data isolation

## Database Schema

See `supabase/migrations/` for the full schema.
Tables: `cards`, `card_variants`, `collection`, `decks`, `deck_cards`, `card_prices`

## UI Design System

For any UI/design work, invoke the `/ui-ux-pro-max` skill to get design system recommendations before implementing.

### Color Palette (CSS variables in `globals.css`)
- **Backgrounds:** Neutral dark slate (`--background: #111318`, `--surface: #161921`, `--elevated: #1e2230`) — never tint backgrounds with the accent hue
- **Accent:** Teal `--accent: #2dd4a8` — reserved for CTAs, links, and main navigation active states only. Do not apply to metadata text, badges, progress bars, or decorative elements
- **Semantic colors:** Red (danger), blue (info/progress), yellow (attention/surplus), purple (tags), green (success/value) — each has `--{color}`, `--{color}-translucent`, `--{color}-border` variants
- **Text hierarchy:** `--text-primary` (headings/values), `--text-secondary` (body), `--text-muted` (labels), `--text-dim` (placeholders)

### Component Patterns
- **Icons:** Lucide React throughout — never use emojis as UI elements (logo uses `LayoutGrid` icon)
- **Hover effects vary by context:** card thumbnails get border + bg shift; deck/sell rows get bg shift only; expansion tiles get subtle scale. No uniform lift+glow on everything
- **Stat widgets:** Featured primary stat large, secondary stats compact. No icon-in-box widgets, no `uppercase tracking-wide` labels
- **Containers:** Not everything needs a bordered card. Stats can float open; only list items and interactive cards need border+surface wrappers
- **Tabs:** Main nav uses pill style with accent fill. Inline content tabs (e.g., expansion filters) use underline style to differentiate
- **Forms:** Use proper `<label>` elements above inputs, not icon prefixes inside inputs. Left-align forms, avoid centering everything
- **Landing/marketing:** Left-aligned hero text, features as inline list (icon + text), not centered 3-column boxed cards
- **Progress bars:** Muted `--blue` at 50% opacity for incomplete, `--green`/`--success` at 100%
- **Quantity badges:** Neutral `--elevated` pill with border, not accent-colored
- **Border radius:** `rounded-lg` for inputs/buttons, `rounded-xl` for cards/containers

<!-- BEGIN PROJECT-INIT -->

## Session Workflow

### Session Start
At the beginning of every session:
1. Read all files in `.claude/memory/`
2. Read `.claude/learnings.md`
3. Read `.claude/handoff.md`
4. Acknowledge context briefly — do not dump everything back at the user

### Session End
When the user signals they are done (goodbye, that's all, wrapping up, etc.):
1. Update any `.claude/memory/` files with new information learned during the session
2. Add any mistakes or corrections received to `.claude/learnings.md` under the appropriate category
3. Update `.claude/handoff.md` with:
   - Summary of what was accomplished
   - Any work still in progress
   - Suggested next steps
   - Open questions or blockers

### Memory System
- Memory files live in `.claude/memory/`
- Read them at session start, update them when you learn something new
- If new information does not fit an existing file, create a new `.md` file in `.claude/memory/` with an appropriate name
- Keep entries concise and actionable

### Self-Improvement
- `.claude/learnings.md` tracks mistakes and corrective rules
- Read it before starting any implementation work
- When you make a mistake or receive a correction, add it immediately
- Format: `- **[what went wrong]**: [what to do instead]`

### Review Gate
Before committing code or claiming work is complete:
1. Re-read `.claude/learnings.md`
2. Verify none of the documented mistakes are being repeated in your current changes
3. Review your own changes for quality and correctness

<!-- END PROJECT-INIT -->
