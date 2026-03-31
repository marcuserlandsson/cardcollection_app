# Alt Art Variant Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote card variants from a secondary display table into first-class card entities so each art version is independently browsable, collectible, and (eventually) priceable.

**Architecture:** Each variant becomes its own row in the `cards` table with a synthetic key (e.g. "BT1-084-V2"). A new `base_card_number` column groups variants for deck building and surplus calculation. The `card_variants` table is retired. The sync script is updated to produce one card per variant. Frontend components are updated to use the new fields and a `useCardSiblings` hook replaces `useCardVariants`.

**Tech Stack:** Supabase (Postgres migrations), Python (sync script), Next.js/TypeScript/React Query (frontend)

**Spec:** `docs/superpowers/specs/2026-03-31-alt-art-variant-rework-design.md`

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/005_promote_variants.sql`

This migration adds new columns to `cards`, promotes variant data from `card_variants` into `cards`, migrates collection data, and drops `card_variants`.

- [ ] **Step 1: Create the migration file**

```sql
-- ============================================
-- Promote card variants into the cards table
-- ============================================
-- Each art version (regular, alt art, rare pull) becomes its own row
-- in the cards table with a synthetic card_number suffix.
-- See docs/superpowers/specs/2026-03-31-alt-art-variant-rework-design.md

-- Step 1: Add new columns to cards
alter table public.cards
  add column base_card_number text,
  add column variant_name text not null default 'Regular';

-- Step 2: Backfill base_card_number for existing cards
update public.cards
  set base_card_number = card_number;

-- Step 3: Make base_card_number not null after backfill
alter table public.cards
  alter column base_card_number set not null;

-- Step 4: Insert variant cards from card_variants (variant_index > 1)
-- Each becomes a new card row with suffixed card_number
insert into public.cards (
  card_number, name, expansion, card_type, color, rarity,
  dp, play_cost, level, evolution_cost, image_url, pretty_url,
  max_copies, base_card_number, variant_name
)
select
  cv.card_number || '-V' || cv.variant_index as card_number,
  c.name,
  c.expansion,
  c.card_type,
  c.color,
  c.rarity,
  c.dp,
  c.play_cost,
  c.level,
  c.evolution_cost,
  coalesce(cv.alt_art_url, c.image_url) as image_url,
  c.pretty_url,
  c.max_copies,
  cv.card_number as base_card_number,
  cv.variant_name
from public.card_variants cv
join public.cards c on c.card_number = cv.card_number
where cv.variant_index > 1;

-- Step 5: Copy card_expansions entries for new variant cards
insert into public.card_expansions (card_number, expansion)
select
  cv.card_number || '-V' || cv.variant_index as card_number,
  ce.expansion
from public.card_variants cv
join public.card_expansions ce on ce.card_number = cv.card_number
where cv.variant_index > 1
on conflict (card_number, expansion) do nothing;

-- Step 6: Add index on base_card_number for sibling queries
create index idx_cards_base_card_number on public.cards (base_card_number);

-- Step 7: Drop card_variants table (no longer needed)
drop table public.card_variants;
```

- [ ] **Step 2: Apply the migration to the Supabase database**

Run the migration via the Supabase dashboard SQL editor or CLI:
```bash
# If using Supabase CLI:
supabase db push
# Or paste the SQL directly into the Supabase dashboard SQL editor
```

Expected: No errors. The `cards` table now has `base_card_number` and `variant_name` columns, variant cards exist as separate rows, and `card_variants` table is gone.

- [ ] **Step 3: Verify the migration**

Run these queries in the Supabase SQL editor to confirm:
```sql
-- Check new columns exist and are populated
select card_number, base_card_number, variant_name
from cards
where base_card_number != card_number
limit 10;

-- Should show rows like: BT1-084-V2 | BT1-084 | Alternate Art

-- Check card_variants table is gone
select count(*) from card_variants;
-- Should error: relation "card_variants" does not exist

