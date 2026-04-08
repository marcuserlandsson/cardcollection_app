# Handoff

Current state of work for session continuity. Updated at the end of each session.

## Last Session Summary

**Prepared the app for public hosting: security hardening + legal compliance.**

### Security Changes
- **`proxy.ts`**: Upgraded from session-only refresh to include auth guards on protected routes (`/collection`, `/decks`, `/sell`) — unauthenticated users redirected to `/login?next=...`. Added security headers: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- **`app/auth/callback/route.ts`**: Hardened against open redirect — validates `next` param is relative path, uses env-based origin instead of request origin.
- **`lib/hooks/use-decks.ts`**: `useDeck()` now verifies user ownership via `user_id` filter (defense-in-depth alongside RLS).
- **`app/login/page.tsx`**: Password minimum increased to 8 chars, hint text on signup, respects `?next=` param for post-login redirect, Suspense boundary for `useSearchParams`.
- **`components/decks/deck-form.tsx`**: Deck name capped at 100 chars, description at 500 chars.

### Legal Pages & Footer
- **`components/nav/footer.tsx`**: Footer with Bandai trademark disclaimer, data source attribution (digimoncard.io, Cardtrader, Cardmarket), price disclaimer, links to legal/privacy/terms. Shifts with card detail panel.
- **`app/legal/page.tsx`**: Trademark disclaimer, fair use, data attribution, price disclaimer, liability limitation.
- **`app/privacy/page.tsx`**: Privacy policy — account data, collection data, no tracking, Supabase/Vercel third parties, data deletion.
- **`app/terms/page.tsx`**: Terms of service — acceptable use, IP disclaimer, pricing disclaimer, liability limitation.

### UI Tweak
- **`components/cards/card-panel.tsx`**: Card image now stacked on top (full width, `aspect-[5/7]`, max 280px) instead of small side-by-side thumbnail.

### Security Review
- Ran comprehensive security audit (20 automated tests). All passed.
- Independent security review found 0 high-confidence vulnerabilities. Three initial findings were all validated as false positives (Next.js router prevents open redirects, Supabase RLS enforces DB-level auth, Next.js Image enforces domain whitelist).

## In Progress

Nothing actively in progress.

## Next Steps

- **Deploy to Vercel**: App is now hosting-ready. Set up Vercel project, configure env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`), deploy.
- **Alt art rework**: Treat alt art cards as separate DB entities with independent pricing/collection tracking.
- **Duplicate type interfaces**: `PriceHistoryEntry` and `SellListEntry` are defined twice in `lib/types.ts`.
- **Remaining 8 unmatched `base_in_db=yes` cards**: AD1-024 (sec), BT9-111 (P1), P-207/208/209/210 (b), EX4-065 (P1), P-084 (a).

## Open Questions

- The outlier threshold (50% of median) may need tuning — monitor `OUTLIER_THRESHOLD` in `sell-utils.ts`.
- Sparkline only useful once price history accumulates over several days.
- ~1,988 variants use world CDN `_P{N}` images — likely correct but unverified.
- Next.js 16 uses `proxy.ts` not `middleware.ts` — keep this in mind for future middleware work.
- `NEXT_PUBLIC_SITE_URL` env var needed for auth callback origin in production.
