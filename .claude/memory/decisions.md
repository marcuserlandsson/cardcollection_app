# Decisions

Architecture and technical decisions made in this project. Update this file when significant decisions are made.

## Architecture

- **One shared `cards` table with a `game` column, not per-game tables**: keeps collection/deck/sell logic and every existing query shape unchanged across games; a game just adds a row and a filter value.
- **`card_number` stays the single-column primary key; the importer guards collisions instead of a composite key**: avoids a schema migration and keeps existing FKs (`collection`, `deck_cards`, `card_prices`) untouched; `find_collisions()` in `scripts/import_game_cards.py` hard-fails the import if a new game's card numbers collide with an existing row.
- **JSONB `attributes` column for per-game stats**: Digimon and Cyberpunk cards have disjoint stat sets (dp/play_cost/level vs RAM/unit type), and JSONB avoids adding nullable columns per game or a migration every time a game is added.
- **Global game switcher, not game-scoped routes**: one `contexts/game-context.tsx` persisted to `localStorage["cardboard.game"]` keeps the URL structure and every existing route unchanged; most query keys carry the game id instead. Deliberate exceptions: `usePrices`, `usePriceHistory`, `useSellShare`, `useDeck`, `useDeckCards`, and four keyed card lookups (`app/collection/page.tsx`, `app/sell/page.tsx`, `components/dashboard/dashboard-stats.tsx`, `components/dashboard/worth-selling.tsx`) — these are keyed lookups against already-scoped data, and are documented at their call sites.
- **No price feed for Cyberpunk**: Cardmarket's API is closed to new applicants and Cardtrader has not listed the game; `GameConfig.hasPrices` gates all price UI off rather than shipping broken/empty price data.

## Tooling

## Conventions

## Trade-offs
