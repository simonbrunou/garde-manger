# Garde-Manger — M2 Inventory & Catalogue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`. **Every task's verification MUST run `bun run lint` AND `bun run check` AND `bun test`** (M1 lesson: lint drift only caught at milestone end).

**Goal:** A household's members can add fresh produce (picked from a European catalogue, with a computed "best-before/DDM" estimate) and free-text items, see them on an urgency-first home screen (🔴 vite / 🟠 bientôt / 🟢 ok), and mark them eaten/thrown-out — all scoped to the active household, bilingual FR/EN.

**Architecture:** Extends the DB with `foods`, `shelf_lives`, `inventory_items` (with a stored generated `effective_date`). Server-only `$lib/server/catalogue.ts` (search + DDM computation) and `$lib/server/inventory.ts` (CRUD + lifecycle), every call authorized via `requireMembership`. Hand-rolled i18n (`$lib/i18n`): typed FR/EN message objects, locale resolved server-side in hooks. Home + add-fresh are zero-JS (`(app)` group default). Scanning/Open Food Facts is **M3** — M2 covers the `fresh` and free-text (`custom`) paths only (the `packaged` columns exist but aren't exercised yet).

**Tech Stack:** SvelteKit 2 + Svelte 5, Bun, Drizzle/`bun:sqlite`, valibot, hand-rolled i18n, `Intl` for dates/plurals.

---

## Milestone context
M2 of 6. Builds on M1 (auth, households, `requireMembership`, `(app)/+layout.server.ts` exposing `activeHouseholdId`). **Authorize every household query against `activeHouseholdId`/`params` via `requireMembership(db, householdId, user.id)` in `+page.server.ts`/actions — never the layout, never trust the cookie directly.**

## File structure (M2)
```
src/lib/server/
├── db/schema.ts            # + foods, shelf_lives, inventory_items (+ effective_date generated, indexed)
├── catalogue.ts (+test)    # searchFoods(db, q, locale); computeBestBy(shelfLife, location, addedAt)
├── inventory.ts (+test)    # addItem, listActive, getItem, setStatus (consume/discard) — all take householdId, authz at the route
└── seed/
    ├── foods.data.ts       # the curated ~150–250 foods + shelf-life rows (FR/EN) — DRAFT, needs human review
    └── seed.ts             # idempotent seeder (upsert by stable food key); `bun run db:seed`
src/lib/i18n/
├── messages/fr.ts, en.ts   # typed message objects (+ tiny interpolation/plural helpers)
└── index.ts                # Locale type, resolveLocale(), m(locale) accessor
src/routes/(app)/
├── +layout.server.ts       # + expose `locale`
├── +page.svelte / +page.server.ts   # urgency-first home (list + filter + consume/discard actions)
├── add/+page.svelte / +page.server.ts # the "Ajouter" sheet → fresh (catalogue search) / custom
└── account/+page.*          # + language switcher (sets gm_locale + users.locale)
src/hooks.server.ts          # + resolve locale → locals.locale
```

---

### Task 1 — Schema + migration 0002 (foods, shelf_lives, inventory_items)
**Files:** `schema.ts` (extend), `drizzle/0002_*` (generated), `schema-inventory.test.ts`.
- [ ] Add tables:
  - `foods`: `id` (text pk), `nameFr`, `nameEn`, `subtitleFr` (null), `subtitleEn` (null), `keywordsFr` (null), `keywordsEn` (null), `category` (text), `defaultLocation` (`'pantry'|'fridge'|'freezer'`).
  - `shelf_lives`: `id`, `foodId`→foods (cascade), `location` enum, `basis` (`'purchase'|'opened'|'unspecified'`), `min` (int), `max` (int), `unit` (`'hours'|'days'|'weeks'|'months'|'years'`), `notRecommended` (bool default false), `tipsFr` (null), `tipsEn` (null).
  - `inventory_items`: `id`, `householdId`→households (cascade), `addedBy`→users, `kind` (`'packaged'|'fresh'`), `barcode` (text null — no FK yet; products table is M3), `foodId`→foods (null), `customName` (text null), `quantity` (int default 1), `location` enum, `addedAt` (ts), `useByDate` (ts null), `bestByDate` (ts null), `isEstimate` (bool default false), `status` (`'active'|'consumed'|'discarded'` default 'active'), `closedAt` (ts null), `notes` (text null), and a **stored generated** `effectiveDate`:
    ```ts
    effectiveDate: integer('effective_date', { mode: 'timestamp' })
      .generatedAlwaysAs(sql`coalesce(use_by_date, best_by_date)`, { mode: 'stored' })
    ```
  - Index: `index('inv_household_status_eff').on(t.householdId, t.status, t.effectiveDate)`.
- [ ] `bun run db:generate` → commit `0002_*`.
- [ ] Test (temp DB): insert a food + shelf_life; insert an inventory_item with only `bestByDate` set → assert `effectiveDate === bestByDate`; with `useByDate` set → `effectiveDate === useByDate`; FK + enum behavior; the index exists (query `sqlite_master`).
- [ ] Gates (lint+check+test) green. **Commit** `feat(db): inventory + catalogue tables, migration 0002`.

### Task 2 — Hand-rolled i18n infrastructure
**Files:** `src/lib/i18n/{index.ts,messages/fr.ts,messages/en.ts}`, `hooks.server.ts`, `(app)/+layout.server.ts` (+ `(auth)` layout if needed).
- [ ] `messages/fr.ts` + `en.ts`: a typed object with the SAME keys in both (e.g. `nav_account`, `home_band_urgent`, `add_title`, `lifecycle_ate`, `lifecycle_tossed`, `dlc_label`, `ddm_estimate(date)`, `items_count(n)` …). Use functions for interpolation/plurals (`items_count: (n) => ...` with `Intl.PluralRules`). `en.ts` must satisfy `typeof fr` (TS enforces parity).
- [ ] `index.ts`: `export type Locale='fr'|'en'`; `export const messages = { fr, en }`; `export function m(locale: Locale) { return messages[locale]; }`; `export function resolveLocale(opts:{ userLocale?, cookie?, acceptLanguage? }): Locale` (priority: user → cookie → Accept-Language `fr`/`en` → default `'fr'`). No `$app`/`$env` imports (unit-testable).
- [ ] `hooks.server.ts`: after resolving the user, set `event.locals.locale = resolveLocale({ userLocale: user?.locale, cookie: event.cookies.get('gm_locale'), acceptLanguage: event.request.headers.get('accept-language') })`. Add `locale` to `App.Locals`.
- [ ] Expose `locale` + `t: m(locale)` (or just `locale`, and call `m()` in components) from `(app)/+layout.server.ts` and the `(auth)` pages' loads so server-rendered pages localize.
- [ ] Unit test `resolveLocale` (priority order) + message-parity (a test that asserts `Object.keys(fr)` deep-equals `Object.keys(en)`).
- [ ] **Retrofit existing UI strings** (login, signup, households, account, layout nav) to use `m(locale).<key>` with FR + EN. (Keep it mechanical; FR text already exists — move it to `fr.ts`, translate to `en.ts`.)
- [ ] Gates green. **Commit** `feat(i18n): hand-rolled FR/EN messages + server locale resolution`.

### Task 3 — Catalogue data (DRAFT) + idempotent seeder
**Files:** `src/lib/server/seed/foods.data.ts`, `seed.ts`, `package.json` (`db:seed` script).
- [ ] `foods.data.ts`: a typed array of ~150–250 common European household foods, each with FR+EN name, category, defaultLocation, and one or more shelf-life entries (location/basis/min/max/unit, `notRecommended` where apt, optional FR/EN tips). Sources: ADEME + Santé publique France + ANSES guidance + the EU DLC/DDM framework. **Be conservative for risk foods** (raw meat/poultry/fish/eggs, cooked leftovers → short fridge windows). Each food has a stable `key` (slug) used for idempotent upsert. Add a header comment: `// DRAFT shelf-life data — REQUIRES human food-safety review before production use.`
- [ ] `seed.ts`: idempotent — upsert foods by `key`, replace their shelf_lives. Exposed as `bun run db:seed` (and safe to re-run).
- [ ] A test: run the seeder on a temp DB; assert every food has ≥1 shelf_life, all units/locations valid, FR+EN names non-empty; re-running doesn't duplicate.
- [ ] Gates green. **Commit** `feat(catalogue): curated European food/shelf-life seed (DRAFT, pending review)`.

### Task 4 — Catalogue module (search + DDM computation)
**Files:** `src/lib/server/catalogue.ts` (+test).
- [ ] `searchFoods(db, query, locale)`: server-side search over localized name+keywords (case-insensitive `LIKE`/contains), returns top ~20 with their default-location shelf life.
- [ ] `computeBestBy(shelfLife, addedAt): { date: Date; isEstimate: true }` — `addedAt + midpoint(min,max)` converted to ms via the `unit`; if `notRecommended` or a "ripen" entry, return guidance instead of a date. Unit→ms conversion table (hours/days/weeks/months≈30d/years≈365d).
- [ ] Tests: search finds by FR and EN; midpoint math (e.g. min 3 / max 5 days → +4 days); month/week conversions; `notRecommended` path.
- [ ] Gates green. **Commit** `feat(catalogue): localized search + DDM computation`.

### Task 5 — Inventory module (CRUD + lifecycle)
**Files:** `src/lib/server/inventory.ts` (+test).
- [ ] `addFresh(db, { householdId, addedBy, foodId, location, bestByDate, isEstimate, quantity })`, `addCustom(db, {... customName, useByDate?/bestByDate? })`, `listActive(db, householdId, { location? })` (status='active', ordered by `effectiveDate` asc, nulls last), `getItem(db, id)`, `setStatus(db, { id, status: 'consumed'|'discarded' })` (sets `closedAt`). All take `householdId`; the ROUTE authorizes via `requireMembership` before calling.
- [ ] A `bandFor(effectiveDate, warnDays, now)` helper → `'urgent'|'soon'|'ok'` (urgent: ≤ today; soon: ≤ today+warnDays; ok: beyond). Pure + tested.
- [ ] Tests: add fresh/custom; listActive ordering by effectiveDate; setStatus moves item out of active + sets closedAt; bandFor thresholds (past/today/within warn/after).
- [ ] Gates green. **Commit** `feat(inventory): item CRUD, lifecycle, urgency banding`.

### Task 6 — Add flow UI (sheet → fresh / custom)
**Files:** `(app)/add/+page.svelte` + `+page.server.ts`; a link/button from the home.
- [ ] `+page.server.ts`: `load` requires the active household (`requireMembership`); supports `?q=` catalogue search (calls `searchFoods`). Actions: `addFresh` (foodId + location → `computeBestBy` → insert, allow a `bestByDate` override field; `isEstimate=true`), `addCustom` (free-text name + optional date). Authorize household on every action.
- [ ] `+page.svelte`: the choice (📷 scanner — **disabled/"bientôt (M3)"**; 🥕 fruit/légume; ✏️ saisie libre); a zero-JS catalogue search (GET form `?q=`) + result list; the fresh form shows the computed **DDM estimate** in an amber box framed as an estimate ("≈ à consommer avant le … — estimation, ADEME/SpF") with an editable date; custom form. FR/EN via `m(locale)`.
- [ ] Gates green + a build/boot smoke (signup→create household→add a fresh item via the action→appears active). **Commit** `feat(inventory): add-fresh + custom flow (zero-JS)`.

### Task 7 — Urgency-first home
**Files:** `(app)/+page.svelte` + `+page.server.ts` (replace the M1 placeholder home).
- [ ] `+page.server.ts`: `requireMembership` for the active household; `listActive`; compute each item's band (`bandFor`, using the household's `warnDays`) + a display name (food localized name / product / customName) + display date (DLC vs DDM label). Support a `?location=` filter chip. Actions: `consume` / `discard` (→ `setStatus`, authorize household).
- [ ] `+page.svelte`: three colour bands (🔴 `home_band_urgent` / 🟠 `bientôt` / 🟢 `ok`) sorted by effectiveDate; each row = emoji/placeholder thumb + name + sub (location, DLC/DDM date) + a coloured pill + one-tap **"j'ai mangé" / "jeté"** forms; a location filter (chips as GET links); the `＋ Ajouter` button → `/add`; empty state. Zero-JS. FR/EN.
- [ ] Gates green + e2e (add 3 items with near/far dates → home shows them in the right bands; consume one → leaves active). **Commit** `feat(home): urgency-first inventory screen with consume/discard`.

