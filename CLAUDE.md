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

- Card images served from digimoncard.io CDN: `https://images.digimoncard.io/images/cards/{card_number}.jpg`
- Alt art images: `https://images.digimoncard.io/images/cards/alt/{card_number}-set-{set_id}-{idx}.webp`
- Card variants (alt arts, reprints) documented in `docs/card-variants.md`
- Sell logic: `surplus = owned - max(max_copies, sum across all decks)`
- Guest browsing allowed for card database; auth required for collection/decks/sell
- Bottom tab nav on mobile, top nav on desktop (768px breakpoint)
- Supabase RLS enforces per-user data isolation

## Database Schema

See `supabase/migrations/` for the full schema.
Tables: `cards`, `card_variants`, `collection`, `decks`, `deck_cards`, `card_prices`
