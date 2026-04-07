# Learnings

Mistakes made and lessons learned in this project. Read this before any implementation work. Add new entries when mistakes are made or corrections are received.

Each entry format: `- **[description]`: [actionable corrective rule]`

## Code Quality

## Testing

## Architecture

- **Supabase client default 1000-row limit**: Always paginate with `.range()` when querying tables that may exceed 1000 rows. This bit us in both the Python sync script and the frontend React hooks (`usePrices`, `usePriceHistory`). Check any `select("*")` call.
- **FK constraints block inserts for orphaned keys**: The `card_prices` FK to `cards.card_number` prevented storing prices keyed by `base_card_number` when no Regular variant existed. Migration 007 dropped these FKs. Be aware of this pattern.

## Workflow

- **Parallel subagent execution can lose commits**: When dispatching multiple agents to the same worktree in parallel, later commits can overwrite earlier ones. The `use-sell-list.ts` file was lost this way and had to be recovered from reflog. Prefer sequential execution for tasks touching the same branch, or use isolated worktrees per agent.

## Project-Specific

- **Alt art cards have completely different prices from regular cards**: Never share prices between variants. AD1-008 Regular = €19, Alt Art = €56, SP = €410. The sync must store per-variant prices, not per-base-card.
- **Cardtrader API response formats vary by endpoint**: `/games` returns `{"array": [...]}`, `/marketplace/products` returns `{blueprint_id_str: [listings]}`, `/blueprints/export` returns a flat list. Always inspect the actual response structure.
- **Cardtrader collector_number is in `fixed_properties`**: Not at the top level of blueprint objects. Access via `bp.get("fixed_properties", {}).get("collector_number")`.
- **Cardtrader variant suffixes**: `a`=alt art, `s`=SP/special rare, `sec`=secret, `g`=gold, `b`=black&white, `P1`=promo, `p`=participant, `c`=champion. Same collector_number in different CT expansions = different products (pre-release, resurgence reprint, etc.).
- **Next.js image hostname allowlist**: Some cards use `world.digimoncard.com` CDN instead of `images.digimoncard.io`. Both must be in `next.config.ts` `remotePatterns`.
