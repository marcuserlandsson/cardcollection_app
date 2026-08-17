# Handoff

Current state of work for session continuity. Updated at the end of each session.

## Last Session Summary

**Multi-game support (Cyberpunk TCG), phases 1-3, on branch `feat/multi-game-support`.**

### Accomplished

- **Phase 1 (Tasks 1-11):** Shared `cards`/`decks` schema gained `game` and JSONB
  `attributes` columns; every query, hook, and mutation across collection,
  decks, sell, and needs is now scoped `.eq("game", gameId)`; the game
  registry (`lib/games/`) and `contexts/game-context.tsx` exist; card display
  components (thumbnail, panel, image) read colours/types/rarities/stats/image
  fallback from the registry instead of hardcoded Digimon values. **Acceptance
  gate passed**: migration 010 applied to the live database, the human
  partner confirmed the parity query returns 0, and the manual walkthrough
  showed no change to the Digimon experience — phase 1 is behaviour-neutral
  as designed. **Caveat on build version:** that gate evidence, including the
  manual walkthrough, was captured against an unrequested Next.js `16.3.1`
  bump that landed mid-branch and was later reverted. The tree is now pinned
  back to `16.2.1` (`package.json:17`, matching `eslint-config-next`).
  `npm test`, `tsc --noEmit`, `lint`, and `build` were all re-verified clean
  on `16.2.1`. The manual walkthrough was **not** repeated on `16.2.1` — it
  only covers `16.3.1`. Re-run it if a Next.js version bump is suspected of
  affecting rendering or navigation before trusting the gate again.
- **Phase 2 (Task 12-12b):** Cyberpunk registered in the game registry with a
  provisional colour list (only Red and Green independently confirmed from
  official sources; the rest is unpublished until Cyberpunk TCG's October
  retail release) and deck rules. Fixed a latent stat-rendering bug where a
  Legend's `attributes.ram` (an object like `{"red": 3}`) would render as
  `"[object Object]"` — `StatField` now takes an optional `format` function.
- **Phase 3 (Tasks 13-17):** Card-number parser handles both games' formats.
  `scripts/import_game_cards.py` built with three modes
  (`--validate-only`, `--dry-run`, real run) and multiple collision guards
  (cross-game `card_number`, cross-game `expansion_metadata`). Price UI gated
  behind `GameConfig.hasPrices`; legal/attribution copy updated for Cyberpunk.
  `sync_cards.py` now dual-writes the legacy stat columns and the new
  `attributes` JSONB from the same computed values, so they cannot diverge.

Every task passed independent code review; details and rationale for every
ruling are in the SDD ledger at
`.superpowers/sdd/2026-08-17-multi-game-support/progress.md`.

## Blocked on the October retail release

Cyberpunk TCG cards are not public yet. Three things are on hold until they
are:

- **`scripts/data/cyberpunk_cards.json` is `[]`.** It must be populated from
  `cyberpunktcg.com/cards` once cards are revealed. Do not invent card data —
  the importer's `--validate-only` mode can shape-check whatever is entered,
  offline, with no credentials.
- **The Cyberpunk image CDN host is not yet in `next.config.ts`.** It must be
  added at the same time as the seed is populated, derived from the seed's
  actual `image_url` values. Until then, every Cyberpunk card image will
  silently fail to render (blocked by Next.js's image domain allowlist).
- **The colour list is provisional and lives in two places that must agree**:
  `lib/games/cyberpunk.ts` and the `GAME_RULES` dict in
  `scripts/import_game_cards.py` (different languages, different files). Only
  Red and Green are confirmed. A colour outside the list aborts the import,
  naming the offending colour — that's the safety net, not a guess to leave
  unresolved.

## Awaiting the account holder

Not yet run, in this order:

1. `python scripts/sync_cards.py` (to populate `attributes` for existing
   Digimon cards via the new dual-write).
2. **Both** parity queries from the plan's Task 17 Step 2 — the value
   comparison and the key-existence check (`attributes ? 'key'`, not just
   `->>'key'`, since Postgres can't otherwise tell an absent key from one set
   to JSON `null`). Both must return 0.
3. Confirm Digimon stat boxes still render correctly on `/database` and deck
   pages.

Also unexercised (no real data, no live credentials available during this
run): the importer's live paths — the `games` table registration check,
`find_collisions()`, `find_expansion_collisions()`, and the actual upserts
and their idempotency.

Do not treat any of the above as verified — the ledger is explicit that these
are handed off, not passed.

## Deferred items

- `handleImport` in `components/decks/import-modal.tsx` has no try/catch —
  any mutation failure during an import leaves the modal stuck on its
  spinner with no visible error. Pre-existing, not introduced by this work.
- `lib/hooks/use-sell-share.ts` is not game-scoped (one `sell_shares` row per
  user regardless of active game). Harmless today because `/sell` is gated
  on `GameConfig.hasPrices` and only Digimon has prices; becomes a real bug
  the moment a second game gets a price feed.
- The game switcher's `<button>` elements lack `type="button"`, and the
  dropdown lacks `aria-expanded`/`aria-haspopup` and Escape-to-close.
- The deck page's legality/missing-count banners briefly vanish on card
  add/remove because the query key changes on refetch. `keepPreviousData` on
  that query would fix both at once.
- Migration `011` (dropping the legacy `dp`/`play_cost`/`level`/
  `evolution_cost` columns) is still pending. It must not run until both
  parity queries above are green — the drop is irreversible.

## Design note for a third game

"Which game does this operation belong to?" was the wrong-answer fork three
times in this work: the deck add-card search, the import modal, and deck
validation all defaulted to the *active* game from `useGame()` when they
needed the *deck's own* `game` instead. A deck-scoped context or hook that
supplies `deck.game` to everything under the deck page would make this hard
to get wrong. Worth doing before a third game lands.

## Open Questions

- The outlier threshold (50% of median) may need tuning — monitor
  `OUTLIER_THRESHOLD` in `sell-utils.ts`.
- Sparkline only useful once price history accumulates over several days.
- ~1,988 variants use world CDN `_P{N}` images — likely correct but
  unverified.
- Next.js 16 uses `proxy.ts` not `middleware.ts` — keep this in mind for
  future middleware work.
- `NEXT_PUBLIC_SITE_URL` env var needed for auth callback origin in
  production.
