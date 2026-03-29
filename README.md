# CardBoard — TCG Collection Tracker

A responsive web app for tracking your TCG card collection, planning decks, and identifying surplus cards worth selling. Currently focused on Digimon TCG with plans to support additional TCGs.

## Features

- **Card Database** — Browse all Digimon TCG cards by expansion, search by name or number, filter by color/type/rarity
- **Collection Tracking** — Track how many copies of each card you own with +/- controls
- **Deck Planning** — Create deck lists, see which cards you're missing, track completion percentage
- **Sell Advisor** — Identify surplus cards beyond your playset/deck needs, see Cardmarket prices and total value

## Tech Stack

- **Frontend:** Next.js, TypeScript, Tailwind CSS
- **Backend:** Supabase (Postgres, Auth, Row Level Security)
- **Hosting:** Vercel
- **Data:** Digimon Card API + Cardmarket/Cardtrader pricing

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- A Supabase project (free tier works)

### Setup

1. Clone the repo and install dependencies:
   ```bash
   git clone https://github.com/marcuserlandsson/cardcollection_app.git
   cd cardcollection_app
   npm install
   ```

2. Create a `.env.local` file from the template:
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in your Supabase project URL and anon key.

3. Set up the database — run the SQL in `supabase/migrations/001_initial_schema.sql` in your Supabase SQL Editor. First enable the `pg_trgm` extension:
   ```sql
   create extension if not exists pg_trgm;
   ```

4. Sync card data:
   ```bash
   pip install -r scripts/requirements.txt
   python scripts/sync_cards.py
   ```

5. Start the dev server:
   ```bash
   npm run dev
   ```

### Automated Data Sync

Card data and prices sync daily via GitHub Actions. Set these secrets in your repo:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CARDMARKET_APP_TOKEN` / `CARDMARKET_APP_SECRET` (optional)
- `CARDTRADER_ACCESS_TOKEN` (optional)