-- Check total card count increased
select count(*) from cards;
-- Should be ~8,500 (up from ~4,100)
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/005_promote_variants.sql
git commit -m "feat: migrate card variants into cards table as first-class entities"
```

---

### Task 2: Update Sync Script

**Files:**
- Modify: `scripts/sync_cards.py`

The sync script currently groups API entries by card_number and creates separate `card_variants` rows. We change it to produce one `cards` row per variant entry, with suffixed card_numbers for non-primary variants.

- [ ] **Step 1: Update the `transform_card` function to accept variant parameters**

In `scripts/sync_cards.py`, replace the existing `transform_card` function (lines 166-212) with:

```python
def transform_card(
    raw: dict,
    variant_index: int = 1,
    variant_name: str = "Regular",
    alt_art_url: str | None = None,
) -> dict:
    card_number = raw["id"]
    rarity_raw = (raw.get("rarity") or "").lower().strip()

    set_names = raw.get("set_name", [])
    expansion = ""
    if set_names:
        prefix = re.match(r"^([A-Z]+)(\d+)", card_number)
        if prefix:
            card_prefix = prefix.group(1)
            card_num = prefix.group(2)
            for sn in set_names:
                set_code = sn.split(":")[0].strip() if ":" in sn else sn
                normalized = set_code.replace("-", "").replace("0", "").upper()
                candidate = (card_prefix + card_num).replace("0", "").upper()
                if normalized == candidate:
                    expansion = set_code
                    break
        if not expansion:
            first_set = set_names[0]
            expansion = (
                first_set.split(":")[0].strip()
                if ":" in first_set
                else first_set
            )

    # Build the suffixed card_number for non-primary variants
    suffixed_card_number = card_number
    if variant_index > 1:
        suffixed_card_number = f"{card_number}-V{variant_index}"

    # Use alt art image URL if available, otherwise default
    image_url = alt_art_url if alt_art_url else f"{IMAGE_BASE_URL}/{card_number}.jpg"

    return {
        "card_number": suffixed_card_number,
        "name": raw.get("name", ""),
        "expansion": expansion,
        "card_type": raw.get("type", ""),
        "color": raw.get("color", ""),
        "rarity": RARITY_MAP.get(rarity_raw, rarity_raw),
        "dp": raw.get("dp") if raw.get("dp") else None,
        "play_cost": raw.get("play_cost") if raw.get("play_cost") else None,
        "level": raw.get("level") if raw.get("level") else None,
        "evolution_cost": (
            raw.get("evolution_cost") if raw.get("evolution_cost") else None
        ),
        "image_url": image_url,
        "pretty_url": raw.get("pretty_url", ""),
        "max_copies": 4,
        "base_card_number": card_number,
        "variant_name": variant_name,
    }
```

- [ ] **Step 2: Rewrite the sync loop in `sync_cards()` to produce one card per variant**

Replace the card-building section of `sync_cards()` (the loop starting at line 243 `for card_id, entries in card_entries.items():` through line 288 ending with the variants append) with:

```python
    for card_id, entries in card_entries.items():
        expansion_code = ""
        set_id = None

        # Collect all expansions this card belongs to
        set_names = entries[0].get("set_name", [])
        for sn in set_names:
            exp_code = sn.split(":")[0].strip() if ":" in sn else sn
            if exp_code:
                card_expansion_set.add((card_id, exp_code))

        # Track alt art index separately (for image URL variant_idx)
        alt_art_idx = 0

        for v_index, raw in enumerate(entries, start=1):
            tcgplayer_name = raw.get("tcgplayer_name", "")
            is_alt_art = "Alternate Art" in tcgplayer_name

            # Determine variant name
            if v_index == 1:
                variant_name = "Regular"
            elif tcgplayer_name == raw.get("name", ""):
                variant_name = "Regular"
            else:
                match = re.search(r"\(([^)]+)\)$", tcgplayer_name)
                variant_name = match.group(1) if match else tcgplayer_name

            # Build alt art image URL
            alt_art_url = None
            if is_alt_art:
                # Resolve set_id lazily (only when needed)
                if set_id is None:
                    first_card = transform_card(entries[0])
                    expansion_code = first_card["expansion"]
                    set_id = expansion_set_ids.get(expansion_code, 0)
                if set_id:
                    alt_art_idx += 1
                    alt_art_url = get_alt_art_url(card_id, set_id, alt_art_idx)
                    alt_art_count += 1

            card_row = transform_card(
                raw,
                variant_index=v_index,
                variant_name=variant_name,
                alt_art_url=alt_art_url,
            )
            cards[card_row["card_number"]] = card_row

            # Add expansion entries for variant cards too
            if v_index > 1:
                for sn in set_names:
                    exp_code = sn.split(":")[0].strip() if ":" in sn else sn
                    if exp_code:
                        card_expansion_set.add((card_row["card_number"], exp_code))
