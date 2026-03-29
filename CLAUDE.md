# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Digimon TCG card collection tracker - a React Native/Expo mobile app with a Supabase backend and the Digimon Card API for card data.

## Development Commands

All commands run from the `DigimonCardApp/` directory:

```bash
npm start              # Start Expo dev server
npm run android        # Run on Android emulator
npm run ios            # Run on iOS simulator
npm run web            # Run web version
npm test               # Run Jest tests (watch mode)
npm run lint           # Run Expo lint
```

To update the card database, run `fetch_cards_from_api.py` from the repo root (Python, requires supabase-py).

## Architecture

### App Structure (DigimonCardApp/)

- **Expo Router** with file-based routing under `app/`
- Tab navigation defined in `app/(tabs)/_layout.tsx` with three visible tabs: Home, Database, Collection
- Hidden routes (cardList, cardDetails) are accessible via stack navigation but excluded from the tab bar (`href: null`)
- Root layout (`app/_layout.tsx`) handles the global header with dynamic back button behavior

### Key Screens

| Route | File | Purpose |
|-------|------|---------|
| `/` | `app/(tabs)/index.tsx` | Home with nav buttons |
| `/database` | `app/(tabs)/database.tsx` | Grid of card expansions (BT11-BT20) |
| `/cardList` | `app/(tabs)/cardList.tsx` | Cards in a selected expansion (3-column grid) |
| `/cardDetails` | `app/(tabs)/cardDetails.tsx` | Single card view with API-fetched details |
| `/collection` | `app/(tabs)/collection.tsx` | Placeholder for user collection |

### Data Flow

1. **Supabase** (`lib/supabase.ts`) stores card data (table: `cards` with columns: `card_number`, `card_name`, `card_expansion`, `last_updated`)
2. **Digimon Card API** (`https://digimoncard.io/api-public/`) provides detailed card info and images at runtime
3. **Python sync script** (`fetch_cards_from_api.py`) bulk-fetches cards from the API and upserts to Supabase in batches of 50
4. The app queries Supabase for card lists, then fetches individual card details from the Digimon Card API with a rate limiter (15 tokens, 10-second refill)

### Styling

Dark theme throughout: background `#25292e`, accent blue `#0865a3`. Uses React Native `StyleSheet` objects defined per-component.
