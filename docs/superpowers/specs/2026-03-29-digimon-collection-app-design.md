# Digimon TCG Collection App — Design Spec

## Overview

A responsive web app for tracking your Digimon TCG card collection, planning decks, and identifying surplus cards worth selling on Cardmarket. Works on desktop and mobile browsers.

## Core Use Cases

1. **Browse & search** the full Digimon TCG card database by expansion, name, color, type, rarity
2. **Track collection** — record how many copies of each card you own
3. **Plan decks** — define deck lists and see which cards you're missing from your collection
4. **Sell advisor** — identify surplus cards (beyond what you need) and show their Cardmarket value

## Tech Stack

- **Frontend:** Next.js (App Router) with React and Tailwind CSS
- **Backend/Database:** Supabase (Postgres, Auth, Row Level Security)
- **Hosting:** Vercel (free tier, auto-deploys from GitHub)
- **Card Data Source:** Digimon Card API (`https://digimoncard.io/api-public/`)
- **Price Data Source:** Cardmarket API (primary, requires seller account), Cardtrader API (fallback, free account)
- **Data Sync:** Python scripts for card data and price fetching
- **Client-Side Caching:** TanStack Query (React Query)
- **Future:** PWA support for offline collection browsing, camera card scanning

## Data Model

### cards (synced from Digimon Card API)

| Column | Type | Notes |
|--------|------|-------|
| card_number | text (PK) | e.g., "BT1-001" |
| name | text | Card name |
| expansion | text | Set code, e.g., "BT-01" |
| card_type | text | Digimon, Tamer, Option, Digi-Egg |
| color | text | Red, Blue, Yellow, Green, Black, Purple, White |
| rarity | text | Common, Uncommon, Rare, Super Rare, Secret Rare, etc. |
| dp | integer | Digimon Power (nullable for non-Digimon) |
| play_cost | integer | Cost to play (nullable) |
| level | integer | Digimon level (nullable) |
| evolution_cost | integer | Cost to digivolve (nullable) |
| image_url | text | Card image URL from the API |
| max_copies | integer | Default 4; 1 for restricted, 0 for banned |
| last_updated | timestamptz | When this record was last synced |

### collection (user's owned cards)

| Column | Type | Notes |
|--------|------|-------|
| user_id | uuid (FK → auth.users) | Composite PK with card_number |
| card_number | text (FK → cards) | Composite PK with user_id |
| quantity | integer | How many copies owned |
| updated_at | timestamptz | |

### decks

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| user_id | uuid (FK → auth.users) | |
| name | text | Deck name |
| description | text | Optional |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### deck_cards (cards in a deck)

| Column | Type | Notes |
|--------|------|-------|
| deck_id | uuid (FK → decks) | Composite PK with card_number |
| card_number | text (FK → cards) | Composite PK with deck_id |
| quantity | integer | How many needed in this deck |

### card_prices (Cardmarket pricing)

| Column | Type | Notes |
|--------|------|-------|
| card_number | text (PK, FK → cards) | |
| price_avg | numeric | Average price in EUR |
| price_low | numeric | Lowest price in EUR |
| price_trend | numeric | Price trend in EUR |
| fetched_at | timestamptz | When prices were last pulled |

### Sell Logic

A card is sellable when you own more than you need. The threshold is:

```
need = max(card.max_copies, sum of quantity across all decks for this card)
sellable = collection.quantity - need
```

- Default `max_copies` is 4 (standard playset)
- If two decks each use 4 of a card, `need` = 8, so you'd want 8 before surplus is flagged
- Restricted cards have `max_copies` = 1, banned = 0

## Architecture

### Frontend (Next.js on Vercel)

- App Router with file-based routing
- Tailwind CSS with a dark theme
- TanStack Query for server state caching and synchronization
- Responsive layout: bottom tab bar on mobile, top nav bar on desktop

### Backend (Supabase)

- Postgres database with the schema above
- Supabase Auth for user accounts (email/password or OAuth)
- Row Level Security: each user can only read/write their own collection and decks
- Cards and card_prices tables are publicly readable (no auth needed to browse)
- Supabase JS client for all frontend ↔ database communication

### Data Sync

- **Card sync:** Python script pulls all cards from Digimon Card API and upserts into `cards` table. Runs automatically on a schedule via GitHub Actions (e.g., daily) so new expansions and cards appear in the app without manual intervention. Can also be triggered manually.
- **Price sync:** Python script fetches card prices and updates `card_prices` table. Runs on a schedule via GitHub Actions (e.g., daily) alongside the card sync. Primary source is Cardmarket API (requires registering as a seller to get API credentials — OAuth 1.0, price guide endpoint provides avg/low/trend). Fallback source is Cardtrader API (free account + API token, EUR pricing). If neither source is available for a card, the UI shows "Price not available" gracefully.
- Card images are served directly from the Digimon Card API CDN — not stored in our database.

## UI Design

### Navigation

- **Mobile:** Bottom tab bar with 4 tabs — Database, Collection, Decks, Sell Advisor
- **Desktop:** Top horizontal nav bar with the same 4 sections
- Breakpoint switch around 768px

### Database Tab

- **Default view:** Search bar + filter chips (color, type, rarity) at the top. Below: grid of expansions showing set code and card count. Tapping an expansion shows all cards in that set.
- **Search/filter behavior:** When the user types in the search bar or applies filters, the expansion grid is replaced with a card results grid matching the query across all sets.
- **Card thumbnails:** Card image with name and card number. Quantity badge overlay if owned.

### Card Detail (Slide-Up Panel)

- Tapping a card opens a bottom sheet / slide-up panel over the current view
- Shows: card image (left), name, card number, type, color, rarity, stats (right)
- **Collection controls:** +/− buttons to adjust quantity owned
- **Cardmarket price** display
- **Deck usage:** list of decks this card is in with quantities
- "View full details →" link for expanded info
- Swipe down or tap outside to dismiss
- Tapping another card while panel is open swaps the content (no dismiss animation)

### Collection Tab

- **Summary banner** at top: total cards owned, total unique cards, estimated collection value
- **Same combined layout as Database tab** but filtered to only show owned cards
- **Quantity badges** on each card thumbnail
- **Additional filter options:** "Missing from decks", "Surplus (sellable)", "Complete sets"

### Decks Tab

- **Deck list:** Cards showing deck name, card count, completion percentage bar
- **Deck detail view:** List of cards in the deck with quantities. Color-coded: green = owned enough, red = missing some/all.
- **Add cards to deck:** Opens the database browser with an "Add to deck" action on each card
- **Missing cards summary:** Per deck, a summary of what cards are still needed

### Sell Advisor Tab

- **Summary banner:** "You have X surplus cards worth approximately €Y"
- **Sellable cards list** sorted by total surplus value (highest first)
- Each row: card thumbnail, name, surplus count (e.g., "×3 surplus"), unit price, total value
- **Price freshness indicator:** "Prices updated 2 hours ago" with manual refresh button
- Tapping a card opens the same slide-up panel as the database view

## Authentication

- Supabase Auth with email/password sign-up
- Optional: Google OAuth for easier onboarding
- Guest browsing allowed for the card database (no account needed to search/view cards)
- Account required for collection tracking, deck building, and sell advisor

## Future Enhancements (Out of Scope for v1)

- **Camera scanning:** Add cards by scanning with phone camera (OCR/image recognition)
- **PWA offline support:** Service worker to cache collection data for offline browsing
- **Collection sharing:** Share your collection or deck lists with friends via link
- **Price alerts:** Notify when a card's price crosses a threshold
- **Trade helper:** Compare collections with friends to find trade opportunities
