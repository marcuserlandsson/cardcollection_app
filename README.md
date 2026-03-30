# CardBoard — TCG Collection Tracker

A responsive web app for tracking your TCG card collection, planning decks, and identifying surplus cards worth selling on Cardmarket. Currently focused on **Digimon TCG** with plans to support additional TCGs.

## Features

### Card Database
Browse the full Digimon TCG card catalog — search by name or card number, filter by color, type, and rarity, or browse by expansion set. Tap any card to view its full details including stats, rarity, and current Cardmarket pricing. No account required.

### Collection Tracking
Keep track of every card you own. Add cards directly from the database with simple +/- controls, and see your collection stats at a glance — total cards, unique cards, and estimated value.

### Deck Planning
Build and manage custom decks. See completion percentages based on your collection, track which cards you still need, and plan your next purchases. Each deck shows a breakdown of owned vs. needed quantities for every card.

### Sell Advisor
Identify surplus cards beyond your playset needs and deck requirements. CardBoard calculates which cards you can safely sell and shows their current Cardmarket prices, so you know exactly what your extras are worth.

## How to Use

### Getting Started
1. **Browse cards** — Visit the Database tab to explore the full Digimon TCG card list. No account needed.
2. **Create an account** — Sign up with your email to unlock collection tracking, deck planning, and the sell advisor.
3. **Build your collection** — Tap any card and use the +/- controls to record how many copies you own.
4. **Plan decks** — Head to the Decks tab, create a new deck, and add cards. CardBoard tracks which cards you still need.
5. **Find cards to sell** — The Sell tab shows cards you own beyond what your decks and playsets require, along with estimated Cardmarket prices.

### Navigation
- **Mobile:** Bottom tab bar with Database, Collection, Decks, and Sell tabs
- **Desktop:** Top navigation bar

### Authentication
- Card browsing is available to everyone
- Collection, Decks, and Sell features require a free account
- Sign up with email and password — you'll receive a confirmation email

## Tech Stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, Lucide React
- **Backend:** Supabase (Postgres, Auth, Row Level Security)
- **Hosting:** Vercel
- **Data:** Digimon Card API + Cardmarket/Cardtrader pricing
- **Caching:** TanStack Query (React Query)

## Self-Hosting

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
   Fill in your Supabase project URL and anon key (found in Supabase → Settings → API).

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

Card data and prices sync daily via GitHub Actions. Add these as **repository secrets** in your GitHub repo (Settings → Secrets and variables → Actions):

| Secret | Required | Description |
|--------|----------|-------------|
| `SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (not the anon key) |
| `CARDMARKET_APP_TOKEN` | Optional | Cardmarket API token for price data |
| `CARDMARKET_APP_SECRET` | Optional | Cardmarket API secret |
| `CARDTRADER_ACCESS_TOKEN` | Optional | Cardtrader API token (fallback price source) |

You can also trigger a manual sync from the Actions tab in GitHub.