```

- [ ] **Step 3: Remove the card_variants upsert section**

Delete the entire card_variants upsert block (lines 348-358):
```python
    # Upsert variants
    if variants:
        print(f"Upserting {len(variants)} card variants in batches...")
        for i in range(0, len(variants), batch_size):
            batch = variants[i : i + batch_size]
            supabase.table("card_variants").upsert(
                batch, on_conflict="card_number,tcgplayer_id"
            ).execute()
            print(
                f"  Upserted {min(i + batch_size, len(variants))}/{len(variants)}"
            )
```

Also remove the `variants: list[dict] = []` initialization (line 239) and the final variant count print line. Update the summary print to:

```python
    result = supabase.table("cards").select("card_number", count="exact").execute()
    print(f"Done! Total cards (including variants): {result.count}")
```

- [ ] **Step 4: Update the docstring**

Replace the module docstring at the top of the file (lines 1-13) with:

```python
"""
Sync cards from the Digimon Card API into Supabase.

Each API entry (including alt arts, reprints, promos) becomes its own row
in the cards table with a suffixed card_number (e.g. BT1-084-V2).
The base_card_number column groups all variants of the same game card.

See docs/card-variants.md for the data model documentation.

Usage:
    pip install -r scripts/requirements.txt
    python scripts/sync_cards.py

Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env or environment.
"""
```

- [ ] **Step 5: Run the sync script to verify it works**

```bash
python scripts/sync_cards.py
```

Expected: Script completes successfully. Output shows ~8,500 total cards (up from ~4,100). No card_variants references.

- [ ] **Step 6: Commit**

```bash
git add scripts/sync_cards.py
git commit -m "feat: sync script produces one card row per variant with suffixed card_numbers"
```

---

### Task 3: Update TypeScript Types and Utility Functions

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/utils.ts`

- [ ] **Step 1: Update the Card interface and remove CardVariant**

In `lib/types.ts`, add the two new fields to `Card` and remove the `CardVariant` interface.

Add after line 14 (`last_updated: string;`):
```typescript
  base_card_number: string;
  variant_name: string;
```

Remove the entire `CardVariant` interface (lines 40-48):
```typescript
export interface CardVariant {
  id: string;
  card_number: string;
  variant_name: string;
  variant_index: number;
  tcgplayer_id: number | null;
  alt_art_url: string | null;
  created_at: string;
}
```

- [ ] **Step 2: Add `getBaseCardNumber` utility function**

In `lib/utils.ts`, add this function after the `getCardImageUrl` function (after line 59):

```typescript
export function getBaseCardNumber(cardNumber: string): string {
  return cardNumber.replace(/-V\d+$/, "");
}
```

- [ ] **Step 3: Update `buildSellableCards` to group by base_card_number**

In `lib/utils.ts`, replace the entire `buildSellableCards` function (lines 14-49) with:

