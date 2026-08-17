# Multi-Game Support (Cyberpunk TCG) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn CardBoard into a multi-game app and add Cyberpunk TCG as the second game, with collection tracking, missing-card lists, and deck building.

**Architecture:** One shared `cards` table gains a `game` column and a JSONB `attributes` column holding the stats that differ between games. All per-game behaviour — card types, colours, rarities, which stats to display, deck rules, image fallbacks, card-number normalization — lives in a TypeScript game registry under `lib/games/`. A React context holds the active game, persisted to `localStorage`, and every query filters by it. Routes are unchanged.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Supabase (Postgres + RLS), TanStack Query v5, Lucide React, vitest (node environment), Python 3 + supabase-py for data sync.

**Spec:** `docs/superpowers/specs/2026-08-17-multi-game-support-design.md`

## Global Constraints

- **Migrations are applied by hand.** There is no `supabase/config.toml` and no linked CLI. SQL is pasted into the Supabase dashboard SQL editor. Never assume `supabase db push` works.
- **Supabase caps every query at 1000 rows.** Any query that can exceed it must paginate with `.range(from, from + pageSize - 1)` in a loop. Existing loops must be preserved when adding filters.
- **`card_prices` and `card_price_history` have no foreign key to `cards`** (dropped by `007_relax_price_fk.sql`). `cards!inner(...)` embeds are impossible on those two tables.
- **vitest runs `environment: "node"` with `include: ["**/*.test.ts"]`.** No jsdom, no React Testing Library. Do not write component or hook tests, and do not add test dependencies. Test pure functions only.
- **Accent colour `--accent` (teal) is reserved** for CTAs, links, and active main-nav states. The game switcher uses `--elevated` with `--border-light`, never accent fill.
- **Never use emojis as UI elements.** Lucide React icons throughout.
- **Border radius:** `rounded-lg` for inputs and buttons, `rounded-xl` for cards and containers.
- **Digimon behaviour must not change** until Task 18. Phase 1's acceptance criterion is that the app looks and behaves identically.
- **Run `npm run lint` and `npx tsc --noEmit` before every commit.** Both must be clean.
- Commit messages end with: `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`

## File Structure

**Created:**

| Path | Responsibility |
|---|---|
| `supabase/migrations/010_multi_game.sql` | `games` table, `game` + `attributes` columns, backfill, deck/card game trigger |
| `lib/games/types.ts` | `GameId`, `GameConfig`, `DeckRules`, `DeckZone`, `DeckIssue`, `StatField`, `DeckCardWithCard` |
| `lib/games/validate-deck.ts` | Generic declarative deck validator shared by both games |
| `lib/games/validate-deck.test.ts` | Validator tests for both rule sets |
| `lib/games/digimon.ts` | Digimon `GameConfig` |
| `lib/games/cyberpunk.ts` | Cyberpunk `GameConfig` |
| `lib/games/index.ts` | `GAMES` map, `getGame`, `resolveGameId`, re-exports |
| `lib/games/registry.test.ts` | Registry invariants and `resolveGameId` |
| `contexts/game-context.tsx` | Active-game state, `localStorage` persistence, query invalidation |
| `components/nav/game-switcher.tsx` | The dropdown itself, used by both navs |
| `components/decks/deck-validation.tsx` | Renders `DeckIssue[]` on the deck detail page |
| `scripts/data/cyberpunk_cards.json` | Versioned Cyberpunk card seed |
| `scripts/import_game_cards.py` | Validating, idempotent seed importer with collision guard |

**Modified:** `lib/types.ts`, `lib/utils.ts`, `lib/import-parser.ts`, all of `lib/hooks/`, `app/providers.tsx`, `components/nav/{app-shell,top-nav-bar,bottom-tab-bar,footer}.tsx`, `components/cards/{card-filters,card-panel,card-image}.tsx`, `components/decks/deck-form.tsx`, `app/decks/[id]/page.tsx`, `app/needs/page.tsx`, `app/sell/page.tsx`, `app/legal/page.tsx`, `next.config.ts`, and seven `lib/*.test.ts` fixture files.

---

# Phase 1 — Plumbing (no visible change)

### Task 1: Migration 010 — game column, attributes, trigger

**Files:**
- Create: `supabase/migrations/010_multi_game.sql`

**Interfaces:**
- Consumes: nothing.
- Produces: `public.games(id, name, short_name, sort_order)` with rows `digimon` and `cyberpunk`; `cards.game text not null`, `cards.attributes jsonb not null`; `decks.game`, `expansion_metadata.game`; trigger `trg_deck_cards_game`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/010_multi_game.sql`:

```sql
-- ============================================
-- Multi-game support
-- ============================================
-- Adds a game dimension to the shared cards table rather than splitting
-- cards per game: collection, deck_cards, wishlist, sell_list and the price
-- tables all key off cards.card_number and inherit the game transitively.
--
-- See docs/superpowers/specs/2026-08-17-multi-game-support-design.md

create table public.games (
  id text primary key,
  name text not null,
  short_name text not null,
  sort_order integer not null default 0
);

alter table public.games enable row level security;

create policy "Games are publicly readable"
  on public.games for select
  using (true);

insert into public.games (id, name, short_name, sort_order) values
  ('digimon',   'Digimon Card Game',           'Digimon',   1),
  ('cyberpunk', 'Cyberpunk Trading Card Game', 'Cyberpunk', 2);

-- The 'digimon' default is what makes this a one-shot migration: every
-- existing card, deck and expansion row backfills correctly with no script.
alter table public.cards
  add column game text not null default 'digimon' references public.games(id),
  add column attributes jsonb not null default '{}'::jsonb;

alter table public.decks
  add column game text not null default 'digimon' references public.games(id);

alter table public.expansion_metadata
  add column game text not null default 'digimon' references public.games(id);

-- Backfill Digimon stats into attributes. Nulls are stripped rather than
-- stored as JSON nulls, so `attributes ? 'dp'` means "this card has a DP".
-- The legacy columns stay until migration 011 confirms parity.
update public.cards
set attributes = jsonb_strip_nulls(jsonb_build_object(
  'level',          level,
  'play_cost',      play_cost,
  'dp',             dp,
  'evolution_cost', evolution_cost
));

create index idx_cards_game on public.cards (game);
create index idx_decks_game on public.decks (game);

-- A deck's cards must belong to the deck's game. An app-level check can be
-- bypassed by a direct API call, so the constraint lives here. security
-- definer with a pinned search_path so RLS visibility cannot defeat it.
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

- [ ] **Step 2: Apply it**

Paste the whole file into the Supabase dashboard SQL editor and run it. There is no CLI in this project.

- [ ] **Step 3: Verify the backfill**

Run these four queries in the SQL editor:

```sql
-- 1. Every card is digimon, none orphaned.
select game, count(*) from public.cards group by game;

-- 2. attributes matches the legacy columns for every row (expect 0).
select count(*) from public.cards
where (attributes->>'dp') is distinct from (case when dp is null then null else dp::text end)
   or (attributes->>'level') is distinct from (case when level is null then null else level::text end)
   or (attributes->>'play_cost') is distinct from (case when play_cost is null then null else play_cost::text end)
   or (attributes->>'evolution_cost') is distinct from (case when evolution_cost is null then null else evolution_cost::text end);

-- 3. Decks and expansions backfilled.
select game, count(*) from public.decks group by game;
select game, count(*) from public.expansion_metadata group by game;

-- 4. Both games registered.
select * from public.games order by sort_order;
```

Expected: query 1 returns one row `digimon`; query 2 returns `0`; query 3 returns `digimon` only; query 4 returns two rows.

- [ ] **Step 4: Verify the trigger rejects a mismatch**

```sql
-- Should raise: card wtnc-test does not belong to the deck's game
begin;
insert into public.cards (card_number, name, expansion, card_type, color, game)
  values ('wtnc-test', 'Trigger Probe', 'wtnc', 'Unit', 'Red', 'cyberpunk');
-- Replace <deck-id> with any existing digimon deck id from: select id from public.decks limit 1;
insert into public.deck_cards (deck_id, card_number, quantity)
  values ('<deck-id>', 'wtnc-test', 1);
rollback;
```

Expected: the second insert fails with the exception message. `rollback` discards the probe row either way.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/010_multi_game.sql
git commit -m "feat: add game dimension to cards, decks and expansions

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Types and test fixtures

**Files:**
- Modify: `lib/types.ts:1-18` (`Card`), `lib/types.ts:27-34` (`Deck`)
- Modify: `lib/need-utils.test.ts`, `lib/buy-list-text.test.ts`, `lib/collection-entry.test.ts`, `lib/export-csv.test.ts`, `lib/sell-share-payload.test.ts`, `lib/share-text.test.ts`

**Interfaces:**
- Consumes: Task 1's columns.
- Produces: `Card.game: GameId`, `Card.attributes: Record<string, unknown>`, `Deck.game: GameId`. Every later task relies on these fields existing.

- [ ] **Step 1: Add the fields to the types**

In `lib/types.ts`, add the import and the three fields:

```ts
import type { GameId } from "@/lib/games/types";

export interface Card {
  card_number: string;
  name: string;
  expansion: string;
  card_type: string;
  color: string;
  rarity: string | null;
  dp: number | null;
  play_cost: number | null;
  level: number | null;
  evolution_cost: number | null;
  image_url: string | null;
  pretty_url: string | null;
  max_copies: number;
  last_updated: string;
  base_card_number: string;
  variant_name: string;
  game: GameId;
  attributes: Record<string, unknown>;
}
```

And on `Deck`, after `user_id`:

```ts
export interface Deck {
  id: string;
  user_id: string;
  game: GameId;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}
```

`GameId` does not exist yet — Task 3 creates `lib/games/types.ts`. Do Task 3's Step 1 first if you are running tasks strictly in order, or accept a transient unresolved import until Task 3 lands. The commit at the end of this task must typecheck, so **Task 2 and Task 3 may be committed together if you hit that ordering**.

- [ ] **Step 2: Run the suite to see the fixtures break**

Run: `npm test`
Expected: FAIL. Multiple files error with `Property 'game' is missing in type ... but required in type 'Card'` (and the same for `attributes` and `Deck.game`).

- [ ] **Step 3: Update the `makeCard` helper in `lib/need-utils.test.ts`**

Add the two fields to the returned object:

```ts
function makeCard(
  card_number: string,
  name: string,
  variant_name = "Regular",
  base_card_number = card_number,
): Card {
  return {
    card_number,
    name,
    expansion: "BT09",
    card_type: "Digimon",
    color: "Red",
    rarity: "C",
    dp: null,
    play_cost: null,
    level: null,
    evolution_cost: null,
    image_url: null,
    pretty_url: null,
    max_copies: 4,
    last_updated: "",
    base_card_number,
    variant_name,
    game: "digimon",
    attributes: {},
  };
}
```

And `makeDeck`:

```ts
function makeDeck(id: string, updated_at: string): Deck {
  return { id, user_id: "u", game: "digimon", name: `Deck ${id}`, description: null, created_at: "", updated_at };
}
```

- [ ] **Step 4: Apply the same two additions to every other fixture**

Search for card and deck literals and add `game: "digimon"` plus `attributes: {}` (cards) or `game: "digimon"` (decks):

Run: `grep -ln "variant_name\|user_id: \"u\"" lib/*.test.ts`

Fix each hit in `lib/buy-list-text.test.ts`, `lib/collection-entry.test.ts`, `lib/export-csv.test.ts`, `lib/sell-share-payload.test.ts`, `lib/share-text.test.ts`. Do not change any assertion — only the fixture builders.

- [ ] **Step 5: Run the suite green**

Run: `npm test`
Expected: PASS, same test count as before the change.

