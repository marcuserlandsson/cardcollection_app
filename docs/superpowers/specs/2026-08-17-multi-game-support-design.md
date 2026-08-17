# Multi-Game Support (Cyberpunk TCG) — Design

**Date:** 2026-08-17
**Status:** Approved (pending implementation plan)
**Scope:** Turn CardBoard from a Digimon app into a multi-game app, and add
Cyberpunk TCG as the second game — collection tracking, missing cards, and decks.
Prices for Cyberpunk are explicitly out of scope (see Decisions).

## Problem

CardBoard is structurally single-game. `cards.card_number` is a global primary
key with no game dimension, Digimon's four stats (`dp`, `play_cost`, `level`,
`evolution_cost`) are columns on `cards`, and Digimon's card types, colours,
rarities, image CDN, and deck rules are hardcoded across `card-filters.tsx`,
`card-panel.tsx`, and `lib/utils.ts`.

Cyberpunk TCG (WeirdCo × CD PROJEKT RED) has its retail launch later in 2026 and
the user wants to track collection, missing cards, and decks for it. Adding it by
copying the Digimon paths would duplicate collection and deck logic that has no
reason to differ between games.

## Goal

One shared data model and one set of hooks and pages serving both games, with all
per-game variation isolated into (a) a `game` column, (b) a JSONB `attributes`
column, and (c) a TypeScript game registry. A third game should then cost a
config file and a seed file, not a refactor.

### Success criteria

- A nav switcher selects the active game; collection, database, decks, and needs
  all show only that game's data, and the selection survives a reload.
- Cyberpunk cards are in the database with correct card numbers, sets, types,
  rarities, images, and stats, imported reproducibly from a versioned seed file.
- Deck building enforces each game's own rules: Digimon 50 + up to 5 Digi-Eggs at
  4 copies; Cyberpunk exactly 3 unique-name Legends plus 40–50 cards at 3 copies.
- The needs page lists missing Cyberpunk cards without price columns.
- Phase 1 (plumbing) produces no visible change to the Digimon experience.

## Research findings (2026-08-17)

Established before design, because two assumptions did not survive contact.

### Cyberpunk TCG game facts

- Debut retail set **Welcome to Night City**. Booster display 2026-10-14,
  mass-market ~November 2026. ~110–124 cards revealed so far.
- Card types: **Legend, Unit, Gear, Program**.
- Stats: **Cost** (Eddies, top-left), **Power** (bottom-right), **RAM** (coloured,
  top-right). Cards also carry **tags** (Arasaka, Merc, Ganger) and keywords
  (PLAY, CALL, ATTACK, DEFEATED, ADRENALINE, GO SOLO, QUICK, BLOCKER).
- Seven rarities: Common, Uncommon, Rare, Epic Rare, Secret Rare, **Iconic Rare**
  (alternate art of an existing card, identical rules text), **Nova Rare**
  (promos / full-art chase, outside the booster rarity structure).
- Deck rules: exactly **3 Legend cards with unique names**; **no fewer than 40 and
  no more than 50** cards not counting Legends; **no more than 3 copies** of the
  same card; and each card's coloured RAM value must fit within the combined RAM
  the three Legends provide for that colour.
- Collector numbers are set-prefixed lowercase text: `wtnc-006`, `eps-012`
  (Embracing Power starter), `ths-002` (The Heist starter), `alpha-a010`,
  `promo-n001`. Alternate arts carry their own collector numbers.

### Card data sources

- **No official public API.** The official database at `cyberpunktcg.com/cards` is
  rendered by **NetDeck.gg**, which advertises "structured card data APIs for
  third-party developers" but publishes no docs, signup, or pricing. Contact is
  `max@netdeck.gg`.
- Community databases (ripperdeck.gg, exburst.dev, cyberdecks.app,
  cyberpunktcgmeta.com, tcgcyberpunk.com) publish no APIs. ripperdeck.gg has the
  cleanest visible data (110 cards with per-printing collector numbers and full
  stats) but is unaffiliated and unlicensed.
- `TheCardGoat/tcg-engines` on GitHub has a `submodules/cyberpunk` containing card
  data plus parser/scraper tooling.