```typescript
export function buildSellableCards(
  cards: Card[],
  collection: CollectionEntry[],
  deckCards: DeckCard[],
  prices: CardPrice[]
): SellableCard[] {
  const collectionMap = new Map(
    collection.map((c) => [c.card_number, c.quantity])
  );
  const priceMap = new Map(prices.map((p) => [p.card_number, p]));
  const deckCardsByBase = new Map<string, DeckCard[]>();
  for (const dc of deckCards) {
    const existing = deckCardsByBase.get(dc.card_number) || [];
    existing.push(dc);
    deckCardsByBase.set(dc.card_number, existing);
  }

  // Group cards by base_card_number for surplus calculation
  const cardsByBase = new Map<string, Card[]>();
  for (const card of cards) {
    const base = card.base_card_number;
    const existing = cardsByBase.get(base) || [];
    existing.push(card);
    cardsByBase.set(base, existing);
  }

  const sellable: SellableCard[] = [];

  for (const [base, variants] of cardsByBase) {
    // Total owned across all variants
    const totalOwned = variants.reduce(
      (sum, v) => sum + (collectionMap.get(v.card_number) || 0),
      0
    );
    if (totalOwned === 0) continue;

    // Deck usage is by base card_number
    const usages = deckCardsByBase.get(base) || [];
    const needed = Math.max(
      variants[0].max_copies,
      usages.reduce((sum, dc) => sum + dc.quantity, 0)
    );
    const surplus = Math.max(0, totalOwned - needed);

    if (surplus > 0) {
      // Recommend selling Regular variants first (keep alt arts for playing)
      // Sort: Regular first, then by variant name
      const sortedVariants = [...variants].sort((a, b) => {
        if (a.variant_name === "Regular" && b.variant_name !== "Regular") return -1;
        if (a.variant_name !== "Regular" && b.variant_name === "Regular") return 1;
        return a.card_number.localeCompare(b.card_number);
      });

      // Pick sellable variants starting from Regular
      let remaining = surplus;
      for (const variant of sortedVariants) {
        if (remaining <= 0) break;
        const owned = collectionMap.get(variant.card_number) || 0;
        if (owned === 0) continue;
        const sellQty = Math.min(owned, remaining);
        const price = priceMap.get(base) || null;
        const totalValue = price?.price_trend ? sellQty * price.price_trend : null;
        sellable.push({
          card: variant,
          owned,
          needed,
          surplus: sellQty,
          price,
          total_value: totalValue,
        });
        remaining -= sellQty;
      }
    }
  }

  return sellable.sort(
    (a, b) => (b.total_value ?? 0) - (a.total_value ?? 0)
  );
}
```

- [ ] **Step 4: Update `getCardImageUrl` to handle variant card_numbers**

In `lib/utils.ts`, replace the `getCardImageUrl` function (lines 57-59) with:

```typescript
export function getCardImageUrl(cardNumber: string): string {
  const base = cardNumber.replace(/-V\d+$/, "");
  return `https://images.digimoncard.io/images/cards/${base}.jpg`;
}
```

Note: This is now only used as a fallback — variant cards have their correct `image_url` set in the database. But this keeps the function working for any card_number format.

- [ ] **Step 5: Verify the build compiles**

```bash
npm run build
```

Expected: Build may fail due to references to `CardVariant` type in other files. That's expected — we'll fix those in the next tasks.

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/utils.ts
git commit -m "feat: update Card type with base_card_number/variant_name, rework surplus to prefer selling regulars"
```

---

### Task 4: Update Hooks (Replace useCardVariants with useCardSiblings)

**Files:**
- Modify: `lib/hooks/use-cards.ts`

- [ ] **Step 1: Remove the `useCardVariants` hook and add `useCardSiblings`**

In `lib/hooks/use-cards.ts`, remove the `CardVariant` import from line 5. Change:

```typescript
import type { Card, Expansion, CardVariant } from "@/lib/types";
```

to:

```typescript
import type { Card, Expansion } from "@/lib/types";
```

Then replace the `useCardVariants` function (lines 172-186) with:

```typescript
export function useCardSiblings(baseCardNumber: string | null) {
  return useQuery<Card[]>({
    queryKey: ["card-siblings", baseCardNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("base_card_number", baseCardNumber!)
        .order("card_number");
      if (error) throw error;
      return data as Card[];
    },
    enabled: !!baseCardNumber,
  });
}
```

- [ ] **Step 2: Update `useCardExpansions` to use base_card_number**

Variant cards share the same expansions as their base card. Update the hook to accept a base card number and query by it. Replace the `useCardExpansions` function (lines 188-201) with:

```typescript
export function useCardExpansions(baseCardNumber: string | null) {
  return useQuery<{ card_number: string; expansion: string }[]>({
    queryKey: ["card-expansions", baseCardNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("card_expansions")
        .select("card_number, expansion")
        .eq("card_number", baseCardNumber!);
      if (error) throw error;
      return data as { card_number: string; expansion: string }[];
    },
    enabled: !!baseCardNumber,
  });
}
```

- [ ] **Step 3: Verify the build compiles**

```bash
npm run build
```

Expected: May still have errors from components importing `useCardVariants`. We'll fix those next.

- [ ] **Step 4: Commit**