### Task 8 — Wire-up, language switcher, seed-on-boot, acceptance
**Files:** account language switcher; `index.ts` boot seed (optional); README.
- [ ] Account page: a language switcher (FR/EN) form → sets `gm_locale` cookie + updates `users.locale`.
- [ ] Seed: document `bun run db:seed`; optionally auto-seed foods on boot if the `foods` table is empty (so a fresh deploy has the catalogue). Keep idempotent.
- [ ] README: add inventory/catalogue notes + the **DRAFT catalogue review** caveat + `bun run db:seed`.
- [ ] Full milestone e2e (signup → household → add fresh from catalogue → home bands → consume → switch locale → strings change). Gates green.
- [ ] **Commit** `feat: M2 wire-up — language switcher, seed, acceptance`.

---

## Done-when (M2 acceptance)
- `bun test` / `bun run lint` / `bun run check` clean; build under Bun OK.
- A member can add a fresh item from the catalogue (with an editable DDM estimate) and a free-text item, scoped to the active household; non-members are rejected (`requireMembership`).
- The home shows active items in 🔴/🟠/🟢 bands ordered by effective date, filterable by location; one tap marks eaten/thrown-out.
- UI switches FR↔EN; the catalogue is seeded (idempotent) and FR/EN.
- **Flagged for the user:** the shelf-life catalogue is an AI DRAFT pending food-safety review.

**Next:** M3 — Scanning + Open Food Facts (cache-first product lookup, `/scan` island, packaged add with DLC). The `inventory_items.barcode`/`kind='packaged'`/`useByDate` columns are already in place for it.