- `apitcg.com` (open-source multi-TCG API) covers Digimon today but not Cyberpunk.

### Price sources

- Cardmarket will fully support Cyberpunk in Europe with singles from early
  September 2026 — but **Cardmarket is still not accepting new API applications**
  as of 2026, the same blocker already recorded in `CLAUDE.md`. Cardmarket is
  where the cards are bought and sold; it is not an automatable price feed.
- Cardtrader (already integrated, per-variant blueprint pricing) has announced no
  Cyberpunk support. Its `/games` + `/blueprints/export` pattern is what
  `sync_prices.py` already uses, so it remains the cheapest future option.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Cyberpunk prices at launch | **None** | Cardmarket's API is closed and Cardtrader hasn't listed the game. Schema stays price-ready; `hasPrices: false` hides price UI. |
| Card data ingestion | **Versioned JSON seed + Python importer** | Works today with no external dependency, reviewable in git, and any future API becomes a script that regenerates the JSON. |
| Game switching | **Global switcher, routes unchanged** | Smallest diff; existing bookmarks keep working; a deck deep-link still resolves because the deck row carries its own game. |
| Card key | **Keep single-column `card_number` PK, add `game` column** | One `ALTER TABLE` plus a default-backfill instead of rewriting seven FK tables, every hook, and both Python scripts. Digimon numbers are uppercase-prefixed and Cyberpunk's lowercase, so collision is not a live risk; the importer hard-fails on one anyway. Accepted trade-off: a future colliding game forces the composite-key migration then. |
| Card table layout | **One shared `cards` table** | Collection and deck maths is genuinely game-agnostic. Splitting `cards` would force splitting `collection`, `deck_cards`, `wishlist`, `sell_list`, and the two price tables, or branching every query. |
| Per-game stats | **JSONB `attributes`** | Cyberpunk Legends carry RAM *per colour* (`{"red":3,"blue":2}`) and every card carries a tag array — neither is a scalar column. Digimon's four stats backfill cleanly. |

## Data model

### Migration `010_multi_game.sql`

```sql
create table public.games (
  id text primary key,             -- 'digimon', 'cyberpunk'
  name text not null,              -- 'Digimon Card Game'
  short_name text not null,        -- 'Digimon'
  sort_order integer not null default 0
);

alter table public.games enable row level security;

create policy "Games are publicly readable"
  on public.games for select using (true);

insert into public.games (id, name, short_name, sort_order) values
  ('digimon',   'Digimon Card Game',            'Digimon',   1),
  ('cyberpunk', 'Cyberpunk Trading Card Game',  'Cyberpunk', 2);

alter table public.cards
  add column game text not null default 'digimon' references public.games(id),
  add column attributes jsonb not null default '{}'::jsonb;

alter table public.decks
  add column game text not null default 'digimon' references public.games(id);

alter table public.expansion_metadata
  add column game text not null default 'digimon' references public.games(id);

-- Backfill Digimon stats into attributes. Null stats are dropped rather than
-- stored as JSON nulls so `attributes ? 'dp'` means "this card has a DP".
update public.cards
set attributes = jsonb_strip_nulls(jsonb_build_object(
  'level',          level,
  'play_cost',      play_cost,
  'dp',             dp,
  'evolution_cost', evolution_cost
));

create index idx_cards_game on public.cards (game);
create index idx_decks_game on public.decks (game);
```

The `default 'digimon'` is what makes this a one-shot migration: every existing
card, deck, and expansion row backfills correctly with no data script.

**Tables that deliberately get no `game` column:** `collection`, `deck_cards`,
`card_expansions`, `card_variants`, `card_prices`, `card_price_history`,
`wishlist`, `sell_list`. All key off `card_number` and therefore inherit the
game transitively. Supabase filters through the join instead —
`.select("*, cards!inner(game)").eq("cards.game", game)`.

### Deck/card game integrity

An app-level guard can be bypassed by a direct API call, so the constraint lives
in the database:

```sql
create or replace function public.enforce_deck_card_game()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select d.game from public.decks d where d.id = new.deck_id)
     is distinct from
     (select c.game from public.cards c where c.card_number = new.card_number)
  then
    raise exception 'card % does not belong to the deck''s game', new.card_number;
  end if;
  return new;
end
$$;

create trigger trg_deck_cards_game
  before insert or update on public.deck_cards
  for each row execute function public.enforce_deck_card_game();
```