```bash
git add lib/hooks/use-cards.ts
git commit -m "feat: replace useCardVariants with useCardSiblings, use base_card_number for expansions"
```

---

### Task 5: Update Card Panel (Replace Variant Thumbnails with Other Versions)

**Files:**
- Modify: `components/cards/card-panel.tsx`
- Delete: `components/cards/card-variants.tsx`

- [ ] **Step 1: Create the CardSiblings component inline or as a new file**

Create a new file `components/cards/card-siblings.tsx`:

```typescript
"use client";

import Image from "next/image";
import { useCardSiblings } from "@/lib/hooks/use-cards";
import type { Card } from "@/lib/types";

interface CardSiblingsProps {
  card: Card;
  onSiblingSelect: (card: Card) => void;
}

export default function CardSiblings({ card, onSiblingSelect }: CardSiblingsProps) {
  const { data: siblings } = useCardSiblings(card.base_card_number);

  if (!siblings || siblings.length <= 1) return null;

  return (
    <div className="mt-3 rounded-lg bg-[var(--elevated)] p-3">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Other Versions</div>
      <div className="flex gap-2">
        {siblings
          .filter((s) => s.card_number !== card.card_number)
          .map((sibling) => (
            <button
              key={sibling.card_number}
              onClick={() => onSiblingSelect(sibling)}
              className="relative h-[50px] w-[36px] flex-shrink-0 overflow-hidden rounded border-2 border-[var(--border)] transition-colors hover:border-[var(--accent)]"
              title={sibling.variant_name}
            >
              <Image
                src={sibling.image_url || `https://images.digimoncard.io/images/cards/${sibling.base_card_number}.jpg`}
                alt={sibling.variant_name}
                fill
                sizes="36px"
                className="object-cover"
              />
            </button>
          ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update card-panel.tsx to use CardSiblings instead of CardVariants**

In `components/cards/card-panel.tsx`, make these changes:

Remove the import of `CardVariants` (line 10):
```typescript
import CardVariants from "@/components/cards/card-variants";
```

Add the import for `CardSiblings`:
```typescript
import CardSiblings from "@/components/cards/card-siblings";
```

Remove the `variantImageUrl` state and `prevCardRef` logic (lines 28-38):
```typescript
  const [variantImageUrl, setVariantImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const prevCardRef = useRef<string | null>(null);

  // Reset variant/image state when card changes (no effect needed)
  const currentCardNumber = card?.card_number ?? null;
  if (currentCardNumber !== prevCardRef.current) {
    prevCardRef.current = currentCardNumber;
    if (variantImageUrl !== null) setVariantImageUrl(null);
    if (imageError) setImageError(false);
  }
```

Replace with just the image error state:
```typescript
  const [imageError, setImageError] = useState(false);
  const prevCardRef = useRef<string | null>(null);

  const currentCardNumber = card?.card_number ?? null;
  if (currentCardNumber !== prevCardRef.current) {
    prevCardRef.current = currentCardNumber;
    if (imageError) setImageError(false);
  }
```

Update the `displayImageUrl` (line 58):
```typescript
  const displayImageUrl = card ? (variantImageUrl || getCardImageUrl(card.card_number)) : "";
```

Replace with:
```typescript
  const displayImageUrl = card ? (card.image_url || getCardImageUrl(card.base_card_number)) : "";
```

Remove the `useState` import for `useState` if no longer needed — actually it's still needed for `imageError`. But remove `useRef` only if unused. Keep both since `prevCardRef` still uses `useRef`.

Replace the `CardVariants` section (lines 146-152):
```typescript
        <CardVariants
          cardNumber={card.card_number}
          onVariantSelect={(url) => {
            setVariantImageUrl(url);
            setImageError(false);
          }}
        />
```

With:
```typescript
        <CardSiblings
          card={card}
          onSiblingSelect={onSiblingSelect}
        />
```

The `onSiblingSelect` callback needs to be passed from the parent. Update the component props:

Change the component signature from:
```typescript
export default function CardPanel({ card, onClose }: { card: Card | null; onClose: () => void }) {
```

To:
```typescript
export default function CardPanel({ card, onClose, onCardSelect }: { card: Card | null; onClose: () => void; onCardSelect?: (card: Card) => void }) {
```

