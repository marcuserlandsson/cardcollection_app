# Project Context

## Overview

CardBoard — a responsive web app for tracking TCG (Trading Card Game) collections, planning decks, and identifying surplus cards worth selling on Cardmarket. Currently focused on Digimon TCG with plans to support additional TCGs.

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS 4, Inter font, Lucide React icons
- **Backend:** Supabase (Postgres, Auth, RLS)
- **Client caching:** TanStack React Query v5
- **Data sync:** Python scripts (sync_cards.py, sync_prices.py, sync_images.py) run via GitHub Actions
- **Hosting:** Vercel (free tier)
- **Card data source:** Digimon Card API (digimoncard.io)
- **Price data:** Cardmarket API (primary), Cardtrader API (fallback)

## Key Commands

- `npm run dev` — dev server at localhost:3000
- `npm run build` — production build
- `npm run lint` — ESLint
- `python scripts/sync_cards.py` — sync card data from API
- `python scripts/sync_prices.py` — sync price data

## Architecture Overview

Next.js App Router with route groups for each feature area. No `src/` directory — `app/`, `components/`, `lib/`, `contexts/` are at the project root.

### Routes (`app/`)
- `/` — landing page / dashboard
- `/auth` — auth callback
- `/login` — login page
- `/database` — card browsing (guest-accessible)
- `/collection` — user's card collection (auth required)
- `/decks` — deck management (auth required)
- `/sell` — surplus cards to sell (auth required)

### Key patterns
- `app/providers.tsx` — wraps app with TanStack QueryClientProvider + Supabase auth
- `contexts/panel-context.tsx` — shared context for card detail panel (slide-out panel used across pages)
- `components/nav/app-shell.tsx` — responsive shell with top nav (desktop) and bottom tab bar (mobile)
- Card images served from digimoncard.io CDN, not stored locally

## Repository Structure

```
app/                    # Next.js App Router pages
  auth/                 # Auth callback route
  collection/           # Collection management page
  database/             # Card browsing page
  decks/                # Deck management page
  login/                # Login page
  sell/                 # Surplus/sell page
components/
  cards/                # Card display components (grid, panel, thumbnails, filters, search)
  collection/           # Collection-specific components
  dashboard/            # Dashboard stats, deck progress, guest landing, worth-selling widget
  decks/                # Deck-specific components
  icons/                # Custom icons (CardBoard logo)
  nav/                  # App shell, top nav, bottom tab bar
  sell/                 # Sell-specific components
contexts/               # React contexts (panel context)
lib/
  hooks/                # Custom React hooks
  supabase/             # Supabase client utilities
  types.ts              # TypeScript interfaces (Card, CollectionEntry, Deck, DeckCard, CardPrice, Expansion, SellableCard)
  utils.ts              # Utility functions
  import-parser.ts      # Card list import parsing
scripts/                # Python data sync scripts
  sync_cards.py         # Fetch cards from Digimon Card API → Supabase
  sync_prices.py        # Fetch prices from Cardmarket/Cardtrader → Supabase
  sync_images.py        # Image sync utility
supabase/migrations/    # 5 migrations: initial schema, variants, expansions, expansion metadata, promote variants
docs/                   # Documentation and design specs/plans
public/                 # Static assets (favicon, logo)
```

## External Dependencies & Services

- **Supabase** — Postgres database, auth, RLS. Requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` env vars.
- **Digimon Card API** (digimoncard.io) — card data source
- **Digimon Card CDN** (images.digimoncard.io) — card images
- **Cardmarket API** — primary price data
- **Cardtrader API** — fallback price data
- **Vercel** — hosting
- **GitHub Actions** — daily cron for data sync scripts