`security definer` with a pinned `search_path` so the check cannot be defeated by
RLS visibility or a shadowed schema.

**A deck's `game` is immutable after creation.** The deck form sets it from the
active game; there is no UI to change it, because changing it would invalidate
every `deck_cards` row.

### Legacy stat columns

`dp`, `play_cost`, `level`, and `evolution_cost` **stay** through this change:

1. Migration `010` backfills them into `attributes`.
2. Reads move to `attributes` (via the registry).
3. `sync_cards.py` writes **both** the legacy columns and `attributes` for one
   sync cycle.
4. Migration `011` drops the legacy columns once a sync cycle has confirmed
   parity.

Dropping columns on a live collection in the same migration as the backfill is
not worth the risk.

### `max_copies` per game

`max_copies` is already per-card, so the Cyberpunk seed sets it directly:

- Units, Gear, Programs → `3`
- **Legends → `1`** (only one copy of a named Legend may be run)

The existing sell formula `surplus = owned - max(max_copies, sum across decks)`
then produces correct Cyberpunk numbers with no code change, and the `max(...)`
means a Legend used across three decks still shows a need for three.

## The game registry

The single extension point. One config module per game under `lib/games/`.

```ts
// lib/games/types.ts
export type GameId = "digimon" | "cyberpunk";

export interface StatField {
  key: string;    // key inside cards.attributes
  label: string;  // e.g. "DP", "Power"
  prefix?: string; // e.g. "Lv." for Digimon level
}

export interface DeckZone {
  key: string;           // 'egg' | 'legend'
  label: string;
  cardTypes: string[];   // card types routed into this zone
  min: number;
  max: number;
  uniqueNames?: boolean; // Cyberpunk Legends
}

export interface DeckRules {
  mainMin: number;       // counts cards NOT in a zone
  mainMax: number;
  copyLimit: number;     // fallback when a card has no max_copies
  zones: DeckZone[];
  validate(cards: DeckCardWithCard[]): DeckIssue[];
}

export interface DeckIssue {
  severity: "error" | "warning";
  message: string;
}

export interface GameConfig {
  id: GameId;
  name: string;
  shortName: string;
  cardTypes: { label: string; icon: LucideIcon }[];
  colors: { label: string; color: string; bg: string; border: string }[];
  rarities: string[];
  stats: StatField[];
  deck: DeckRules;
  hasPrices: boolean;
  imageUrl(card: Card): string;
}
```

`lib/games/index.ts` exports `GAMES: Record<GameId, GameConfig>` and
`getGame(id: GameId): GameConfig`.

Filled in, the games differ in data and not in code:

| | `digimon.ts` | `cyberpunk.ts` |
|---|---|---|
| `cardTypes` | Digimon, Tamer, Option, Digi-Egg | Legend, Unit, Gear, Program |
| `rarities` | 5 | 7 (incl. Iconic Rare, Nova Rare) |
| `stats` | `Lv.{level}`, Cost, DP, Evo. | Cost, Power, RAM |
| `mainMin`/`mainMax` | 50 / 50 | 40 / 50 (Legends excluded) |
| `copyLimit` | 4 | 3 |
| `zones` | Digi-Egg 0–5 | Legends 3–3, `uniqueNames: true` |
| `hasPrices` | `true` | `false` |
| `imageUrl` | digimoncard.io / world CDN rules | stored `image_url` |

`stats` keys are read out of `attributes` at render time. Keys absent from a
card's `attributes` are skipped, so a partially-seeded card renders what it has
rather than showing blanks.

## Game context and navigation

`contexts/game-context.tsx` holds `{ game: GameConfig, gameId: GameId, setGameId, isHydrated }`.
It renders `digimon` on first paint and reads `localStorage["cardboard.game"]` in
an effect, so **the switcher renders a skeleton until `isHydrated`** rather than
flashing the wrong game's name — the same class of fix as commit `16a7a53`.
`setGameId` writes `localStorage` and calls `queryClient.invalidateQueries()`.

