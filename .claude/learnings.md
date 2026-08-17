# Learnings

Mistakes made and lessons learned in this project. Read this before any implementation work. Add new entries when mistakes are made or corrections are received.

Each entry format: `- **[description]`: [actionable corrective rule]`

## Code Quality

- **Seeding React state from `localStorage` trips `react-hooks/set-state-in-effect`**: `eslint-config-next` 16 enables this rule, and it fires no matter how the state is shaped (single vs. batched useState). The codebase's established answer is a narrow `eslint-disable-next-line` at the call site, not a rewrite — see `components/sell/share-modal.tsx` for precedent.
- **The omit-a-key rest-strip idiom is a lint error here**: `({ cards: _cards, ...rest }) => rest` trips `@typescript-eslint/no-unused-vars` because the ESLint config sets no `varsIgnorePattern` for underscore-prefixed siblings. Pick the fields you want explicitly instead, e.g. `(row) => ({ card_number: row.card_number, expansion: row.expansion })`.
- **`bool` subclasses `int` in Python**: `isinstance(x, int)` accepts `True`/`False`. When validating that a value is an integer (e.g. `max_copies`), check `isinstance(x, bool)` first and reject it before the `int` check.

## Testing

- **vitest runs `environment: "node"` with no jsdom**: component and hook behaviour cannot be unit-tested directly. Extract pure functions out of components/hooks and test those instead.

## Architecture

- **Postgres `->>` cannot distinguish an absent jsonb key from one set to JSON `null`**: both return SQL NULL, so a parity query comparing `attributes->>'key'` against a column will pass even if one side wrote `null` and the other omitted the key entirely. Use `attributes ? 'key'` when key existence (not value) is what needs checking.
- **`cards!inner(...)` Supabase embeds require a real foreign key**: `card_prices` and `card_price_history` lost their FK to `cards` in migration `007` (to unblock inserts for orphaned keys), so neither can be filtered via an inner-join embed.
- **A deck's operations must use the deck's own `game`, never the active game from `useGame()`**: the game switcher lives in the persistent app shell, so a user can flip games without leaving a deck page; a deck's game is fixed at creation. Got this wrong three times before catching it: the add-card search, the import modal, and deck validation. When touching anything deck-scoped, thread `deck.game` through explicitly rather than reading the ambient active game.
- **Supabase client default 1000-row limit**: Always paginate with `.range()` when querying tables that may exceed 1000 rows. This bit us in both the Python sync script and the frontend React hooks (`usePrices`, `usePriceHistory`). Check any `select("*")` call.
- **FK constraints block inserts for orphaned keys**: The `card_prices` FK to `cards.card_number` prevented storing prices keyed by `base_card_number` when no Regular variant existed. Migration 007 dropped these FKs. Be aware of this pattern.
- **Supabase HTTP/2 connection limit (~10K requests)**: The hosted Supabase terminates HTTP/2 connections after ~10,000 stream pairs. Python sync scripts that make many sequential updates must recreate the client periodically (every ~2,000 requests). See `REFRESH_INTERVAL` in `sync_images.py`.

## Workflow

- **Parallel subagent execution can lose commits**: When dispatching multiple agents to the same worktree in parallel, later commits can overwrite earlier ones. The `use-sell-list.ts` file was lost this way and had to be recovered from reflog. Prefer sequential execution for tasks touching the same branch, or use isolated worktrees per agent.

## Project-Specific

- **Cardtrader collector numbers can have trailing whitespace**: Always `.strip()` the suffix extracted from the regex match. Trailing spaces were causing ~13 cards to be classified as having a suffix when they were really Regular cards.
- **Card-number regex trailing group must be greedy**: a non-greedy trailing group in the import-parser's card-number regex silently eats the number's own trailing digits when there is no quantity suffix — `BT3-015` parses as card `BT3-0` quantity `15`. Keep the group greedy; a greedy `[A-Za-z0-9]+` for the card number already cannot cross the whitespace before a quantity, so there's no ambiguity to resolve by making it non-greedy.
- **Next.js useSearchParams requires Suspense boundary**: Any page using `useSearchParams()` must wrap the consuming component in `<Suspense>`. The database page already had this; the sell page was missing it.

- **Alt art cards have completely different prices from regular cards**: Never share prices between variants. AD1-008 Regular = €19, Alt Art = €56, SP = €410. The sync must store per-variant prices, not per-base-card.
- **Cardtrader API response formats vary by endpoint**: `/games` returns `{"array": [...]}`, `/marketplace/products` returns `{blueprint_id_str: [listings]}`, `/blueprints/export` returns a flat list. Always inspect the actual response structure.
- **Cardtrader collector_number is in `fixed_properties`**: Not at the top level of blueprint objects. Access via `bp.get("fixed_properties", {}).get("collector_number")`.
- **Cardtrader variant suffixes**: `a`=alt art, `s`=SP/special rare, `sec`=secret, `g`=gold, `b`=black&white, `P1`=promo, `p`=participant, `c`=champion. Same collector_number in different CT expansions = different products (pre-release, resurgence reprint, etc.).
- **Next.js 16 uses proxy.ts not middleware.ts**: Cannot have both files — Next.js 16 errors with "Both middleware file and proxy file detected". All middleware logic goes in `proxy.ts`.
- **Next.js image hostname allowlist**: Some cards use `world.digimoncard.com` CDN instead of `images.digimoncard.io`. Both must be in `next.config.ts` `remotePatterns`.
- **digimoncard.io alt art CDN is unreliable**: The `images.digimoncard.io/images/cards/alt/{card}-set-{id}-{idx}.webp` pattern returns 404 for many newer sets (AD1, BT12+). Use `world.digimoncard.com/images/cardlist/card/{card}_P{N}.png` instead — works across all sets with no set_id lookup.
- **sync_images.py must override variant images aggressively**: Only checking `current_image == default_jpg` misses variants that already have a wrong URL. For variants, always prefer CardTrader images unless one is already set.
