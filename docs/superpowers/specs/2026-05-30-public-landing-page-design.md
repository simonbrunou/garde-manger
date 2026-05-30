# Public marketing landing page at `/`

**Date:** 2026-05-30
**Status:** Approved (design) — pending implementation plan
**Topic:** Add a landing page for logged-out ("non connecté") visitors

## Problem

A logged-out visit to `/` is currently bounced straight to `/login` by the
`(app)/+layout.server.ts` guard — there is no public welcome or marketing
surface. New visitors who type the bare domain see only a login form.

"Not connected" here means **not authenticated** (FR *"se connecter"* = to log
in), not network-offline.

## Goal

A public **marketing** landing page that introduces Garde-Manger to anonymous
visitors and routes them to sign up / log in. Logged-in visitors skip it and go
straight to the app.

## Approach (decided)

**Approach A — the landing owns `/`.** Since a URL resolves to exactly one
page, the dashboard URL moves so the public landing can own the canonical root.

- New public route at `/`, **outside** the `(app)` and `(auth)` groups, so it
  has no bottom nav / app header — only the root layout (`+layout.svelte`,
  which provides CSS + the shared SVG icon `<defs>`).
- The authenticated dashboard moves from `/` to **`/garde-manger`**.

Rejected:
- **B** (one `/` route branching on auth) — the dashboard depends on the
  `(app)` layout (header, bottom nav, household loading); branching would
  duplicate that. Messy.
- **C** (dashboard keeps `/`, landing at `/bienvenue`) — lower churn, but the
  marketing page never owns the canonical root, which defeats the first-
  impression purpose.

## Visual treatment (decided)

Icon-based feature cards. Reuses the existing Warm & Friendly design tokens
(`.card`, `.btn`, `.btn-primary`, `--text-muted`, `--border`) and the inline
SVG symbols already defined in `src/routes/+layout.svelte`. Works in light and
dark instantly. **No screenshots, no new illustrations.**

## Routing changes

### New files
- `src/routes/+page.svelte` — the landing page UI.
- `src/routes/+page.server.ts` — load:
  - if `locals.user` → `redirect(303, '/garde-manger')`
  - else return `{ locale: locals.locale }`

### Moved files (logic unchanged)
- `src/routes/(app)/+page.svelte` → `src/routes/(app)/garde-manger/+page.svelte`
- `src/routes/(app)/+page.server.ts` → `src/routes/(app)/garde-manger/+page.server.ts`

The `(app)` group keeps its layout/guard; `/garde-manger` is still protected and
still redirects logged-out users to `/login` (deep protected route behaviour is
unchanged).

## Page structure (`/`)

1. **Hero** — 🥕 brand mark + app name, headline tagline, one supporting
   sentence, two CTAs: primary **Créer un compte** → `/signup`, secondary
   **Se connecter** → `/login`.
2. **Feature grid** — 2×2 cards, each an existing SVG symbol + title + one line:
   - `#gm-cat-pantry` — Suivi du stock
   - `#gm-bell` — Alertes de péremption
   - `#gm-scan` — Scan code-barres
   - `#gm-cook` — Idées recettes
3. **Closing CTA band** — repeats the primary CTA with a short prompt line.
4. **Footer** — minimal single line (app name).

Layout: centered, max-width container; feature grid collapses to a single
column on mobile. `<svelte:head>` sets `<title>` + a `meta description`.

## i18n

Add a `landing_*` block to the typed `Messages` interface (defined in
`src/lib/i18n/messages/fr.ts`) and mirror it in `fr.ts` and `en.ts`, preserving
FR/EN key parity (the `i18n.test.ts` parity expectations stay green). FR is the
primary copy. Proposed keys and copy (final wording open to tweaks at
implementation):