The provider goes in `app/providers.tsx` **inside** `QueryClientProvider`, since
it needs the query client to invalidate.

- **Desktop** (`top-nav-bar.tsx`): switcher between the logo and the tab pills.
  A neutral `--elevated` pill with `--border-light` and a chevron — **not**
  accent-filled, because accent is reserved for CTAs and the active nav pill.
- **Mobile**: `app-shell.tsx` currently renders no header on mobile, and
  `bottom-tab-bar.tsx` already carries six tabs. This adds a slim **mobile-only
  header** to `AppShell` holding the logo and the switcher.
- **Tab filtering**: both nav components build their `tabs` array from the
  registry. `Sell` is omitted when `hasPrices` is false, so it disappears while
  Cyberpunk is active. `proxy.ts` route guards are unchanged.
- **Direct navigation to `/sell` with Cyberpunk active** renders an explanatory
  empty state ("Price data isn't available for Cyberpunk yet"), not a 404 and not
  a redirect.

## Hooks and components

### Hooks — add `game` to the query key, plus a filter

Direct filter on `cards`:

- `lib/hooks/use-cards.ts` — all eight hooks (`useExpansions`, `useCardsByExpansion`,
  `useCardSearch`, `useCardsFiltered`, `useExpansionMetadata`, `useCard`,
  `useCardSiblings`, `useCardExpansions`)
- `lib/hooks/use-decks.ts` — list scoped by `decks.game`; create sets `game`

Join filter (`.select("*, cards!inner(game)").eq("cards.game", gameId)`):

- `use-collection.ts`, `use-wishlist.ts`, `use-sell-list.ts`, `use-prices.ts`,
  `use-price-history.ts`, `use-entry-session.ts`

Every paginated query keeps its existing `.range()` loop — the 1000-row limit in
`learnings.md` still applies, and adding a filter does not remove the need.

### Components

- `components/cards/card-filters.tsx` — `COLORS` / `TYPES` / `RARITIES` consts
  become `game.colors` / `game.cardTypes` / `game.rarities`.
- `components/cards/card-panel.tsx` — the four hardcoded stat blocks become a
  loop over `game.stats` reading `attributes`; `COLOR_STYLES` comes from
  `game.colors`.
- `lib/utils.ts` — `getCardImageUrl()` currently hardcodes
  `images.digimoncard.io`; it moves behind `game.imageUrl(card)`.
- `next.config.ts` — add the Cyberpunk image host to `remotePatterns`
  (determined while seeding; both digimon hosts stay).
- `components/needs/*` — with `hasPrices: false`, hide `est_cost` columns and
  buy-list money totals so the page reads as a missing-cards checklist instead of
  showing "—" in every price cell. Card counts and the copy/export buy list still
  work.
- `components/collection/set-checklist.tsx` and `app/collection/add/page.tsx` —
  scoped by the game-filtered expansion list; no other change.
- `components/decks/*` — validation comes from `game.deck.validate()`; zone
  labels from `game.deck.zones`.
- `components/nav/footer.tsx` and `app/legal/page.tsx` — add a WeirdCo /
  CD PROJEKT RED trademark disclaimer alongside the Bandai one, plus attribution
  for the Cyberpunk data source.

## Ingestion

### Seed file

`scripts/data/cyberpunk_cards.json` — versioned in the repo, one object per
printing:

```json
{
  "card_number": "wtnc-006",
  "name": "6th Street Recruits",
  "expansion": "wtnc",
  "card_type": "Unit",
  "color": "Red",
  "rarity": "Common",
  "image_url": "https://.../wtnc-006.png",
  "max_copies": 3,
  "base_card_number": "wtnc-006",
  "variant_name": "Regular",
  "attributes": { "cost": 2, "power": 3, "ram": 1, "tags": ["Ganger"] }
}
```

Alternate arts (Iconic Rare, Nova Rare) get their **own** `card_number` from the
printed collector number, with `base_card_number` pointing at the standard
printing and `variant_name` naming the treatment. This is the same model as the
queued Digimon alt-art rework, so Cyberpunk validates that design on fresh data
before Digimon is migrated onto it.

Sets to seed: `wtnc` (Welcome to Night City), `ths` (The Heist starter),
`eps` (Embracing Power starter), `alpha`, `promo`.