Then define `onSiblingSelect` inside the component:
```typescript
  const onSiblingSelect = (sibling: Card) => {
    if (onCardSelect) onCardSelect(sibling);
  };
```

Also update the `useCardExpansions` call to pass `base_card_number`. In the `CardExpansions` component usage:
```typescript
        <CardExpansions cardNumber={card.card_number} />
```

Change to:
```typescript
        <CardExpansions cardNumber={card.base_card_number} />
```

And add the variant name badge to the card header. After the color badge (line 110):
```typescript
              <span className="rounded-md px-2 py-0.5 text-xs font-medium" style={{ background: colorStyle.bg, color: colorStyle.color }}>{card.color}</span>
```

Add:
```typescript
              {card.variant_name !== "Regular" && (
                <span className="rounded-md px-2 py-0.5 text-xs font-medium" style={{ background: "var(--accent-translucent)", color: "var(--accent)" }}>{card.variant_name}</span>
              )}
```

- [ ] **Step 3: Delete the old card-variants.tsx file**

Delete `components/cards/card-variants.tsx` — it is no longer used.

- [ ] **Step 4: Update all CardPanel usages to pass `onCardSelect`**

Search for `<CardPanel` in the codebase. It's used in 4 pages. Update each one:

**`app/database/page.tsx`** — find:
```typescript
<CardPanel card={selectedCard} onClose={handleClosePanel} />
```
Change to:
```typescript
<CardPanel card={selectedCard} onClose={handleClosePanel} onCardSelect={setSelectedCard} />
```

**`app/collection/page.tsx`** — find:
```typescript
<CardPanel card={selectedCard} onClose={handleClosePanel} />
```
Change to:
```typescript
<CardPanel card={selectedCard} onClose={handleClosePanel} onCardSelect={setSelectedCard} />
```

**`app/sell/page.tsx`** — find:
```typescript
<CardPanel card={selectedCard} onClose={() => setSelectedCard(null)} />
```
Change to:
```typescript
<CardPanel card={selectedCard} onClose={() => setSelectedCard(null)} onCardSelect={setSelectedCard} />
```

**`app/decks/[id]/page.tsx`** — find:
```typescript
<CardPanel card={selectedCard} onClose={() => setSelectedCard(null)} />
```
Change to:
```typescript
<CardPanel card={selectedCard} onClose={() => setSelectedCard(null)} onCardSelect={setSelectedCard} />
```

- [ ] **Step 5: Verify the build compiles**

```bash
npm run build
```

Expected: Build succeeds. No references to `CardVariants` or `useCardVariants` remain.

- [ ] **Step 6: Commit**

```bash
git add components/cards/card-siblings.tsx components/cards/card-panel.tsx app/database/page.tsx app/collection/page.tsx app/sell/page.tsx app/decks/[id]/page.tsx
git rm components/cards/card-variants.tsx
git commit -m "feat: replace variant thumbnails with Other Versions sibling list in card panel"
```

---

### Task 6: Update Deck Card Addition to Use base_card_number

**Files:**
- Modify: `components/cards/card-deck-usage.tsx`

Deck usage should match by `base_card_number` since decks reference base card numbers. When a variant card is open, the deck usage section should still show decks that contain the base card.

- [ ] **Step 1: Update CardDeckUsage to match by base_card_number**

Replace the entire `components/cards/card-deck-usage.tsx` with:

```typescript
"use client";

import Link from "next/link";
import { useDecks, useAllDeckCards } from "@/lib/hooks/use-decks";
import { getBaseCardNumber } from "@/lib/utils";

interface CardDeckUsageProps {
  cardNumber: string;
}

export default function CardDeckUsage({ cardNumber }: CardDeckUsageProps) {
  const { data: decks } = useDecks();
  const { data: allDeckCards } = useAllDeckCards();

  if (!decks || !allDeckCards) return null;

  const baseCardNumber = getBaseCardNumber(cardNumber);

  const usages = allDeckCards
    .filter((dc) => dc.card_number === baseCardNumber)
    .map((dc) => {
      const deck = decks.find((d) => d.id === dc.deck_id);
      return deck ? { deckId: deck.id, deckName: deck.name, quantity: dc.quantity } : null;
    })
    .filter(Boolean) as { deckId: string; deckName: string; quantity: number }[];

  return (
    <div className="mt-3 rounded-lg bg-[var(--elevated)] p-3">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Used in Decks</div>
      {usages.length === 0 ? (
        <p className="text-xs text-[var(--text-dim)]">Not used in any deck</p>
      ) : (
        <div className="space-y-1.5">
          {usages.map((usage) => (
            <Link
              key={usage.deckId}
              href={`/decks/${usage.deckId}`}
              className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-[var(--surface)]"
            >
              <span className="text-[var(--text-secondary)]">{usage.deckName}</span>
              <span className="text-xs font-medium text-[var(--accent)]">x{usage.quantity}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the build compiles**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/cards/card-deck-usage.tsx
git commit -m "feat: deck usage matches by base_card_number so variants show correct deck info"
```