This green suite **is** the spec's regression requirement for `need-utils` and `sell-utils`: their existing tests now run against fixtures carrying `game: "digimon"` and `attributes: {}`, so any change in the needs or sell maths under the new fields shows up here. Do not weaken an assertion to get green — if one fails, the type change broke behaviour.

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/*.test.ts
git commit -m "feat: add game and attributes to the Card and Deck types

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Game registry types, Digimon config, `resolveGameId`

**Files:**
- Create: `lib/games/types.ts`, `lib/games/digimon.ts`, `lib/games/index.ts`
- Test: `lib/games/registry.test.ts`

**Interfaces:**
- Consumes: `Card` from `lib/types.ts`.
- Produces:
  - `type GameId = "digimon" | "cyberpunk"`
  - `GAME_IDS: readonly GameId[]`
  - `interface GameConfig` with `id, name, shortName, cardTypes, colors, rarities, stats, deck, hasPrices, fallbackImageUrl(cardNumber), normalizeCardNumber(raw)`
  - `interface DeckRules { mainMin, mainMax, copyLimit, zones, validate(cards) }`
  - `interface DeckZone { key, label, cardTypes, min, max, uniqueNames? }`
  - `interface DeckIssue { severity: "error" | "warning", message: string }`
  - `type DeckCardWithCard = { card: Card; quantity: number }`
  - `GAMES: Record<GameId, GameConfig>`, `getGame(id: GameId): GameConfig`, `resolveGameId(stored: string | null | undefined): GameId`

- [ ] **Step 1: Write the failing test**

Create `lib/games/registry.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { GAMES, GAME_IDS, getGame, resolveGameId } from "@/lib/games";

describe("game registry", () => {
  it("registers every declared game id exactly once", () => {
    expect(Object.keys(GAMES).sort()).toEqual([...GAME_IDS].sort());
    for (const id of GAME_IDS) {
      expect(GAMES[id].id).toBe(id);
    }
  });

  it("gives every game a non-empty name, shortName, card types and rarities", () => {
    for (const id of GAME_IDS) {
      const g = GAMES[id];
      expect(g.name.length).toBeGreaterThan(0);
      expect(g.shortName.length).toBeGreaterThan(0);
      expect(g.cardTypes.length).toBeGreaterThan(0);
      expect(g.rarities.length).toBeGreaterThan(0);
      expect(g.colors.length).toBeGreaterThan(0);
    }
  });

  it("only routes deck zones through card types the game declares", () => {
    for (const id of GAME_IDS) {
      const declared = GAMES[id].cardTypes.map((t) => t.label);
      for (const zone of GAMES[id].deck.zones) {
        for (const type of zone.cardTypes) {
          expect(declared).toContain(type);
        }
      }
    }
  });

  it("keeps deck size bounds coherent", () => {
    for (const id of GAME_IDS) {
      const { mainMin, mainMax, copyLimit } = GAMES[id].deck;
      expect(mainMin).toBeLessThanOrEqual(mainMax);
      expect(copyLimit).toBeGreaterThan(0);
    }
  });

  it("returns the config by id", () => {
    expect(getGame("digimon").shortName).toBe("Digimon");
  });
});

describe("resolveGameId", () => {
  it("round trips a valid stored id", () => {
    expect(resolveGameId("cyberpunk")).toBe("cyberpunk");
  });

  it("falls back to digimon for null, empty and unknown ids", () => {
    expect(resolveGameId(null)).toBe("digimon");
    expect(resolveGameId(undefined)).toBe("digimon");
    expect(resolveGameId("")).toBe("digimon");
    expect(resolveGameId("pokemon")).toBe("digimon");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run lib/games/registry.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/games"`.

- [ ] **Step 3: Write `lib/games/types.ts`**

```ts
import type { LucideIcon } from "lucide-react";
import type { Card } from "@/lib/types";

export const GAME_IDS = ["digimon", "cyberpunk"] as const;
export type GameId = (typeof GAME_IDS)[number];

/** A stat rendered in the card panel, read out of cards.attributes. */
export interface StatField {
  key: string;
  label: string;
  /** Rendered immediately before the value, e.g. "Lv." for Digimon level. */
  prefix?: string;
}

export interface ColorStyle {
  label: string;
  color: string;
  bg: string;
  border: string;
}

/** A deck region counted separately from the main deck, e.g. Digi-Eggs, Legends. */
export interface DeckZone {
  key: string;
  label: string;
  cardTypes: string[];
  min: number;
  max: number;
  /** When set, each card in the zone must have a distinct name and one copy. */
  uniqueNames?: boolean;
}

export interface DeckIssue {
  severity: "error" | "warning";
  message: string;
}

export type DeckCardWithCard = { card: Card; quantity: number };

export interface DeckRules {
  /** Bounds on cards NOT routed into a zone. */
  mainMin: number;
  mainMax: number;
  /** Copy ceiling when a card carries no stricter max_copies. */
  copyLimit: number;
  zones: DeckZone[];
  validate(cards: DeckCardWithCard[]): DeckIssue[];
}

export interface GameConfig {
  id: GameId;
  name: string;
  shortName: string;
  cardTypes: { label: string; icon: LucideIcon }[];
  colors: ColorStyle[];
  rarities: string[];
  stats: StatField[];
  deck: DeckRules;
  hasPrices: boolean;
  /** "" when the game has no CDN pattern and relies on a stored image_url. */
  fallbackImageUrl(cardNumber: string): string;
  normalizeCardNumber(raw: string): string;
}
```

- [ ] **Step 4: Write `lib/games/digimon.ts`**

Colours and types are lifted verbatim from `components/cards/card-filters.tsx:11-28` and `components/cards/card-panel.tsx:20-28` so behaviour is unchanged.

```ts
import { Swords, User, Zap, Egg } from "lucide-react";
import { getBaseCardNumber } from "@/lib/utils";
import { validateDeck } from "@/lib/games/validate-deck";
import type { GameConfig } from "@/lib/games/types";

const DECK_RULES = {
  mainMin: 50,
  mainMax: 50,
  copyLimit: 4,
  zones: [
    { key: "egg", label: "Digi-Egg", cardTypes: ["Digi-Egg"], min: 0, max: 5 },
  ],
};

export const digimon: GameConfig = {
  id: "digimon",
  name: "Digimon Card Game",
  shortName: "Digimon",
  cardTypes: [
    { label: "Digimon", icon: Swords },
    { label: "Tamer", icon: User },
    { label: "Option", icon: Zap },
    { label: "Digi-Egg", icon: Egg },
  ],
  colors: [
    { label: "Red", color: "var(--red)", bg: "var(--red-translucent)", border: "var(--red-border)" },
    { label: "Blue", color: "var(--blue)", bg: "var(--blue-translucent)", border: "var(--blue-border)" },
    { label: "Yellow", color: "var(--yellow)", bg: "var(--yellow-translucent)", border: "var(--yellow-border)" },
    { label: "Green", color: "var(--green)", bg: "var(--green-translucent)", border: "var(--green-border)" },
    { label: "Black", color: "var(--text-secondary)", bg: "var(--elevated)", border: "var(--border-light)" },
    { label: "Purple", color: "var(--purple)", bg: "var(--purple-translucent)", border: "var(--purple-border)" },
    { label: "White", color: "var(--text-primary)", bg: "var(--elevated)", border: "var(--border-light)" },
  ],
  rarities: ["Common", "Uncommon", "Rare", "Super Rare", "Secret Rare"],
  stats: [
    { key: "level", label: "Level", prefix: "Lv." },
    { key: "play_cost", label: "Cost" },
    { key: "dp", label: "DP" },
    { key: "evolution_cost", label: "Evo" },
  ],
  deck: { ...DECK_RULES, validate: (cards) => validateDeck(DECK_RULES, cards) },
  hasPrices: true,
  fallbackImageUrl: (cardNumber) =>
    `https://images.digimoncard.io/images/cards/${getBaseCardNumber(cardNumber)}.jpg`,
  normalizeCardNumber: (raw) => raw.toUpperCase(),
};
```

- [ ] **Step 5: Write `lib/games/index.ts`**

Cyberpunk is registered in Task 12. Until then `GAMES` holds one entry and `GAME_IDS` holds two, so the first registry test would fail — therefore this file registers only Digimon **and** narrows `GAME_IDS` usage through `REGISTERED_GAME_IDS`:

Note the import line takes **types only** — `GAME_IDS` reaches consumers through
the `export *`, and importing it here as well would produce a duplicate export.

```ts
import { digimon } from "@/lib/games/digimon";
import type { GameConfig, GameId } from "@/lib/games/types";

export * from "@/lib/games/types";

/**
 * Games with a registered config. Cyberpunk joins in phase 2; until then it
 * exists in the database's games table but has no cards and no config.
 */
export const GAMES: Record<GameId, GameConfig> = {
  digimon,
  // cyberpunk: added in phase 2
} as Record<GameId, GameConfig>;

export const REGISTERED_GAME_IDS = Object.keys(GAMES) as GameId[];

export function getGame(id: GameId): GameConfig {
  return GAMES[id];
}

/** Coerces an untrusted stored value into a registered game id. */
export function resolveGameId(stored: string | null | undefined): GameId {
  return REGISTERED_GAME_IDS.includes(stored as GameId) ? (stored as GameId) : "digimon";
}
```

- [ ] **Step 6: Point the registry test at registered games**

In `lib/games/registry.test.ts`, replace every `GAME_IDS` with `REGISTERED_GAME_IDS` and update the import line to:

```ts
import { GAMES, REGISTERED_GAME_IDS, getGame, resolveGameId } from "@/lib/games";
```

Then change the "round trips a valid stored id" case, since `cyberpunk` is not registered yet:

```ts
  it("round trips a valid stored id", () => {
    expect(resolveGameId("digimon")).toBe("digimon");
  });
```

Task 12 restores the `cyberpunk` case.

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx vitest run lib/games/registry.test.ts`
Expected: PASS (7 tests — 5 in the registry block, 2 in the `resolveGameId` block). It will still fail on the missing `validate-deck` import — that is Task 4. If you are running tasks in order, complete Task 4 Step 3 before expecting green, and commit Tasks 3 and 4 together.

- [ ] **Step 8: Commit**

```bash
git add lib/games/types.ts lib/games/digimon.ts lib/games/index.ts lib/games/registry.test.ts
git commit -m "feat: add the game registry with the Digimon config

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Generic deck validator

**Files:**
- Create: `lib/games/validate-deck.ts`
- Test: `lib/games/validate-deck.test.ts`

**Interfaces:**
- Consumes: `DeckRules`, `DeckZone`, `DeckIssue`, `DeckCardWithCard` from `lib/games/types.ts`.
- Produces: `validateDeck(rules: Omit<DeckRules, "validate">, cards: DeckCardWithCard[]): DeckIssue[]`. Both game configs call it.

- [ ] **Step 1: Write the failing test**

Create `lib/games/validate-deck.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { validateDeck } from "@/lib/games/validate-deck";
import type { DeckCardWithCard } from "@/lib/games/types";
import type { Card } from "@/lib/types";

function card(card_number: string, card_type: string, name = card_number, max_copies = 4): Card {
  return {
    card_number, name, expansion: "X", card_type, color: "Red", rarity: null,
    dp: null, play_cost: null, level: null, evolution_cost: null,
    image_url: null, pretty_url: null, max_copies, last_updated: "",
    base_card_number: card_number, variant_name: "Regular",
    game: "digimon", attributes: {},
  };
}

/** n distinct main-deck cards, `each` copies apiece. */
function main(n: number, each = 1, type = "Digimon", max_copies = 4): DeckCardWithCard[] {
  return Array.from({ length: n }, (_, i) => ({
    card: card(`M-${i}`, type, `Main ${i}`, max_copies),
    quantity: each,
  }));
}

const DIGIMON = {
  mainMin: 50, mainMax: 50, copyLimit: 4,
  zones: [{ key: "egg", label: "Digi-Egg", cardTypes: ["Digi-Egg"], min: 0, max: 5 }],
};

const CYBERPUNK = {
  mainMin: 40, mainMax: 50, copyLimit: 3,
  zones: [{ key: "legend", label: "Legends", cardTypes: ["Legend"], min: 3, max: 3, uniqueNames: true }],
};

describe("validateDeck — Digimon rules", () => {
  it("accepts 50 main cards with 5 eggs", () => {
    const deck = [
      ...main(13, 4),                                              // 52 — trim below
      { card: card("E-1", "Digi-Egg", "Egg 1"), quantity: 5 },
    ];
    // 12 cards x 4 = 48, plus one card x 2 = 50
    // Eggs split across two cards (4 + 1) so no single card exceeds the copyLimit of 4
    // while the zone still totals 5.
    const exact = [...main(12, 4), { card: card("M-X", "Digimon", "Main X"), quantity: 2 },
      { card: card("E-1", "Digi-Egg", "Egg 1"), quantity: 4 },
      { card: card("E-2", "Digi-Egg", "Egg 2"), quantity: 1 }];
    expect(validateDeck(DIGIMON, exact)).toEqual([]);
    expect(validateDeck(DIGIMON, deck).length).toBeGreaterThan(0);
  });

  it("rejects 49 and 51 main cards", () => {
    const short = [...main(12, 4), { card: card("M-X", "Digimon", "Main X"), quantity: 1 }];
    const long = [...main(12, 4), { card: card("M-X", "Digimon", "Main X"), quantity: 3 }];
    expect(validateDeck(DIGIMON, short).some((i) => i.message.includes("49"))).toBe(true);
    expect(validateDeck(DIGIMON, long).some((i) => i.message.includes("51"))).toBe(true);
  });

  it("rejects a sixth egg", () => {
    const deck = [...main(12, 4), { card: card("M-X", "Digimon", "Main X"), quantity: 2 },
      { card: card("E-1", "Digi-Egg", "Egg 1"), quantity: 6 }];
    expect(validateDeck(DIGIMON, deck).some((i) => i.message.includes("Digi-Egg"))).toBe(true);
  });

  it("rejects a fifth copy of one card", () => {
    const deck = [...main(11, 4), { card: card("M-X", "Digimon", "Main X"), quantity: 5 },
      { card: card("M-Y", "Digimon", "Main Y"), quantity: 1 }];
    expect(validateDeck(DIGIMON, deck).some((i) => i.message.includes("Main X"))).toBe(true);
  });
});