| key | FR | EN |
|-----|----|----|
| `landing_hero_title` | Ne gaspillez plus. Cuisinez ce que vous avez. | Stop wasting food. Cook what you have. |
| `landing_hero_subtitle` | Suivez votre garde-manger, soyez alerté avant péremption, et trouvez quoi cuisiner — en quelques secondes. | Track your pantry, get alerted before things expire, and find what to cook — in seconds. |
| `landing_cta_signup` | Créer un compte | Create account |
| `landing_cta_login` | Se connecter | Log in |
| `landing_feature_stock_title` | Suivi du stock | Track your stock |
| `landing_feature_stock_body` | Sachez en un coup d'œil ce qu'il vous reste. | See at a glance what you have left. |
| `landing_feature_expiry_title` | Alertes de péremption | Expiry alerts |
| `landing_feature_expiry_body` | Soyez prévenu avant que ça ne périme. | Get notified before food goes bad. |
| `landing_feature_scan_title` | Scan code-barres | Barcode scan |
| `landing_feature_scan_body` | Ajoutez un produit en le scannant. | Add a product just by scanning it. |
| `landing_feature_cook_title` | Idées recettes | Recipe ideas |
| `landing_feature_cook_body` | Cuisinez à partir de ce que vous avez déjà. | Cook from what's already in your kitchen. |
| `landing_closing_prompt` | Prêt à arrêter le gaspillage ? | Ready to stop wasting food? |
| `landing_meta_description` | Garde-Manger — suivez votre stock alimentaire, évitez le gaspillage et cuisinez malin. | Garde-Manger — track your food stock, cut waste, and cook smart. |

## Link / redirect updates (mechanical)

- `src/lib/components/ui/BottomNav.svelte` — home tab `href="/"` → `/garde-manger`,
  and update the `aria-current` path check accordingly.
- Dashboard "all" location filter `Chip href="/"` → `/garde-manger`
  (now in `(app)/garde-manger/+page.svelte`).
- `src/routes/(app)/item/[id]/+page.svelte` — back link `href="/"` → `/garde-manger`.
- `src/lib/components/PasskeyLogin.svelte` — `redirectTo` default `'/'` → `'/garde-manger'`.
- `src/routes/join/[token]/+page.svelte` — "back home" link stays `/` (correct:
  shows the public landing; forwards to the app if the visitor is logged in).

### Post-auth redirect default (login **and** signup)
`safeLocalPath(p)` in `src/lib/validation.ts` falls back to `'/'`. Give it an
optional `fallback` param (`safeLocalPath(p, fallback = '/')`) and call it with
`'/garde-manger'` in both `(auth)/login/+page.server.ts` and
`(auth)/signup/+page.server.ts` (each uses it in `load` and the default action).
Explicit `?redirectTo=` values are still honoured. The shared helper's default
stays `'/'`, so other callers are unaffected.

### Additional touchpoints surfaced during planning
The dashboard's move off `/` ripples to two more places that hard-code `/`:
- `src/lib/server/push.ts` — the daily reminder deep-links to
  `${origin}/?filter=expiring`; change to `/garde-manger?filter=expiring`. Two
  tests assert this exact string and must be updated in lock-step:
  `src/lib/server/push.test.ts` and `src/lib/server/cron.test.ts`.
- `static/manifest.webmanifest` — `start_url: "/"` → `"/garde-manger"` so the
  installed PWA launches into the app (logged-out users still get forwarded to
  `/login` by the `(app)` guard).
- `src/service-worker.ts` notification fallback `|| '/'` is left as-is — it only
  fires for pushes without an explicit `navigate`, and `/` routes a logged-in
  user onward correctly.

## Testing

- i18n parity / key tests stay green (keys added to both locales).
- Add a server test: `/` redirects a logged-in user to `/garde-manger`, and
  renders the landing (no redirect) for an anonymous user.
- Update any existing test that loads the dashboard at `/` to use
  `/garde-manger`.
- `npm run test` and the existing lint/format checks must pass.

## Out of scope (YAGNI)

No screenshots or device frames, no blog/pricing/about pages, no new
illustrations, no analytics, no SEO/OpenGraph work beyond `<title>` + meta
description.