---

### Task 7: Update Import Modal to Handle Variant Card Numbers

**Files:**
- Modify: `components/collection/import-modal.tsx`

When importing card lists, card numbers like "BT1-084" should map to the Regular variant (which keeps the same card_number). The validation query already checks against the `cards` table, so this should work without changes. However, we should ensure the validation lookup is correct — imported base card numbers need to match cards where `card_number = base_card_number` (i.e. Regular variants).

- [ ] **Step 1: Verify import works with new card data**

The import modal's `validateParsed` function fetches all card_numbers from the `cards` table to build a known set. With the variant rework, this set now includes both "BT1-084" (Regular) and "BT1-084-V2" (Alt Art). Since import inputs use base card numbers (e.g. "BT1-084"), they'll match the Regular variant — which is correct.

No code changes needed. Verify by running:

```bash
npm run build
```

Expected: Build succeeds. Import modal continues to work.

- [ ] **Step 2: Commit (skip if no changes)**

No commit needed — this task is verification only.

---

### Task 8: Update Worth Selling Dashboard Widget

**Files:**
- Modify: `components/dashboard/worth-selling.tsx`

The `buildSellableCards` utility was already updated in Task 3 to group by `base_card_number`. The `WorthSelling` component calls `buildSellableCards` which now returns variant-level recommendations. The component should work without changes, but we need to verify it fetches variant cards from the collection correctly.

- [ ] **Step 1: Verify the worth-selling component works with new data**

The component fetches cards from the `cards` table using card_numbers from the collection. Since collection entries now point to variant card_numbers (e.g. "BT1-084" for Regular, "BT1-084-V2" for Alt Art), the `.in("card_number", cardNumbers)` query will fetch the correct variant cards, each with their `base_card_number` set.

No code changes needed. Verify by running:

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 2: Commit (skip if no changes)**

No commit needed — this task is verification only.

---

### Task 9: Update Documentation

**Files:**
- Modify: `docs/card-variants.md`

- [ ] **Step 1: Update the card-variants documentation to reflect the new architecture**

Replace the contents of `docs/card-variants.md` with updated documentation that reflects the promoted variant model. Key changes to document:

- Variants are now rows in the `cards` table with suffixed `card_number` (e.g. "BT1-084-V2")
- `base_card_number` groups all variants of the same game card
- `variant_name` labels each variant ("Regular", "Alternate Art", "Rare Pull")
- The `card_variants` table no longer exists
- The sync script produces one card per API entry
- Collection tracking is per-variant
- Deck tracking uses `base_card_number`
- Surplus calculation groups by `base_card_number`, recommends selling Regular first

- [ ] **Step 2: Commit**

```bash
git add docs/card-variants.md
git commit -m "docs: update card-variants documentation for promoted variant model"
```

---

### Task 10: Final Build Verification and Cleanup

**Files:**
- All modified files

- [ ] **Step 1: Run the full build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: No lint errors.

- [ ] **Step 3: Verify no remaining references to card_variants table or CardVariant type**

Search the codebase for stale references:

```bash
grep -r "card_variants" --include="*.ts" --include="*.tsx" --include="*.py" .
grep -r "CardVariant" --include="*.ts" --include="*.tsx" .
grep -r "useCardVariants" --include="*.ts" --include="*.tsx" .
```

Expected: No matches (except possibly in migration files or documentation, which is fine).

- [ ] **Step 4: Commit any remaining cleanup**

```bash
git add -A
git commit -m "chore: final cleanup for alt art variant rework"
```