### Importer

`scripts/import_game_cards.py --game cyberpunk --file scripts/data/cyberpunk_cards.json`

- Upserts into `cards`, `card_expansions`, and `expansion_metadata`; idempotent,
  so a corrected seed file simply overwrites.
- **Aborts on a cross-game `card_number` collision** — that guard is what makes
  the shared-PK decision safe, so it is a hard failure with a non-zero exit, not
  a warning.
- Validates every row against the registry's card types, colours, and rarities
  before writing anything, and reports all violations at once.
- `--dry-run` prints the planned insert/update counts and validation results
  without writing.
- Reuses the pagination and periodic client-recreation patterns from
  `sync_cards.py` (the 1000-row and ~10K-HTTP/2-request limits in
  `learnings.md`).

The initial seed is hand-assembled from the official database at
`cyberpunktcg.com/cards` as the authority, cross-checked against ripperdeck.gg
for stats. Separately, email `max@netdeck.gg` about developer API access ahead of
the October launch; if granted, a `sync_cyberpunk.py` regenerates the JSON and
the importer is unchanged.

## Rollout

Four phases, ordered so the risky change ships behind a no-op.

1. **Plumbing, Digimon only.** Migration `010`, registry, game context, switcher,
   hook and component changes — with `cyberpunk` present in `games` but holding
   zero cards. **Acceptance: the app looks and behaves identically.** Any visible
   change is a regression, which makes this the cheapest phase to verify.
2. **Register Cyberpunk.** Seed JSON, importer, image host, filters, panel stats.
   Collection, database, and needs work for Cyberpunk.
3. **Deck rules.** Legend zone, 40–50 range, 3-copy limit, unique Legend names.
4. **Later.** RAM colour-budget validation; migration `011` dropping the legacy
   stat columns; prices if Cardtrader lists the game or Cardmarket's API reopens.

## Testing

Following the existing `lib/*.test.ts` vitest layout:

- **Registry validity** — every `stats.key` is a string, no duplicate game ids,
  every `zones.cardTypes` entry exists in that game's `cardTypes`, `mainMin <= mainMax`.
- **Deck validation, both rule sets** — Digimon: 49/50/51 main, 6 eggs, 5 copies.
  Cyberpunk: 2 Legends, 3 Legends sharing a name, 4 Legends, 39/40/50/51 main
  excluding Legends, 4 copies of a Unit.
- **Importer** — cross-game collision aborts with a non-zero exit; unknown card
  type or rarity fails validation; re-running the same file is a no-op.
- **Regression** — `need-utils` and `sell-utils` maths unchanged for Digimon
  fixtures under the game filter; `attributes`-backed stat rendering matches the
  previous column-backed output for a Digimon card.
- **Game context** — `isHydrated` is false before the `localStorage` read, and an
  unknown stored game id falls back to `digimon` rather than crashing.

## Risks

- **Seed accuracy.** The set isn't fully revealed until October and community
  collector numbers may not match final print. Mitigation: seed revealed cards
  only, never guess numbers, and keep the importer upserting so a corrected file
  overwrites. If a card *number* changes between spoiler and print, that is
  manual cleanup — `collection` rows keyed to the old number would need remapping.
- **JSONB loses compile-time safety.** `attributes` is `Record<string, unknown>`
  in TypeScript. Mitigation: only registry-declared `stats` keys are ever
  rendered, and the importer validates shape at write time.
- **Hydration flash.** Addressed by `isHydrated` gating, but every consumer must
  respect it or the bug reappears per-component.
- **NetDeck API access is unknown.** The design does not depend on it; it is an
  upgrade path, not a prerequisite.
- **Image hotlinking.** Cyberpunk art would be hotlinked from a third-party CDN,
  the same posture as digimoncard.io today, with attribution added to the footer
  and legal page.

## Out of scope

- Cyberpunk price, sell, and surplus features (no automatable feed).
- RAM colour-budget deck validation (phase 4).
- Migrating Digimon onto the alt-art-as-separate-entity model.
- A third game, and per-game theming or accent colours.
- Changing routes to include the game (`/cyberpunk/collection`) — rejected in
  favour of the global switcher.