describe("validateDeck — Cyberpunk rules", () => {
  const legend = (n: number, name = `Legend ${n}`) => ({ card: card(`L-${n}`, "Legend", name, 1), quantity: 1 });
  const threeLegends = [legend(1), legend(2), legend(3)];

  it("accepts 3 unique legends with 40 main cards", () => {
    const deck = [...threeLegends, ...main(40, 1, "Unit", 3)];
    expect(validateDeck(CYBERPUNK, deck)).toEqual([]);
  });

  it("accepts 50 main cards", () => {
    const deck = [...threeLegends, ...main(50, 1, "Unit", 3)];
    expect(validateDeck(CYBERPUNK, deck)).toEqual([]);
  });

  it("rejects 2 legends and 4 legends", () => {
    expect(validateDeck(CYBERPUNK, [legend(1), legend(2), ...main(40, 1, "Unit", 3)])
      .some((i) => i.message.includes("Legends"))).toBe(true);
    expect(validateDeck(CYBERPUNK, [...threeLegends, legend(4), ...main(40, 1, "Unit", 3)])
      .some((i) => i.message.includes("Legends"))).toBe(true);
  });

  it("rejects two legends sharing a name", () => {
    const deck = [legend(1, "V"), legend(2, "V"), legend(3), ...main(40, 1, "Unit", 3)];
    expect(validateDeck(CYBERPUNK, deck).some((i) => i.message.includes("unique"))).toBe(true);
  });

  it("rejects 39 and 51 main cards, counting legends separately", () => {
    expect(validateDeck(CYBERPUNK, [...threeLegends, ...main(39, 1, "Unit", 3)])
      .some((i) => i.message.includes("39"))).toBe(true);
    expect(validateDeck(CYBERPUNK, [...threeLegends, ...main(51, 1, "Unit", 3)])
      .some((i) => i.message.includes("51"))).toBe(true);
  });

  it("rejects a fourth copy of a unit", () => {
    const deck = [...threeLegends, ...main(37, 1, "Unit", 3),
      { card: card("M-Z", "Unit", "Unit Z", 3), quantity: 4 }];
    expect(validateDeck(CYBERPUNK, deck).some((i) => i.message.includes("Unit Z"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run lib/games/validate-deck.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/games/validate-deck"`.

- [ ] **Step 3: Write the implementation**

Create `lib/games/validate-deck.ts`:

```ts
import type { DeckCardWithCard, DeckIssue, DeckRules } from "@/lib/games/types";

type Rules = Omit<DeckRules, "validate">;

/**
 * Validates a deck against a game's declarative rules.
 *
 * Cards whose card_type belongs to a zone are counted against that zone only;
 * everything else counts toward the main deck. A card's own max_copies tightens
 * the game's copyLimit (Cyberpunk Legends carry max_copies = 1).
 */
export function validateDeck(rules: Rules, cards: DeckCardWithCard[]): DeckIssue[] {
  const issues: DeckIssue[] = [];

  const zoneOf = new Map<string, string>();
  for (const zone of rules.zones) {
    for (const type of zone.cardTypes) zoneOf.set(type, zone.key);
  }

  let mainCount = 0;
  const byZone = new Map<string, DeckCardWithCard[]>();
  for (const entry of cards) {
    const zoneKey = zoneOf.get(entry.card.card_type);
    if (zoneKey === undefined) {
      mainCount += entry.quantity;
    } else {
      const bucket = byZone.get(zoneKey) ?? [];
      bucket.push(entry);
      byZone.set(zoneKey, bucket);
    }
  }

  if (mainCount < rules.mainMin) {
    issues.push({
      severity: "error",
      message: `Deck has ${mainCount} cards, minimum is ${rules.mainMin}.`,
    });
  } else if (mainCount > rules.mainMax) {
    issues.push({
      severity: "error",
      message: `Deck has ${mainCount} cards, maximum is ${rules.mainMax}.`,
    });
  }

  for (const zone of rules.zones) {
    const entries = byZone.get(zone.key) ?? [];
    const count = entries.reduce((sum, e) => sum + e.quantity, 0);
    if (count < zone.min || count > zone.max) {
      const bound = zone.min === zone.max ? `exactly ${zone.min}` : `${zone.min}–${zone.max}`;
      issues.push({
        severity: "error",
        message: `${zone.label}: ${count} cards, must be ${bound}.`,
      });
    }
    if (zone.uniqueNames) {
      const names = entries.flatMap((e) => Array(e.quantity).fill(e.card.name) as string[]);
      const duplicated = [...new Set(names.filter((n, i) => names.indexOf(n) !== i))];
      for (const name of duplicated) {
        issues.push({
          severity: "error",
          message: `${zone.label} must have unique names — "${name}" appears more than once.`,
        });
      }
    }
  }

  for (const entry of cards) {
    const limit = Math.min(entry.card.max_copies, rules.copyLimit);
    if (entry.quantity > limit) {
      issues.push({
        severity: "error",
        message: `"${entry.card.name}": ${entry.quantity} copies, maximum is ${limit}.`,
      });
    }
  }

  return issues;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/games/`
Expected: PASS — `validate-deck.test.ts` (10 tests) and `registry.test.ts` (7 tests).

Run: `npm test`
Expected: PASS, whole suite.

- [ ] **Step 5: Commit**

```bash
git add lib/games/validate-deck.ts lib/games/validate-deck.test.ts
git commit -m "feat: add the declarative deck validator

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Game context

**Files:**
- Create: `contexts/game-context.tsx`
- Modify: `app/providers.tsx:26-32`

**Interfaces:**
- Consumes: `GAMES`, `resolveGameId`, `GameId`, `GameConfig` from `lib/games`.
- Produces: `useGame(): { gameId: GameId; game: GameConfig; setGameId(id: GameId): void; isHydrated: boolean }`, and `GameProvider`. Every later task calls `useGame()`.

- [ ] **Step 1: Write the context**

Create `contexts/game-context.tsx`:

```tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { GAMES, resolveGameId, type GameConfig, type GameId } from "@/lib/games";

const STORAGE_KEY = "cardboard.game";

interface GameContextValue {
  gameId: GameId;
  game: GameConfig;
  setGameId: (id: GameId) => void;
  /** False until the localStorage read lands. Consumers must not render a
   *  game-identifying label before this flips, or the wrong game flashes. */
  isHydrated: boolean;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ gameId: GameId; isHydrated: boolean }>({
    gameId: "digimon",
    isHydrated: false,
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({
      gameId: resolveGameId(window.localStorage.getItem(STORAGE_KEY)),
      isHydrated: true,
    });
  }, []);

  const setGameId = useCallback(
    (id: GameId) => {
      window.localStorage.setItem(STORAGE_KEY, id);
      setState((prev) => ({ ...prev, gameId: id }));
      // Every cached query is keyed by game, so a blanket invalidation is
      // correct and cheap — non-matching keys refetch lazily on next mount.
      queryClient.invalidateQueries();
    },
    [queryClient],
  );

  return (
    <GameContext.Provider value={{ gameId: state.gameId, game: GAMES[state.gameId], setGameId, isHydrated: state.isHydrated }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within a GameProvider");
  return ctx;
}
```

- [ ] **Step 2: Mount it inside the query client provider**

Replace the body of `app/providers.tsx`'s default export:

```tsx
export default function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <GameProvider>{children}</GameProvider>
    </QueryClientProvider>
  );
}
```

Add the import at the top: `import { GameProvider } from "@/contexts/game-context";`

The nesting order matters — `GameProvider` calls `useQueryClient()`, so it must be a descendant of `QueryClientProvider`.

**On the `eslint-disable` in the effect:** `eslint-config-next` 16 enables `react-hooks/set-state-in-effect`, and seeding state from `localStorage` trips it no matter how the state is shaped — one `useState` or two, batched or not. The suppression is doing the work, and it follows the existing precedent at `components/sell/share-modal.tsx:37`, which suppresses the same rule for the same reason (state that cannot be read synchronously at render/SSR time). `useSyncExternalStore` would avoid it, but only by adding a manual event-emitter module — `localStorage.setItem` fires no `storage` event in the same tab — plus memoized `subscribe`/`getSnapshot` pairs and a second store for `isHydrated`. Not worth it for single-instance provider state.

- [ ] **Step 3: Verify the app still boots**

Run: `npm run dev`
Open `http://localhost:3000`. Expected: the dashboard renders exactly as before, no console errors.

Run: `npx tsc --noEmit` and `npm run lint`
Expected: both clean.

- [ ] **Step 4: Commit**

```bash
git add contexts/game-context.tsx app/providers.tsx
git commit -m "feat: add the active-game context

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Game switcher and navigation

**Files:**
- Create: `components/nav/game-switcher.tsx`
- Modify: `components/nav/top-nav-bar.tsx:11-18,40-47`, `components/nav/bottom-tab-bar.tsx:7-14`, `components/nav/app-shell.tsx:11-28`

**Interfaces:**
- Consumes: `useGame()` from Task 5, `GAMES`/`REGISTERED_GAME_IDS` from Task 3.
- Produces: `GameSwitcher` (default export), and nav tab arrays derived from `game.hasPrices`.

- [ ] **Step 1: Write the switcher**

Create `components/nav/game-switcher.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useGame } from "@/contexts/game-context";
import { GAMES, REGISTERED_GAME_IDS } from "@/lib/games";

export default function GameSwitcher() {
  const { gameId, game, setGameId, isHydrated } = useGame();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // A single registered game needs no switcher.
  if (REGISTERED_GAME_IDS.length < 2) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg border border-[var(--border-light)] bg-[var(--elevated)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        {/* Hold the label back until hydration so the wrong game never flashes. */}
        <span className={isHydrated ? "" : "opacity-0"}>{game.shortName}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute left-0 z-50 mt-1 w-44 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl">
          {REGISTERED_GAME_IDS.map((id) => (
            <button
              key={id}
              onClick={() => { setGameId(id); setOpen(false); }}
              className={`flex w-full items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-[var(--elevated)] ${
                id === gameId ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
              }`}
            >
              {GAMES[id].shortName}
              {id === gameId && <Check size={14} className="text-[var(--accent)]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Derive the desktop nav tabs from the registry**

In `components/nav/top-nav-bar.tsx`, replace the module-level `tabs` const with a full list plus a filter inside the component:

```tsx
const allTabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/database", label: "Database", icon: Search },
  { href: "/collection", label: "Collection", icon: Layers },
  { href: "/decks", label: "Decks", icon: SquareStack },
  { href: "/sell", label: "Sell", icon: TrendingUp, requiresPrices: true },
  { href: "/needs", label: "Needs", icon: ShoppingCart },
];
```

Inside `TopNavBar`, add:

```tsx
  const { game } = useGame();
  const tabs = allTabs.filter((t) => !t.requiresPrices || game.hasPrices);
```

Add the imports `import { useGame } from "@/contexts/game-context";` and `import GameSwitcher from "@/components/nav/game-switcher";`.

Then place the switcher after the logo link, inside the existing flex row:

```tsx
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1.5 text-lg font-bold text-[var(--text-primary)]">
            <CardBoardLogo size={40} className="shrink-0 translate-y-0.5" />
            <span>Card<span className="text-[var(--accent)]">Board</span></span>
          </Link>
          <GameSwitcher />
        </div>
```

- [ ] **Step 3: Apply the same tab filter to the mobile bar**

In `components/nav/bottom-tab-bar.tsx`, rename `tabs` to `allTabs`, add `requiresPrices: true` to the Sell entry, and inside `BottomTabBar` add:

```tsx
  const { game } = useGame();
  const tabs = allTabs.filter((t) => !t.requiresPrices || game.hasPrices);
```

with `import { useGame } from "@/contexts/game-context";`.

- [ ] **Step 4: Add the mobile header**

`app-shell.tsx` renders no header on mobile and the bottom bar already carries six tabs, so the switcher needs its own row. Replace the returned JSX:

```tsx
  return (
    <div className="flex min-h-screen flex-col">
      <TopNavBar />
      <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/80 px-4 py-2 backdrop-blur-xl md:hidden">
        <Link href="/" className="flex items-center gap-1.5 text-base font-bold text-[var(--text-primary)]">
          <CardBoardLogo size={28} className="shrink-0" />
          <span>Card<span className="text-[var(--accent)]">Board</span></span>
        </Link>
        <GameSwitcher />
      </header>
      <div className="flex flex-1 justify-center">
        <main
          className="w-full max-w-7xl px-4 pb-20 pt-4 md:px-6 md:pb-6"
          style={{
            marginRight: isPanelOpen ? 400 : 0,
            transition: "margin-right 300ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {children}
        </main>
      </div>
      <Footer />
      <BottomTabBar />
    </div>
  );
```

Add imports: `import Link from "next/link";`, `import CardBoardLogo from "@/components/icons/cardboard-logo";`, `import GameSwitcher from "@/components/nav/game-switcher";`.

- [ ] **Step 5: Verify manually**

Run: `npm run dev`

Check, at desktop width: the switcher renders next to the logo, shows "Digimon", and is hidden entirely (single registered game). Check at mobile width (DevTools ≤767px): the new header row appears above the content and the bottom bar still shows six tabs.

Because Cyberpunk is not registered until Task 12, `GameSwitcher` returns `null` here. That is expected — the mobile header still renders the logo.

Run: `npx tsc --noEmit` and `npm run lint`
Expected: both clean.

- [ ] **Step 6: Commit**

```bash
git add components/nav/
git commit -m "feat: add the game switcher and derive nav tabs from the registry

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Game-filter the card and deck hooks

**Files:**
- Modify: `lib/hooks/use-cards.ts` (all eight hooks), `lib/hooks/use-decks.ts:9-20,63-75`

**Interfaces:**
- Consumes: `useGame()` from Task 5.
- Produces: every hook in these two files takes the active game from context, adds it to its `queryKey`, and filters. `useCreateDeck` writes `game`.

- [ ] **Step 1: Filter `useExpansions`**

`card_expansions` has a FK to `cards`, so the embed works. In `lib/hooks/use-cards.ts`, add `import { useGame } from "@/contexts/game-context";` and rewrite:

```ts
export function useExpansions() {
  const { gameId } = useGame();
  return useQuery<Expansion[]>({
    queryKey: ["expansions", gameId],
    queryFn: async () => {
      const pageSize = 1000;
      const allRows: { expansion: string }[] = [];
      let from = 0;

      while (true) {
        const { data, error } = await supabase
          .from("card_expansions")
          .select("expansion, cards!inner(game)")
          .eq("cards.game", gameId)
          .range(from, from + pageSize - 1);

        if (error) throw error;
        allRows.push(...(data as unknown as { expansion: string }[]));
        if (data.length < pageSize) break;
        from += pageSize;
      }

      const counts = new Map<string, number>();
      for (const row of allRows) {
        counts.set(row.expansion, (counts.get(row.expansion) || 0) + 1);
      }

      return Array.from(counts.entries())
        .map(([code, card_count]) => ({ code, name: code, card_count }))
        .sort((a, b) => b.code.localeCompare(a.code));
    },
  });
}
```

- [ ] **Step 2: Filter the remaining seven hooks in the same file**

`useCardsByExpansion` — add `const { gameId } = useGame();`, key `["cards", "expansion", gameId, expansion]`, filter the join query with `.select("card_number, cards!inner(game)").eq("cards.game", gameId)` and the card fetch with `.eq("game", gameId)`.

`useCardSearch` — key `["cards", "search", gameId, query]`, add `.eq("game", gameId)` before `.or(...)`.

`useCardsFiltered` — key `["cards", "filtered", gameId, filters]`, add `q = q.eq("game", gameId)` immediately after `let q = supabase.from("cards").select("*")`.

`useExpansionMetadata` — key `["expansion-metadata", gameId]`, add `.eq("game", gameId)`.

`useCard` — key `["cards", gameId, cardNumber]`, add `.eq("game", gameId)`.

`useCardSiblings` — key `["card-siblings", gameId, baseCardNumber]`, add `.eq("game", gameId)`.

`useCardExpansions` — key `["card-expansions", gameId, baseCardNumber]`, filter with `.select("card_number, expansion, cards!inner(game)").eq("cards.game", gameId)`. The embed adds a nested `cards` key to each row, so pick the fields you want explicitly rather than rest-stripping:

```ts
      return (data ?? []).map((row) => ({
        card_number: row.card_number,
        expansion: row.expansion,
      })) as { card_number: string; expansion: string }[];
```

**Do not use `({ cards: _cards, ...row }) => row`.** `eslint-config-next` sets no `varsIgnorePattern` for underscore-prefixed rest siblings, so the discarded binding is a `@typescript-eslint/no-unused-vars` error, and suppressing it trades a clean rule for nothing. The explicit pick also documents exactly which fields the hook returns.

- [ ] **Step 3: Filter the deck hooks**

In `lib/hooks/use-decks.ts`, add `import { useGame } from "@/contexts/game-context";` then:

```ts
export function useDecks() {
  const { gameId } = useGame();
  return useQuery<Deck[]>({
    queryKey: ["decks", gameId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase.from("decks").select("*").eq("user_id", user.id).eq("game", gameId).order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Deck[];
    },
  });
}
```

`useCreateDeck` must stamp the game:

```ts
export function useCreateDeck() {
  const queryClient = useQueryClient();
  const { gameId } = useGame();
  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("decks").insert({ user_id: user.id, game: gameId, name, description: description || null }).select().single();
      if (error) throw error;
      return data as Deck;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["decks"] }); },
  });
}
```

`useAllDeckCards` filters its deck lookup: `.eq("user_id", user.id).eq("game", gameId)`, key `["deck-cards", "all", gameId]`.

Leave `useDeck`, `useDeckCards`, `useDeleteDeck` and `useUpdateDeckCard` alone — they address a single deck by id, which already implies its game.

- [ ] **Step 4: Verify nothing changed for Digimon**

Run: `npm test`
Expected: PASS.

Run: `npx tsc --noEmit` and `npm run lint`
Expected: both clean.

Run: `npm run dev` and walk `/database` (expansion tiles and card grid render), `/collection`, `/decks` (existing decks listed), `/needs`. Expected: identical to before.

- [ ] **Step 5: Commit**

```bash
git add lib/hooks/use-cards.ts lib/hooks/use-decks.ts
git commit -m "feat: scope the card and deck hooks to the active game

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Game-filter the user-data hooks

**Files:**
- Modify: `lib/hooks/use-collection.ts:9-20`, `lib/hooks/use-wishlist.ts:9-23`, `lib/hooks/use-sell-list.ts:9-23`, `lib/hooks/use-prices.ts:9-31`, `lib/hooks/use-price-history.ts:9-31`

**Interfaces:**
- Consumes: `useGame()`.
- Produces: `useCollection`, `useWishlist`, `useSellList` return the same types as before, filtered to the active game. `usePrices` and `usePriceHistory` are unchanged apart from an explanatory comment.

- [ ] **Step 1: Filter `useCollection`, stripping the embed**

`collection` has a FK to `cards`, so the embed works — but it changes the row shape, so the joined key must be removed before the cast:

```ts
export function useCollection() {
  const { gameId } = useGame();
  return useQuery<CollectionEntry[]>({
    queryKey: ["collection", gameId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("collection")
        .select("*, cards!inner(game)")
        .eq("user_id", user.id)
        .eq("cards.game", gameId);
      if (error) throw error;
      // Pick the entry's own fields so the joined `cards` key is dropped and
      // the row shape stays CollectionEntry.
      return (data ?? []).map((row) => ({
        user_id: row.user_id,
        card_number: row.card_number,
        quantity: row.quantity,
        updated_at: row.updated_at,
      })) as CollectionEntry[];
    },
  });
}
```

**Do not use `({ cards: _cards, ...entry }) => entry`.** `eslint-config-next` sets no `varsIgnorePattern` for underscore-prefixed rest siblings, so the discarded binding is a `@typescript-eslint/no-unused-vars` error. Pick fields explicitly in all three hooks below.

- [ ] **Step 2: Repoint the optimistic update at the game-keyed cache**

`useUpdateQuantity` reads and writes `["collection"]`, which no longer exists. Add `const { gameId } = useGame();` to the hook and replace all four occurrences of `["collection"]` with `["collection", gameId]` (in `cancelQueries`, `getQueryData`, `setQueryData`, `onError`'s `setQueryData`, and `onSettled`'s `invalidateQueries`).

Missing one of these silently breaks fast collection entry — the tray would stop reflecting +/- presses. Verify by grepping afterwards:

Run: `grep -n '\["collection"\]' lib/hooks/use-collection.ts`
Expected: no output.

- [ ] **Step 3: Filter `useWishlist` and `useSellList`**

Same shape as Step 1, including the explicit field pick.

`useWishlist`: key `["wishlist", gameId]`, `.select("*, cards!inner(game)").eq("user_id", user.id).eq("cards.game", gameId)`, then pick `user_id`, `card_number`, `quantity`, `added_at` and cast to `WishlistEntry[]`.

`useSellList`: key `["sell-list", gameId]`, same filter, then pick `user_id`, `card_number`, `added_at` and cast to `SellListEntry[]`.

Check the field lists against `lib/types.ts` before writing them — `WishlistEntry` and `SellListEntry` are defined there, and a picked field that does not exist on the interface is a type error while a missing one silently drops data.

Their mutation hooks invalidate `["wishlist"]` / `["sell-list"]`, which still prefix-matches the game-keyed queries, so leave the mutations alone.

- [ ] **Step 4: Document why the price hooks stay unfiltered**

Add this comment above the `useQuery` in `lib/hooks/use-prices.ts`:

```ts
      // Not game-filtered: migration 007_relax_price_fk.sql dropped the FK from
      // card_prices to cards, so a `cards!inner` embed is impossible here.
      // Prices are only ever consumed as keyed lookups against an
      // already-game-filtered card list, so extra rows are inert.
```

Add the same comment (naming `card_price_history`) in `lib/hooks/use-price-history.ts`. Change no logic in either file.

- [ ] **Step 5: Verify**

Run: `npm test` → PASS. `npx tsc --noEmit` and `npm run lint` → clean.

Run: `npm run dev` and check: `/collection` shows the same card count and total value as before; on `/collection/add`, pressing + and − updates the quantity immediately and the session tray records it; `/sell` and `/needs` render unchanged.

- [ ] **Step 6: Commit**

```bash
git add lib/hooks/
git commit -m "feat: scope collection, wishlist and sell list to the active game

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Game-filter the inline component queries

**Files:**
- Modify: `app/decks/[id]/page.tsx:34-53`, `components/decks/deck-form.tsx:26-46`, `components/collection/import-modal.tsx:41-60`, `app/needs/page.tsx:55-69`

**Interfaces:**
- Consumes: `useGame()`, and `deck.game` from Task 2's `Deck` type.
- Produces: no new exports. All five inline `useQuery` calls become game-scoped.

**Why import-modal is in this task and not optional:** `components/collection/import-modal.tsx:42` and `components/decks/deck-form.tsx:27` **share the query key `["all-card-numbers"]`**. Filtering one without the other leaves whichever mounts first populating the cache for both — importing a list into a Cyberpunk deck would validate against Digimon card numbers, pass, and then fail at the database trigger with a raw Postgres error. Both must change together.

- [ ] **Step 1: Scope the deck detail queries to the deck's own game**

In `app/decks/[id]/page.tsx`, the add-search must filter by **`deck.game`**, not the active game — otherwise a Digimon card could be offered for a Cyberpunk deck and the database trigger would reject it with a raw Postgres error. `deck` is already loaded by `useDeck(deckId)`.

```tsx
  const { data: cardsInDeck } = useQuery<Card[]>({
    queryKey: ["deck-detail-cards", deck?.game, cardNumbers],
    queryFn: async () => {
      if (cardNumbers.length === 0) return [];
      const { data, error } = await supabase.from("cards").select("*").eq("game", deck!.game).in("card_number", cardNumbers).order("card_number");
      if (error) throw error;
      return data as Card[];
    },
    enabled: cardNumbers.length > 0 && !!deck,
  });

  const { data: searchResults } = useQuery<Card[]>({
    queryKey: ["deck-add-search", deck?.game, searchQuery],
    queryFn: async () => {
      const { data, error } = await supabase.from("cards").select("*").eq("game", deck!.game).or(`name.ilike.%${searchQuery}%,card_number.ilike.%${searchQuery}%`).order("card_number").limit(50);
      if (error) throw error;
      return data as Card[];
    },
    enabled: addingCards && searchQuery.length >= 2 && !!deck,
  });
```

- [ ] **Step 2: Scope the deck form's known-card lookup**

In `components/decks/deck-form.tsx`, add `import { useGame } from "@/contexts/game-context";` and `const { gameId } = useGame();` inside the component, then key and filter:

```tsx
  const { data: knownCards } = useQuery<Set<string>>({
    queryKey: ["all-card-numbers", gameId],
    queryFn: async () => {
      const pageSize = 1000;
      const allNumbers: string[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("cards")
          .select("card_number")
          .eq("game", gameId)
          .range(from, from + pageSize - 1);
        if (error) throw error;
        allNumbers.push(...(data as { card_number: string }[]).map((c) => c.card_number));
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return new Set(allNumbers);
    },
    staleTime: 5 * 60 * 1000,
    enabled: showImport,
  });
```

- [ ] **Step 3: Scope the import modal's known-card lookup to the DECK's game**

`ImportModal` serves two call sites: `app/collection/add/page.tsx` (no deck — the active game is correct) and `app/decks/[id]/page.tsx` (imports into one specific deck — the **deck's** game is correct). Scoping it to the active game in both cases is a fail-open bug: the switcher lives in the persistent app shell, so a user on a Cyberpunk deck's page can flip to Digimon, paste Digimon numbers, pass client validation against the active game's card set, and only be stopped by the `trg_deck_cards_game` trigger — which `handleImport` does not catch, leaving the modal stuck on its spinner.

So give the modal an optional game override. In `components/collection/import-modal.tsx`:

```ts
// props
game?: GameId;   // import type { GameId } from "@/lib/games";

// inside the component, after const { gameId } = useGame();
// A deck import must validate against the deck's own game, not whatever
// game is active — the switcher is reachable without leaving the page.
const effectiveGameId = game ?? gameId;
```

Use `effectiveGameId` in **both** the query key (`["all-card-numbers", effectiveGameId]`) and the `.eq("game", effectiveGameId)` filter, keeping the `.range()` pagination loop intact. Using it in one but not the other leaves two games' card sets sharing a cache entry — the same symptom, a different bug.

Then in `app/decks/[id]/page.tsx`, pass `game={deck.game}` to `<ImportModal>`. `deck` is guaranteed non-null there because the component early-returns on `if (!deck)` first. Leave `app/collection/add/page.tsx` alone — the `?? gameId` default is what keeps collection imports correct.

Verify both call sites now agree:

Run: `grep -n 'all-card-numbers' components/collection/import-modal.tsx components/decks/deck-form.tsx`
Expected: `deck-form.tsx` reads `queryKey: ["all-card-numbers", gameId],` (a new deck is always created in the active game) and `import-modal.tsx` reads `queryKey: ["all-card-numbers", effectiveGameId],` (an import may target a deck of another game).

- [ ] **Step 4: Scope the needs page card lookup**

In `app/needs/page.tsx`, add `import { useGame } from "@/contexts/game-context";` and `const { gameId } = useGame();`, then key `["need-cards", gameId, referencedCardNumbers]` and add `.eq("game", gameId)` to **both** queries inside `queryFn` (the `base_card_number` lookup and the sibling fetch).

- [ ] **Step 5: Leave the five keyed-lookup queries alone, deliberately**

These five also query `cards` directly but need **no** change, and changing them adds churn without benefit:

| File | Why it is already correct |
|---|---|
| `app/collection/page.tsx:39` | `.in("card_number", …)` over numbers from the now-filtered `useCollection` |
| `app/sell/page.tsx:71` | Same pattern; `/sell` is also gated off entirely for games without prices |
| `components/dashboard/dashboard-stats.tsx:24` | Same pattern, from the filtered collection |
| `components/dashboard/worth-selling.tsx:31` | Same pattern, from the filtered collection |
| `app/decks/[id]/page.tsx` deck-detail-cards | Handled in Step 1 — listed here so the audit is complete |

Each takes its card numbers from an already-game-filtered source and includes those numbers in its query key, so no cross-game rows can appear and no cache can bleed between games. Confirm the full inventory matches:

Run: `grep -rn '\.from("cards")' app/ components/ --include=*.tsx --include=*.ts`
Expected: ten hits — five changed in this task (two in `decks/[id]`, `deck-form`, `import-modal`, two in `needs` counted as one file), and the four table rows above.

- [ ] **Step 6: Verify**

Run: `npm test` → PASS. `npx tsc --noEmit` and `npm run lint` → clean.

Run: `npm run dev`, open an existing deck, click "Add Cards", search for a card by name — results appear as before. Open `/needs` — the same sections and totals as before. Open `/collection/add`, click Import, paste `BT1-001 3` and confirm it still validates as a known card.

- [ ] **Step 7: Commit**

```bash
git add app/decks/ components/decks/deck-form.tsx components/collection/import-modal.tsx app/needs/page.tsx
git commit -m "feat: scope the inline card queries to the right game

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Drive filters, panel stats and images from the registry

**Files:**
- Modify: `components/cards/card-filters.tsx:11-28,41-100`, `components/cards/card-panel.tsx:20-28,72-73,133-161`, `components/cards/card-image.tsx:17-38`

**Interfaces:**
- Consumes: `useGame()`, `game.colors`, `game.cardTypes`, `game.rarities`, `game.stats`, `game.fallbackImageUrl`.
- Produces: no new exports. `lib/utils.ts` keeps `getCardImageUrl` unchanged for `app/s/[token]/image/route.tsx`, which is a server route with no game context and only serves Digimon sell shares.

- [ ] **Step 1: Replace the hardcoded filter lists**

In `components/cards/card-filters.tsx`, delete the `COLORS`, `TYPES` and `RARITIES` consts and the now-unused Lucide imports (`Swords`, `User`, `Zap`, `Egg` — keep `Check`). Add:

```tsx
import { useGame } from "@/contexts/game-context";
```

Inside the component, add `const { game } = useGame();` and replace the three `.map` sources: `COLORS` → `game.colors`, `TYPES` → `game.cardTypes`, `RARITIES` → `game.rarities`. The colour buttons already read `c.color`, `c.bg`, `c.border`, which match the `ColorStyle` fields, so their JSX is unchanged.

- [ ] **Step 2: Replace the panel's colour map and stat row**

In `components/cards/card-panel.tsx`, delete the `COLOR_STYLES` const and add `import { useGame } from "@/contexts/game-context";`. Inside the component add `const { game } = useGame();` and replace the two derived values:

```tsx
  const colorStyle = card
    ? (game.colors.find((c) => c.label === card.color) ?? { color: "var(--text-secondary)", bg: "var(--elevated)" })
    : null;
  const displayImageUrl = card ? (card.image_url || game.fallbackImageUrl(card.base_card_number)) : "";
```

Then guard the panel's own `<Image>` against an empty URL, the same way `CardImage` is guarded in Step 3. Change the image block's ternary condition from `imageError` to:

```tsx
          {imageError || !displayImageUrl ? (
```

`displayImageUrl` is `""` whenever a card has no stored `image_url` and its game's `fallbackImageUrl` returns `""`, and `next/image` throws on `src=""`. The `ImageOff` placeholder that already renders for the error case handles it. A guard present in one of two sibling components and absent in the other is how this gets found the hard way.

Replace the whole `{/* Stats Row */}` block with a registry-driven loop. Stats absent from `attributes` are skipped, so a partially-seeded card renders what it has:

```tsx
        {/* Stats Row */}
        {(() => {
          const shown = game.stats
            .map((s) => ({ ...s, value: card.attributes[s.key] }))
            .filter((s) => s.value !== undefined && s.value !== null);
          if (shown.length === 0) return null;
          return (
            <div className="mt-4 flex gap-2">
              {shown.map((s) => (
                <div key={s.key} className="flex-1 rounded-lg bg-[var(--elevated)] px-3 py-2 text-center">
                  <div className="text-sm font-bold text-[var(--text-primary)]">{s.prefix ?? ""}{String(s.value)}</div>
                  <div className="text-[10px] uppercase text-[var(--text-dim)]">{s.label}</div>
                </div>
              ))}
            </div>
          );
        })()}
```

Remove the now-unused `getCardImageUrl` from the `@/lib/utils` import, keeping `formatPrice`.

- [ ] **Step 3: Make `CardImage` game-aware and empty-src safe**

`next/image` throws on `src=""`, and Cyberpunk's `fallbackImageUrl` returns `""`. In `components/cards/card-image.tsx`, replace the `getCardImageUrl` import with `useGame`, and rewrite the body:

```tsx
export default function CardImage({ cardNumber, alt, imageUrl, fill, sizes, className }: CardImageProps) {
  const { game } = useGame();
  const [error, setError] = useState(false);
  const src = imageUrl || game.fallbackImageUrl(cardNumber);

  if (error || !src) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-[var(--elevated)] text-[var(--text-dim)]">
        <ImageOff size={20} />
        <span className="text-[10px]">{cardNumber}</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      sizes={sizes}
      className={className}
      onError={() => setError(true)}
    />
  );
}
```

- [ ] **Step 4: Verify Digimon rendering is untouched**

Run: `npm test` → PASS. `npx tsc --noEmit` and `npm run lint` → clean.

Run: `npm run dev` and check `/database`: the seven colour chips, four type chips and five rarity chips render as before; card images load; clicking a card opens the panel with the same four stat boxes (`Lv.`, Cost, DP, Evo) and the same colour badge.

This check is the spec's "attributes-backed stat rendering matches the previous column-backed output" requirement. It is manual because the vitest setup has no jsdom (see Global Constraints), so compare against a card you noted before Task 1 — pick one with all four stats and one with only some.

- [ ] **Step 5: Commit**

```bash
git add components/cards/
git commit -m "feat: drive card filters, stats and image fallbacks from the registry

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Phase 1 acceptance — prove nothing changed

**Files:** none modified. This task is a gate.

- [ ] **Step 1: Full automated check**

```bash
npm test && npx tsc --noEmit && npm run lint && npm run build
```

Expected: suite passes, no type errors, no lint errors, production build succeeds.

- [ ] **Step 2: Manual walkthrough at desktop width**

Run `npm run dev` and confirm each of these matches pre-change behaviour:

- `/` — dashboard stats, deck progress and worth-selling widget populated.
- `/database` — expansion tiles, then a set's card grid; filters narrow results; clicking a card opens the panel with image, badges, four stats, collection control, sell/wishlist toggles, deck usage, expansions and price.
- `/collection` — card count and total value match what they were before Task 1.
- `/collection/add` — search a card, press + three times: the quantity increments immediately and the session tray lists it; undo removes it.
- `/decks` — existing decks listed; open one, "Add Cards" search returns results; adjust a quantity.
- `/needs` — deck sections, wishlist section, buy-list total and CSV export.
- `/sell` — surplus rows, prices, share modal.

- [ ] **Step 3: Manual walkthrough at mobile width**

In DevTools at 390px: the new header row shows the logo; the bottom bar shows all six tabs including Sell; the card panel slides up from the bottom.

- [ ] **Step 4: Confirm the switcher is correctly absent**

Only Digimon is registered, so `GameSwitcher` returns `null`. Expected: no dropdown anywhere. If one renders, `REGISTERED_GAME_IDS` is wrong.

- [ ] **Step 5: Record the phase 1 result**

If anything above differs from prior behaviour, stop and fix it before phase 2 — a regression here will be much harder to isolate once Cyberpunk data exists.

```bash
git commit --allow-empty -m "chore: phase 1 acceptance — multi-game plumbing is behaviour-neutral

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

# Phase 2 — Register Cyberpunk

### Task 12: Cyberpunk registry config

**Files:**
- Create: `lib/games/cyberpunk.ts`
- Modify: `lib/games/index.ts`, `lib/games/registry.test.ts`

**Interfaces:**
- Consumes: `GameConfig`, `validateDeck`.
- Produces: `cyberpunk: GameConfig`, registered in `GAMES` so `REGISTERED_GAME_IDS` becomes `["digimon", "cyberpunk"]`.

- [ ] **Step 1: Write the failing test**

In `lib/games/registry.test.ts`, restore the cyberpunk case and add a config-specific block:

```ts
  it("round trips a valid stored id", () => {
    expect(resolveGameId("digimon")).toBe("digimon");
    expect(resolveGameId("cyberpunk")).toBe("cyberpunk");
  });
```

```ts
describe("cyberpunk config", () => {
  it("declares the four card types and seven rarities", () => {
    const g = GAMES.cyberpunk;
    expect(g.cardTypes.map((t) => t.label)).toEqual(["Legend", "Unit", "Gear", "Program"]);
    expect(g.rarities).toHaveLength(7);
    expect(g.rarities).toContain("Iconic Rare");
    expect(g.rarities).toContain("Nova Rare");
  });

  it("has no price support and no image fallback", () => {
    expect(GAMES.cyberpunk.hasPrices).toBe(false);
    expect(GAMES.cyberpunk.fallbackImageUrl("wtnc-006")).toBe("");
  });

  it("lowercases card numbers", () => {
    expect(GAMES.cyberpunk.normalizeCardNumber("WTNC-006")).toBe("wtnc-006");
  });

  it("enforces three unique legends and a 40-50 main deck", () => {
    const { deck } = GAMES.cyberpunk;
    expect(deck.mainMin).toBe(40);
    expect(deck.mainMax).toBe(50);
    expect(deck.copyLimit).toBe(3);
    expect(deck.zones[0]).toMatchObject({ key: "legend", min: 3, max: 3, uniqueNames: true });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run lib/games/registry.test.ts`
Expected: FAIL — `Cannot read properties of undefined (reading 'cardTypes')` for `GAMES.cyberpunk`.

- [ ] **Step 3: Write the config**

Create `lib/games/cyberpunk.ts`. Icons: `Crown` for Legend, `Users` for Unit, `Wrench` for Gear, `Terminal` for Program — all Lucide, no emojis.

```ts
import { Crown, Users, Wrench, Terminal } from "lucide-react";
import { validateDeck } from "@/lib/games/validate-deck";
import type { GameConfig } from "@/lib/games/types";

const DECK_RULES = {
  mainMin: 40,
  mainMax: 50,
  copyLimit: 3,
  zones: [
    { key: "legend", label: "Legends", cardTypes: ["Legend"], min: 3, max: 3, uniqueNames: true },
  ],
};

export const cyberpunk: GameConfig = {
  id: "cyberpunk",
  name: "Cyberpunk Trading Card Game",
  shortName: "Cyberpunk",
  cardTypes: [
    { label: "Legend", icon: Crown },
    { label: "Unit", icon: Users },
    { label: "Gear", icon: Wrench },
    { label: "Program", icon: Terminal },
  ],
  colors: [
    { label: "Red", color: "var(--red)", bg: "var(--red-translucent)", border: "var(--red-border)" },
    { label: "Blue", color: "var(--blue)", bg: "var(--blue-translucent)", border: "var(--blue-border)" },
    { label: "Yellow", color: "var(--yellow)", bg: "var(--yellow-translucent)", border: "var(--yellow-border)" },
    { label: "Green", color: "var(--green)", bg: "var(--green-translucent)", border: "var(--green-border)" },
    { label: "Purple", color: "var(--purple)", bg: "var(--purple-translucent)", border: "var(--purple-border)" },
  ],
  rarities: [
    "Common",
    "Uncommon",
    "Rare",
    "Epic Rare",
    "Secret Rare",
    "Iconic Rare",
    "Nova Rare",
  ],
  stats: [
    { key: "cost", label: "Cost" },
    { key: "power", label: "Power" },
    { key: "ram", label: "RAM" },
  ],
  deck: { ...DECK_RULES, validate: (cards) => validateDeck(DECK_RULES, cards) },
  hasPrices: false,
  fallbackImageUrl: () => "",
  normalizeCardNumber: (raw) => raw.toLowerCase(),
};
```

**Before committing, verify `colors` against the official database** at `cyberpunktcg.com/cards`. The five above are the colours visible in community databases; if the set uses a different palette, correct the list — the registry test only checks it is non-empty.

- [ ] **Step 4: Register it**

In `lib/games/index.ts`, add the import and the map entry, and drop the `as Record<GameId, GameConfig>` cast now that the record is complete:

```ts
import { cyberpunk } from "@/lib/games/cyberpunk";
...
export const GAMES: Record<GameId, GameConfig> = {
  digimon,
  cyberpunk,
};
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run lib/games/` → PASS. The registry invariant tests now cover both games, including the zone-card-type check (`Legend` must appear in `cardTypes`).

Run: `npm test` → PASS.

- [ ] **Step 6: Verify the switcher appears**

Run: `npm run dev`. Expected: the switcher now renders (two registered games), shows "Digimon", and opens to list both. Selecting Cyberpunk should empty the database and collection views (no cards seeded yet) and remove the Sell tab from both navs.

- [ ] **Step 7: Commit**

```bash
git add lib/games/
git commit -m "feat: register the Cyberpunk TCG game config

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: Game-aware card number normalization

**Files:**
- Modify: `lib/import-parser.ts:23-67,73-106`, `components/collection/import-modal.tsx`, `components/decks/deck-form.tsx`
- Test: `lib/import-parser.test.ts`

**Interfaces:**
- Consumes: `game.normalizeCardNumber` from Task 12.
- Produces: `parseCardList(input: string, normalize?: (s: string) => string): ParseResult` and `parseCSV(csvText: string, normalize?: (s: string) => string): ParseResult`. The default `normalize` is `(s) => s.toUpperCase()`, preserving existing Digimon behaviour.

- [ ] **Step 1: Write the failing tests**

Append to `lib/import-parser.test.ts` inside the `parseCardList` describe block:

```ts
  it("keeps lowercase card numbers when the game normalizes to lowercase", () => {
    const lower = (s: string) => s.toLowerCase();
    expect(parseCardList("WTNC-006 3", lower).parsed).toEqual([{ cardNumber: "wtnc-006", quantity: 3 }]);
  });

  it("parses card numbers with letters after the dash", () => {
    const lower = (s: string) => s.toLowerCase();
    expect(parseCardList("alpha-a010 2", lower).parsed).toEqual([{ cardNumber: "alpha-a010", quantity: 2 }]);
    expect(parseCardList("promo-n001", lower).parsed).toEqual([{ cardNumber: "promo-n001", quantity: 1 }]);
  });

  it("still rejects lines that are not card entries", () => {
    expect(parseCardList("not a card").errors).toHaveLength(1);
    expect(parseCardList("just-words-here").errors).toHaveLength(1);
  });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run lib/import-parser.test.ts`
Expected: FAIL — the lowercase case returns `WTNC-006`, and `alpha-a010` reports an "Unrecognized format" error.

- [ ] **Step 3: Loosen the regex and thread the normalizer**

In `lib/import-parser.ts`, change the signature and the two regexes. The segment after the dash becomes `[A-Za-z0-9]+`, which still rejects `not a card` (spaces) and `just-words-here` (two dashes):

```ts
/**
 * Parses a text block of card entries. Supports formats:
 * - "BT1-001 3" or "BT1-001 x3" or "BT1-001,3"
 * - "4 (BT14-001)" — quantity first, card number in parentheses (digimoncard.io format)
 * - Card number only (defaults to quantity 1)
 * One card per line. Blank lines and lines starting with # are ignored.
 *
 * `normalize` casts card numbers to the game's canonical case — Digimon numbers
 * are uppercase (BT9-111), Cyberpunk's are lowercase (wtnc-006). Defaults to
 * uppercase so existing Digimon call sites are unaffected.
 */
export function parseCardList(
  input: string,
  normalize: (s: string) => string = (s) => s.toUpperCase(),
): ParseResult {
  const lines = input.split(/\r?\n/);
  const parsed: ParsedCard[] = [];
  const errors: ParseError[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;

    const parenMatch = line.match(/^(\d+)\s*x?\s*\(([A-Za-z0-9]+-[A-Za-z0-9]+)\)$/);
    const standardMatch = line.match(/^([A-Za-z0-9]+-[A-Za-z0-9]+)\s*[,xX×]?\s*(\d+)?$/);

    const match = parenMatch || standardMatch;
    if (!match) {
      errors.push({ line, reason: "Unrecognized format" });
      continue;
    }

    const cardNumber = normalize(parenMatch ? match[2] : match[1]);
    const rawQty = parenMatch ? match[1] : match[2];
    const quantity = rawQty ? parseInt(rawQty, 10) : 1;
```

The rest of the function is unchanged. Also thread it through `parseCSV`:

```ts
export function parseCSV(
  csvText: string,
  normalize: (s: string) => string = (s) => s.toUpperCase(),
): ParseResult {
```

and its final line: `return parseCardList(textLines.join("\n"), normalize);`

**Keep the trailing group GREEDY** — `([A-Za-z0-9]+-[A-Za-z0-9]+)`, no `?`. A greedy group already cannot cross the whitespace before a quantity, so `BT1-001 3` still splits correctly. Making it non-greedy instead lets the optional `(\d+)?` group eat the card number's own trailing digits, silently corrupting the most common input form — bare card numbers with no quantity:

| Input | Greedy | Non-greedy |
|---|---|---|
| `BT3-015` | `BT3-015` ×1 | `BT3-0` ×15 |
| `wtnc-006` | `wtnc-006` ×1 | `wtnc-0` ×6 |
| `promo-n001` | `promo-n001` ×1 | `promo-n` ×001 |

Verify with the existing tests, which cover `BT1-001 3`, `BT1-001 x2`, `BT1-002,5` and bare `BT3-015`, plus the new lowercase and letter-suffix cases.

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run lib/import-parser.test.ts`
Expected: PASS — all pre-existing cases plus the three new ones.

- [ ] **Step 5: Pass the game's normalizer at both call sites**

In `components/decks/deck-form.tsx`, `const { gameId } = useGame()` already exists from Task 9; change it to `const { gameId, game } = useGame();` and update the call: `const result = parseCardList(cardList, game.normalizeCardNumber);`

In `components/collection/import-modal.tsx`, **do not destructure `game` from `useGame()`** — Task 9 added a prop already named `game` (the deck's game override), and a second binding of that name in the same scope shadows it.

Instead derive the config from the effective game, so a deck import normalizes card numbers for the deck's game rather than the active one — the same reason the card lookup uses `effectiveGameId`:

```ts
import { getGame } from "@/lib/games";
...
const normalizeCardNumber = getGame(effectiveGameId).normalizeCardNumber;
```

Pass `normalizeCardNumber` to every `parseCardList` and `parseCSV` call in the file. Do not add a second `useGame()` call.

Run: `grep -n "parseCardList\|parseCSV" components/collection/import-modal.tsx components/decks/deck-form.tsx`
Expected: every call site passes a second argument.

- [ ] **Step 6: Verify and commit**

Run: `npm test` → PASS. `npx tsc --noEmit` and `npm run lint` → clean.

Run: `npm run dev`, open a Digimon deck, "Import card list", paste `BT1-001 3` — it still imports.

```bash
git add lib/import-parser.ts lib/import-parser.test.ts components/collection/import-modal.tsx components/decks/deck-form.tsx
git commit -m "feat: make card number normalization game-aware

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 14: Seed importer

**Files:**
- Create: `scripts/import_game_cards.py`, `scripts/data/cyberpunk_cards.json`

**Interfaces:**
- Consumes: the `games`, `cards`, `card_expansions` and `expansion_metadata` tables from Task 1.
- Produces: `python scripts/import_game_cards.py --game <id> --file <path> [--validate-only | --dry-run]`, exiting non-zero on any validation failure or cross-game collision.

**Three modes, each honest about what it needs.** `--validate-only` runs the pure validation pass and exits 0 or 1 **without opening a Supabase connection** — this is the mode for hand-editing the seed file, needs no service-role credentials, and is the only mode CI or an agent can exercise. `--dry-run` does the full rehearsal — validation, the `games`-table registration check, and the cross-game collision check — then prints planned counts and returns **before writing**; it connects, because the collision check is the most valuable thing a rehearsal can report, and that guard is what makes the shared single-column `card_number` primary key safe across games. A plain run does all of that and then upserts. Passing both flags is an error rather than a guess.

- [ ] **Step 1: Create the seed file with a documented shape**

Create `scripts/data/cyberpunk_cards.json`. **Until the set is revealed, this file contains exactly `[]`** — the importer's non-empty check then rejects it, which is correct.

When cards are revealed, **read every value off the official database at `cyberpunktcg.com/cards`** (cross-check stats against `ripperdeck.gg/cards`). Do not invent cost, power, RAM, tag or rarity values — a wrong number silently corrupts deck validation and needs maths while looking authoritative. Seed only cards whose every field you can confirm; the importer is idempotent, so more can be added later by re-running it. Use `--validate-only` while editing — it needs no credentials.

This is the required shape of each entry — the values shown are a **format reference only and must be replaced with confirmed data**:

```json
[
  {
    "card_number": "wtnc-006",
    "name": "6th Street Recruits",
    "expansion": "wtnc",
    "card_type": "Unit",
    "color": "Red",
    "rarity": "Common",
    "image_url": "https://<official-cdn-host>/cards/wtnc-006.png",
    "max_copies": 3,
    "base_card_number": "wtnc-006",
    "variant_name": "Regular",
    "attributes": { "cost": 2, "power": 3, "ram": 1, "tags": ["Ganger"] }
  }
]
```

Rules the data must follow:

- `card_number` lowercase, matching the printed collector number.
- `max_copies` is `3` for Unit, Gear and Program; **`1` for Legend** — a named Legend may only be run once, and this makes the existing `surplus = owned - max(max_copies, sum across decks)` formula correct without code changes.
- `card_type` is exactly one of `Legend`, `Unit`, `Gear`, `Program`.
- `rarity` is one of the seven in `lib/games/cyberpunk.ts`.
- Alternate arts (Iconic Rare, Nova Rare) get their **own** `card_number`, with `base_card_number` pointing at the standard printing and `variant_name` naming the treatment (e.g. `"Iconic Rare"`).
- Legend `attributes.ram` is an object of colour to value (`{"red": 3, "blue": 2}`); other types use a single integer.
- Sets to cover as they are revealed: `wtnc`, `ths`, `eps`, `alpha`, `promo`.

- [ ] **Step 2: Write the importer**

Create `scripts/import_game_cards.py`, following the batching and env conventions in `scripts/sync_cards.py`:

```python
"""
Import a game's cards from a versioned JSON seed file into Supabase.

Used for games with no public API — currently Cyberpunk TCG. The seed file is
the source of truth and lives in git; this script upserts it, so a corrected
file simply overwrites. Re-running it is a no-op.

Aborts if any card_number in the file already belongs to a different game.
That guard is what makes the shared single-column card_number primary key safe
across games — see docs/superpowers/specs/2026-08-17-multi-game-support-design.md

Usage:
    pip install -r scripts/requirements.txt
    python scripts/import_game_cards.py --game cyberpunk \
        --file scripts/data/cyberpunk_cards.json [--dry-run]

Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env or environment.
"""

import argparse
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
load_dotenv(".env.local", override=True)

BATCH_SIZE = 500

REQUIRED_FIELDS = [
    "card_number", "name", "expansion", "card_type",
    "color", "rarity", "image_url", "max_copies",
    "base_card_number", "variant_name", "attributes",
]

# Must stay in step with lib/games/cyberpunk.ts and lib/games/digimon.ts.
GAME_RULES = {
    "cyberpunk": {
        "card_types": {"Legend", "Unit", "Gear", "Program"},
        "rarities": {
            "Common", "Uncommon", "Rare", "Epic Rare",
            "Secret Rare", "Iconic Rare", "Nova Rare",
        },
        "colors": {"Red", "Blue", "Yellow", "Green", "Purple"},
        "card_number_case": "lower",
    },
}


def validate(rows: list[dict], game: str) -> list[str]:
    """Returns every problem found, so one run reports all of them."""
    rules = GAME_RULES.get(game)
    if rules is None:
        return [f"no validation rules defined for game '{game}'"]

    problems: list[str] = []
    seen: set[str] = set()

    for i, row in enumerate(rows):
        label = row.get("card_number") or f"row {i}"

        for field in REQUIRED_FIELDS:
            if field not in row:
                problems.append(f"{label}: missing field '{field}'")

        number = row.get("card_number", "")
        if number in seen:
            problems.append(f"{label}: duplicated inside the seed file")
        seen.add(number)

        if rules["card_number_case"] == "lower" and number != number.lower():
            problems.append(f"{label}: card_number must be lowercase")

        if row.get("card_type") not in rules["card_types"]:
            problems.append(f"{label}: unknown card_type {row.get('card_type')!r}")

        if row.get("rarity") not in rules["rarities"]:
            problems.append(f"{label}: unknown rarity {row.get('rarity')!r}")

        if row.get("color") not in rules["colors"]:
            problems.append(f"{label}: unknown color {row.get('color')!r}")

        max_copies = row.get("max_copies")
        if not isinstance(max_copies, int) or max_copies < 1:
            problems.append(f"{label}: max_copies must be a positive integer")
        elif row.get("card_type") == "Legend" and max_copies != 1:
            problems.append(f"{label}: Legend max_copies must be 1, got {max_copies}")

        if not isinstance(row.get("attributes"), dict):
            problems.append(f"{label}: attributes must be an object")

        if not row.get("image_url"):
            problems.append(f"{label}: image_url is required")

    return problems


def find_collisions(supabase, rows: list[dict], game: str) -> list[str]:
    """card_numbers in the seed that already belong to a different game."""
    numbers = [r["card_number"] for r in rows if "card_number" in r]
    collisions: list[str] = []
    for i in range(0, len(numbers), BATCH_SIZE):
        batch = numbers[i : i + BATCH_SIZE]
        existing = (
            supabase.table("cards")
            .select("card_number, game")
            .in_("card_number", batch)
            .execute()
        )
        for found in existing.data or []:
            if found["game"] != game:
                collisions.append(
                    f"{found['card_number']} already belongs to game '{found['game']}'"
                )
    return collisions


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--game", required=True, help="game id, e.g. cyberpunk")
    parser.add_argument("--file", required=True, type=Path, help="seed JSON path")
    parser.add_argument(
        "--dry-run", action="store_true",
        help="validate and report counts without writing",
    )
    args = parser.parse_args()

    if not args.file.exists():
        print(f"ERROR: {args.file} does not exist")
        return 1

    with open(args.file, encoding="utf-8") as f:
        rows = json.load(f)

    if not isinstance(rows, list) or not rows:
        print("ERROR: seed file must be a non-empty JSON array")
        return 1

    print(f"Loaded {len(rows)} cards from {args.file}")

    problems = validate(rows, args.game)
    if problems:
        print(f"ERROR: {len(problems)} validation problem(s):")
        for p in problems:
            print(f"  - {p}")
        return 1
    print("Validation passed")

    supabase = create_client(
        os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    )

    games = supabase.table("games").select("id").eq("id", args.game).execute()
    if not games.data:
        print(f"ERROR: game '{args.game}' is not registered in the games table")
        return 1

    collisions = find_collisions(supabase, rows, args.game)
    if collisions:
        print(f"ERROR: {len(collisions)} card number collision(s) across games:")
        for c in collisions:
            print(f"  - {c}")
        print("Refusing to import — resolve the collision before retrying.")
        return 1
    print("No cross-game card number collisions")

    card_rows = [{**r, "game": args.game} for r in rows]
    expansion_rows = [
        {"card_number": r["card_number"], "expansion": r["expansion"]} for r in rows
    ]
    expansion_meta = [
        {"expansion": e, "game": args.game}
        for e in sorted({r["expansion"] for r in rows})
    ]

    if args.dry_run:
        print(
            f"DRY RUN — would upsert {len(card_rows)} cards, "
            f"{len(expansion_rows)} card-expansion rows, "
            f"{len(expansion_meta)} expansion metadata rows"
        )
        return 0

    for i in range(0, len(card_rows), BATCH_SIZE):
        batch = card_rows[i : i + BATCH_SIZE]
        supabase.table("cards").upsert(batch).execute()
        print(f"  Upserted {min(i + BATCH_SIZE, len(card_rows))}/{len(card_rows)} cards")

    supabase.table("card_expansions").upsert(expansion_rows).execute()
    print(f"  Upserted {len(expansion_rows)} card-expansion rows")

    supabase.table("expansion_metadata").upsert(expansion_meta).execute()
    print(f"  Upserted {len(expansion_meta)} expansion metadata rows")

    total = (
        supabase.table("cards")
        .select("card_number", count="exact")
        .eq("game", args.game)
        .execute()
    )
    print(f"Done! {total.count} cards for game '{args.game}'")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 3: Verify the guards fire before touching real data**

Test validation rejection — temporarily add an entry with `"card_type": "Netrunner"` to the seed file, then:

Run: `python scripts/import_game_cards.py --game cyberpunk --file scripts/data/cyberpunk_cards.json --dry-run`
Expected: exit code 1, output naming `unknown card_type 'Netrunner'`. Remove the bad entry.

Test the Legend rule — temporarily set a Legend's `max_copies` to `3`.
Expected: exit 1, `Legend max_copies must be 1, got 3`. Revert it.

Test collision detection — temporarily change one entry's `card_number` to an existing Digimon number such as `BT9-111`.
Expected: exit 1, `BT9-111 already belongs to game 'digimon'`. Revert it.

- [ ] **Step 4: Dry run, then import**

Run: `python scripts/import_game_cards.py --game cyberpunk --file scripts/data/cyberpunk_cards.json --dry-run`
Expected: exit 0, "Validation passed", "No cross-game card number collisions", and the three would-upsert counts.

Run it again without `--dry-run`. Expected: exit 0, batch progress, and a final count matching the seed length.

Run it a **third** time to prove idempotency. Expected: same final count, no errors.

- [ ] **Step 5: Verify in the database**

```sql
select game, count(*) from public.cards group by game;
select card_type, count(*) from public.cards where game = 'cyberpunk' group by card_type;
select card_number, max_copies from public.cards where game = 'cyberpunk' and card_type = 'Legend' limit 5;
select expansion, count(*) from public.card_expansions
  join public.cards using (card_number) where game = 'cyberpunk' group by expansion;
```

Expected: `cyberpunk` count matches the seed; card types are only the four declared; every Legend has `max_copies = 1`; expansions match the seeded set codes.

- [ ] **Step 6: Commit**

```bash
git add scripts/import_game_cards.py scripts/data/cyberpunk_cards.json
git commit -m "feat: add the Cyberpunk card seed and its validating importer

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 15: Images, price gating and legal attribution

**Files:**
- Modify: `next.config.ts:4-27`, `app/sell/page.tsx`, `app/needs/page.tsx`, `components/needs/need-card-row.tsx`, `components/needs/deck-need-section.tsx`, `components/needs/wishlist-row.tsx`, `components/nav/footer.tsx`, `app/legal/page.tsx`

**Interfaces:**
- Consumes: `game.hasPrices` from Task 12, the seeded `image_url` values from Task 14.
- Produces: no new exports.

- [ ] **Step 1: Allow the Cyberpunk image host**

**Deferred while the seed is empty.** This step cannot be done until real cards are seeded — the hostname is derived from their `image_url` values, and guessing a CDN host would put a fabricated entry in the allowlist. Do it as part of populating the seed, before the first real import, otherwise every Cyberpunk card image will silently fail to render.

Derive the hostname from the seed rather than guessing it:

Run: `python -c "import json;print(sorted({__import__('urllib.parse',fromlist=['urlparse']).urlparse(c['image_url']).netloc for c in json.load(open('scripts/data/cyberpunk_cards.json'))}))"`
Expected: one hostname (more than one means the seed mixes sources — add every host it prints).

Next.js refuses to render `next/image` sources from unlisted hosts, and this bit the project before (`world.digimoncard.com`, per `.claude/learnings.md`). Append to `remotePatterns`, substituting the hostname the command printed:

```ts
      {
        protocol: "https",
        hostname: "<host from the seed's image_url>",
        pathname: "/**",
      },
```

Restart `npm run dev` afterwards — `next.config.ts` is not hot-reloaded.

- [ ] **Step 2: Gate the needs page's money columns**

In `app/needs/page.tsx`, `const { gameId } = useGame()` exists from Task 9; change it to `const { gameId, game } = useGame();`. Pass `showPrices={game.hasPrices}` to `DeckNeedSectionView`, `WishlistSection` and `CopyBuyListButton`, and wrap the summary's estimated-cost figure and the CSV export button in `{game.hasPrices && ...}`.

In `components/needs/deck-need-section.tsx`, `components/needs/wishlist-row.tsx` and `components/needs/need-card-row.tsx`, add `showPrices?: boolean` to the props interface (defaulting to `true`) and wrap every `formatPrice(...)` / `est_cost` element in `{showPrices && ...}`. Thread the prop from section down to row.

The card counts, need quantities and the copy-as-text buy list must keep working — only currency disappears.

- [ ] **Step 3: Give `/sell` an explanatory empty state**

`/sell` is dropped from both navs when `hasPrices` is false, but the route is still reachable by URL and by browser history. At the top of the `SellPage` component's returned JSX, before the existing content:

```tsx
  const { game } = useGame();
  ...
  if (!game.hasPrices) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <TrendingUp size={40} className="mb-3 text-[var(--border)]" />
        <p className="text-sm text-[var(--text-muted)]">
          Price data isn&apos;t available for {game.shortName} yet.
        </p>
        <p className="mt-1 text-xs text-[var(--text-dim)]">
          Switch to a game with price data to see surplus cards worth selling.
        </p>
      </div>
    );
  }
```

Add `import { useGame } from "@/contexts/game-context";` and include `TrendingUp` in the existing Lucide import. Place the early return after all hook calls so hook order stays stable.

- [ ] **Step 4: Add the Cyberpunk trademark disclaimer**

In `components/nav/footer.tsx`, add a sentence alongside the Bandai disclaimer:

```
Cyberpunk and Cyberpunk 2077 are trademarks of CD PROJEKT S.A. The Cyberpunk
Trading Card Game is published by WeirdCo. CardBoard is an unofficial fan
project and is not affiliated with, endorsed, or sponsored by CD PROJEKT or
WeirdCo.
```

Add the same paragraph to the trademark section of `app/legal/page.tsx`, and add the Cyberpunk card data source to the data-attribution list in both files.

- [ ] **Step 5: Verify both games**

Run: `npm test` → PASS. `npx tsc --noEmit`, `npm run lint`, `npm run build` → clean.

Run `npm run dev`, then with **Cyberpunk** active check: `/database` lists the seeded sets and cards with images; filters show Legend/Unit/Gear/Program and the seven rarities; opening a card shows Cost/Power/RAM stat boxes; `/collection` accepts a quantity; `/needs` shows no currency anywhere; Sell is missing from the nav and `/sell` typed directly shows the empty state.

Switch back to **Digimon** and confirm: Sell reappears with prices, `/needs` shows estimated costs again, and card stats are `Lv.`/Cost/DP/Evo.

- [ ] **Step 6: Commit**

```bash
git add next.config.ts app/sell/page.tsx app/needs/page.tsx components/needs/ components/nav/footer.tsx app/legal/page.tsx
git commit -m "feat: gate price UI on hasPrices and attribute the Cyberpunk data

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

# Phase 3 — Deck rules

### Task 16: Surface deck validation

**Files:**
- Create: `components/decks/deck-validation.tsx`
- Modify: `app/decks/[id]/page.tsx:98-103`

**Interfaces:**
- Consumes: `getGame` from `lib/games`, `DeckCardWithCard` and `DeckIssue` from `lib/games/types`, `deck.game`, and `cardsInDeck` + `deckCardMap` already computed on the page.
- Produces: `DeckValidation` (default export), props `{ game: GameId; cards: DeckCardWithCard[] }`.

- [ ] **Step 1: Write the component**

Create `components/decks/deck-validation.tsx`. Validation comes from the registry, so this renders whatever rules the deck's game declares:

```tsx
"use client";

import { AlertTriangle, Check } from "lucide-react";
import { getGame, type GameId } from "@/lib/games";
import type { DeckCardWithCard } from "@/lib/games/types";

export default function DeckValidation({ game, cards }: { game: GameId; cards: DeckCardWithCard[] }) {
  // An empty deck is "not started", not "invalid" — don't scold on a new deck.
  if (cards.length === 0) return null;

  const { deck } = getGame(game);
  const issues = deck.validate(cards);

  if (issues.length === 0) {
    return (
      <div
        className="flex items-center gap-2 rounded-xl border p-3 text-sm font-medium"
        style={{ background: "var(--green-translucent)", borderColor: "var(--green-border)", color: "var(--green)" }}
      >
        <Check size={16} />
        Deck is legal.
      </div>
    );
  }

  return (
    <div
      className="space-y-1.5 rounded-xl border p-3 text-sm"
      style={{ background: "var(--yellow-translucent)", borderColor: "var(--yellow-border)", color: "var(--yellow)" }}
    >
      {issues.map((issue, i) => (
        <div key={i} className="flex items-start gap-2 font-medium">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{issue.message}</span>
        </div>
      ))}
    </div>
  );
}
```

Yellow, not red: an incomplete deck is attention-worthy, not an error. Red stays for destructive actions and the existing "missing cards you don't own" banner.

- [ ] **Step 2: Mount it on the deck detail page**

In `app/decks/[id]/page.tsx`, build the validator input from data the page already has, and render the component directly above the existing `missingCount` banner:

```tsx
  const deckCardsWithCards: DeckCardWithCard[] = (cardsInDeck ?? []).map((card) => ({
    card,
    quantity: deckCardMap.get(card.card_number) ?? 0,
  }));
```

```tsx
      {deck && <DeckValidation game={deck.game} cards={deckCardsWithCards} />}
      {missingCount > 0 && (
```

Add the imports:

```tsx
import DeckValidation from "@/components/decks/deck-validation";
import type { DeckCardWithCard } from "@/lib/games/types";
```

The two banners answer different questions and both belong: validation says "is this deck legal", the existing one says "do you own the cards".

- [ ] **Step 3: Verify against both rule sets**

Run: `npm test` → PASS (the validator's own tests already cover the logic). `npx tsc --noEmit` and `npm run lint` → clean.

Run `npm run dev`. With **Digimon** active, open a deck and confirm: a 50-card deck with ≤5 eggs shows "Deck is legal"; removing a card shows "Deck has 49 cards, minimum is 50."; a new empty deck shows no banner.

With **Cyberpunk** active, create a deck, add 3 differently-named Legends and 40 other cards, and confirm "Deck is legal". Then remove a Legend and confirm "Legends: 2 cards, must be exactly 3."

- [ ] **Step 4: Commit**

```bash
git add components/decks/deck-validation.tsx app/decks/
git commit -m "feat: show per-game deck legality on the deck page

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 17: Dual-write attributes in the Digimon sync

**Files:**
- Modify: `scripts/sync_cards.py:190-208`

**Interfaces:**
- Consumes: `cards.attributes` from Task 1.
- Produces: `transform_card` returns an `attributes` dict alongside the legacy stat columns.

- [ ] **Step 1: Write both representations**

`sync_cards.py` currently writes only the legacy columns, so the next sync would leave `attributes` empty for new cards while the card panel reads from it — new cards would render no stats. In `transform_card`, build the dict and return it:

```python
    dp = raw.get("dp") if raw.get("dp") else None
    play_cost = raw.get("play_cost") if raw.get("play_cost") else None
    level = raw.get("level") if raw.get("level") else None
    evolution_cost = (
        raw.get("evolution_cost") if raw.get("evolution_cost") else None
    )

    # Dual-write: the legacy columns stay until migration 011 confirms parity,
    # but the frontend already reads stats out of attributes via the game
    # registry. Nulls are omitted so `attributes ? 'dp'` stays meaningful.
    attributes = {
        key: value
        for key, value in (
            ("level", level),
            ("play_cost", play_cost),
            ("dp", dp),
            ("evolution_cost", evolution_cost),
        )
        if value is not None
    }

    return {
        "card_number": suffixed_card_number,
        "name": raw.get("name", ""),
        "expansion": expansion,
        "card_type": raw.get("type", ""),
        "color": raw.get("color", ""),
        "rarity": RARITY_MAP.get(rarity_raw, rarity_raw),
        "dp": dp,
        "play_cost": play_cost,
        "level": level,
        "evolution_cost": evolution_cost,
        "image_url": image_url,
        "pretty_url": raw.get("pretty_url", ""),
        "max_copies": 4,
        "base_card_number": card_number,
        "variant_name": variant_name,
        "game": "digimon",
        "attributes": attributes,
    }
```

- [ ] **Step 2: Run the sync and verify parity**

Run: `python scripts/sync_cards.py`
Expected: completes with the same total card count as before.

Then in the SQL editor, re-run the parity query from Task 1 Step 3:

```sql
select count(*) from public.cards
where (attributes->>'dp') is distinct from (case when dp is null then null else dp::text end)
   or (attributes->>'level') is distinct from (case when level is null then null else level::text end)
   or (attributes->>'play_cost') is distinct from (case when play_cost is null then null else play_cost::text end)
   or (attributes->>'evolution_cost') is distinct from (case when evolution_cost is null then null else evolution_cost::text end);
```

Expected: `0`. A non-zero result means the dual-write disagrees with the columns — fix before proceeding, because migration `011` (dropping the legacy columns) depends on this holding.

**That query alone is not a sufficient gate.** `->>` returns SQL NULL both for an absent key and for a key present with a JSON `null`, so `NULL IS DISTINCT FROM NULL` is false in both cases — the query cannot tell "key omitted" from `"dp": null`. Since migration `010` backfilled with `jsonb_strip_nulls`, key *existence* is the property that must match, so run this too:

```sql
select count(*) from public.cards
where (attributes ? 'dp') is distinct from (dp is not null)
   or (attributes ? 'level') is distinct from (level is not null)
   or (attributes ? 'play_cost') is distinct from (play_cost is not null)
   or (attributes ? 'evolution_cost') is distinct from (evolution_cost is not null);
```

Expected: `0`. Both queries must pass before migration `011` is written — the value comparison catches wrong values, this one catches a wrong shape.

- [ ] **Step 3: Verify the app still renders Digimon stats**

Run `npm run dev`, open `/database` with Digimon active, and click a card. Expected: the four stat boxes populate as before.

- [ ] **Step 4: Commit**

```bash
git add scripts/sync_cards.py
git commit -m "feat: dual-write Digimon stats to attributes in the card sync

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 18: Final verification and documentation

**Files:**
- Modify: `CLAUDE.md`, `.claude/memory/project-context.md`, `.claude/memory/decisions.md`

- [ ] **Step 1: Full check**

```bash
npm test && npx tsc --noEmit && npm run lint && npm run build
```

Expected: all four clean.

- [ ] **Step 2: Cross-game regression walkthrough**

With **Digimon** active, confirm every item from Task 11 Step 2 still holds — this is the check that phase 2 and 3 did not disturb the original game.

With **Cyberpunk** active, confirm: database browsing, filters, card panel stats, collection add/remove, deck creation with rules validation, needs list without currency, no Sell tab.

Then reload the page with Cyberpunk active and confirm it **stays** on Cyberpunk (localStorage persistence) and that the switcher label does not flash "Digimon" first.

- [ ] **Step 3: Record the architecture in `CLAUDE.md`**

Under "Key Architecture Decisions", add:

```markdown
- Multi-game: one shared `cards` table with a `game` column and a JSONB
  `attributes` column for per-game stats. All per-game behaviour (card types,
  colours, rarities, displayed stats, deck rules, image fallback, card-number
  case) lives in the game registry at `lib/games/`. Adding a game = a config
  file plus a seed file.
- Active game lives in `contexts/game-context.tsx`, persisted to
  `localStorage["cardboard.game"]`; every query key includes the game id.
- Cyberpunk has no price feed: Cardmarket's API is closed to new applicants and
  Cardtrader hasn't listed the game. `GameConfig.hasPrices` gates all price UI.
- Cyberpunk cards are imported from `scripts/data/cyberpunk_cards.json` via
  `python scripts/import_game_cards.py --game cyberpunk --file <path>`.
```

Add to the Data Sync section:

```bash
python scripts/import_game_cards.py --game cyberpunk --file scripts/data/cyberpunk_cards.json --dry-run
```

- [ ] **Step 4: Update the memory files**

In `.claude/memory/project-context.md`, change the overview line from "Currently focused on Digimon TCG" to note both games, and add `lib/games/` and `scripts/import_game_cards.py` to the repository structure listing.

In `.claude/memory/decisions.md`, under Architecture, record the four decisions with their one-line rationale: shared cards table with a game column; single-column `card_number` PK retained with an importer collision guard; JSONB `attributes` for per-game stats; global switcher rather than game-scoped routes.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md .claude/memory/
git commit -m "docs: record the multi-game architecture

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Deliberately Not In This Plan

From the spec's phase 4, plus scope boundaries:

- **Cyberpunk prices, sell and surplus features.** No automatable feed exists.
- **RAM colour-budget deck validation.** Needs real seed data to test against.
- **Migration `011`** dropping the legacy `dp`/`play_cost`/`level`/`evolution_cost` columns. It runs only after a sync cycle proves parity — and parity means **both** of Task 17 Step 2's queries returning `0`: the value comparison and the key-existence check. The value comparison alone is blind to a null-versus-omitted key mismatch, which is precisely the shape `jsonb_strip_nulls` established. The drop itself is a separate, later change and is irreversible, so it deserves the stronger gate.
- **Migrating Digimon onto the alt-art-as-separate-entity model.** Cyberpunk validates the model on fresh data first.
- **A third game, per-game theming, and game-scoped routes.**
