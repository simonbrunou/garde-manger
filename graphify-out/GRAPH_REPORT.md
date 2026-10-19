# Graph Report - t3-f5011648  (2026-10-19)

## Corpus Check
- 240 files · ~160,781 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 12 file(s) not represented in the graph (top: (none) 6, .lock 2, .example 1)

## Summary
- 1552 nodes · 2926 edges · 126 communities (94 shown, 32 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 186 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f58091f4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- account/+page.svelte
- ref_types
- db.ts
- ⚪ Low (17)
- Apple HIG implementation for Garde-Manger — Design
- BarcodeScanner component
- devDependencies
- [barcode]/+page.svelte
- households/[id]/+page.server.ts
- item/[id]/+page.server.ts
- scripts
- login/+page.server.ts
- catalogue test
- [barcode]/+page.server.ts
- Memberships FK Schema
- tipForItem
- robots.txt/+server.ts
- Drizzle migration workflow
- Garde-Manger Design Spec
- routes/+page.svelte
- bun:sqlite database
- Add-Item & DB Seed
- schema.ts
- Deploy & Security Architecture
- Public marketing landing page at `/`
- account/+page.server.ts
- invitations.test.ts
- Household manage hub page
- PushSettings component
- ItemRow Component
- Item detail load
- Invitations Module
- Schema col: credential_id
- The bug — pantry-list "Eaten" / "Tossed" actions do nothing
- Schema col: household_id
- Schema col: expires_at
- End-to-End Testing Harness & Blind Bug Hunt — Design
- Migration 0001 Snapshot
- shelfLifeGuide
- Schema col: created_at
- Schema col: joined_at
- i18n index
- Coding behavioral guidelines
- SwipeActions.svelte
- Apple HIG — M1 Foundations Implementation Plan
- Apple HIG — M2 Chrome Wiring Implementation Plan
- requireMembership authorization pattern
- Schema col: expires_at
- push module
- Garde-Manger app icon — design spec
- (app)/+layout.svelte
- Tier 1 — Inventory UX Implementation Plan
- catalogue.ts
- garde-manger/+page.svelte
- cron test
- service-worker/index.ts
- File Structure
- landing.server.test.ts
- Issue tracker: Forgejo
- dependencies
- M3 Scanning + Open Food Facts Plan
- Domain Docs
- garde-manger/+page.server.ts
- service-worker/tsconfig.json
- renovate.json
- ActionSheet.svelte
- Generate a test (bun:test)
- Schema col: barcode
- Schema col: effective_date
- Build & CSP Config
- FK: sessions user id users id fk
- Garde-Manger UI/UX Redesign Design Spec
- Security review (garde-manger)
- Generate a test (bun:test)
- i18n/index.ts
- Drizzle migration workflow
- security-reviewer.md
- sqlite
- service-worker-caching-reviewer.md
- account/+page.ts
- FK: invitations created by users id fk
- add/+page.ts
- (app)/+layout.ts
- Migration 0004 Snapshot
- [barcode]/+page.ts
- scan/+page.ts
- (auth)/+layout.ts
- hooks.server.ts handle
- block-applied-migrations.sh
- Runtime Dependencies
- Schema col: display_name
- Schema col: locale
- block-secrets.sh
- triage-labels.md
- Toggle.svelte
- csr
- barcode-detector/ponyfill
- Schema col: warn_days
- $lib/assets/favicon.svg
- PasskeyLogin component
- createDb
- account page component
- add page component
- Bilan page
- (app) layout component
- Join Token Page Component
- backup.test.ts
- add/+page.server.ts
- vite.config.ts
- env.ts
- sitemap.xml/+server.ts
- drizzle.config.ts
- imports
- package.json
- requireMembership authorization pattern
- Schema col: +page.ts
- ../app.css
- Schema col: pushConfig module
- off tests
- gm_household active-household cookie
- encore-bon/+page.svelte
- bilan/+page.svelte
- inventory module
- Login Page CSR Config

## God Nodes (most connected - your core abstractions)
1. `drizzle-orm` - 37 edges
2. `createDb()` - 35 edges
3. `runMigrations()` - 35 edges
4. `m()` - 33 edges
5. `@sveltejs/kit` - 30 edges
6. `db` - 27 edges
7. `DB` - 26 edges
8. `requireMembership()` - 26 edges
9. `Messages` - 23 edges
10. `users` - 23 edges

## Surprising Connections (you probably didn't know these)
- `Task 2: Add `landing_*` i18n keys` --references--> `Messages`  [INFERRED]
  docs/superpowers/plans/2026-05-30-public-landing-page.md → src/lib/i18n/messages/fr.ts
- `i18n` --references--> `Messages`  [INFERRED]
  docs/superpowers/specs/2026-05-30-public-landing-page-design.md → src/lib/i18n/messages/fr.ts
- `Context` --references--> `Messages`  [INFERRED]
  docs/superpowers/specs/2026-06-03-tier2-bilan-opened-design.md → src/lib/i18n/messages/fr.ts
- `Context` --references--> `Messages`  [INFERRED]
  docs/superpowers/specs/2026-06-03-tier4-encore-bon-design.md → src/lib/i18n/messages/fr.ts
- `i18n (both locales + `Messages` interface)` --references--> `Messages`  [INFERRED]
  docs/superpowers/specs/2026-06-03-tier4-encore-bon-design.md → src/lib/i18n/messages/fr.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **DB boot + auto-seed flow** — src_lib_server_db_index, src_lib_server_db_client_createdb, src_lib_server_db_client_runmigrations, src_lib_server_seed_seed_seedfoods, src_lib_server_seed_foods_data_food_seed [EXTRACTED 0.85]
- **Per-request session, locale and theme resolution into locals + shell** — src_hooks_server, src_app_d, src_app_html, concept_id_secret_session, concept_theme_mechanism [EXTRACTED 0.85]
- **Inventory item row rendering** — src_lib_components_ui_itemrow, src_lib_components_ui_thumb, src_lib_components_ui_daybadge, src_lib_components_ui_icon [EXTRACTED 1.00]
- **Garde-Manger milestone roadmap (M0→M10)** — plans_m0_foundation, plans_m1_auth, plans_m2_inventory, plans_m3_scan, plans_m4_pwa, plans_m5_deploy, plans_m6_foundation, plans_m7_home_detail, plans_m8_add_scan, plans_m9_bilan, plans_m10_cuisiner [EXTRACTED 1.00]
- **WebAuthn passkey auth + session establishment flow** — src_lib_server_auth_webauthn_verifyauthentication, src_lib_server_auth_session_createsession, src_lib_server_auth_cookies_setsessioncookie, src_lib_server_auth_session_validatesessiontoken [INFERRED 0.75]
- **Garde-Manger PWA icon family (GM brand mark)** — static_icons_icon_192, static_icons_icon_512, static_icons_icon_maskable_192, static_icons_icon_maskable_512, static_icons_badge_72 [INFERRED 0.85]
- **Household invite creation flow** — src_routes_app_households_id_invite_page_server_create, src_lib_server_invitations_createinvitation, src_routes_app_households_id_page_server_actions, src_lib_server_invitations_revokeinvitation, src_lib_server_invitations_listpendinginvitations [INFERRED 0.85]
- **OFF cache-first product lookup flow (rate-limit veto → fetch → parse → image store → upsert)** — src_lib_server_off_lookupproduct, src_lib_server_off_parseoffv2, src_lib_server_off_maybedownloadimage, src_lib_server_offratelimit_offratelimitguard, src_lib_server_productconfig_getoffconfig, src_lib_server_productconfig_diskimagestore [INFERRED 0.85]
- **Daily Web Push send flow (payload build → safe endpoint → send → lifecycle)** — src_lib_server_push_builddailypayload, src_lib_server_push_sendtosubscription, src_lib_server_push_pushsender, src_lib_server_webpushsender_webpushsender, src_lib_server_pushconfig_getvapid, src_lib_server_reminders_userstonotify [INFERRED 0.85]
- **WebAuthn passkey enroll/login challenge-verify flow** — src_lib_components_passkeyenroll, src_lib_components_passkeylogin, api_webauthn_register_options, api_webauthn_register_verify, api_webauthn_authenticate_options, api_webauthn_authenticate_verify [INFERRED 0.85]
- **WebAuthn Passkey Registration Flow** — register_options_server_post, register_verify_server_post, src_lib_server_auth_webauthn_registrationoptions, src_lib_server_auth_webauthn_verifyregistration [INFERRED 0.85]

## Communities (126 total, 32 thin omitted)

### Community 0 - "account/+page.svelte"
Cohesion: 0.13
Nodes (12): svelte, {
		header,
		footer,
		children
	}, {
		href,
		title,
		subtitle,
		value,
		chevron,
		leading,
		trailing,
		onClick
	}, collapsed, sentinel, {
		title,
		large = true,
		leading,
		trailing
	}, close(), onKeydown() (+4 more)

### Community 1 - "ref_types"
Cohesion: 0.12
Nodes (19): @sveltejs/kit, WebAuthn Register Options Endpoint POST, WebAuthn Register Verify Endpoint POST, assertConfig(), authenticationOptions(), registrationOptions(), verifyRegistration(), db (+11 more)

### Community 2 - "db.ts"
Cohesion: 0.05
Nodes (62): E2E Testing Suite & Blind Bug Hunt — Implementation Plan, File structure, Self-review (completed), Task 10: Account — profile, theme, passkey remove, push (`app` project), Task 11: Scan — manual entry + confirm packaged (`app` project), Task 12: Bilan — monthly stats + waste streak (`app` project), Task 13: Passkey via virtual authenticator (`passkey` project), Task 14: Full sweep + triage + report (+54 more)

### Community 3 - "⚪ Low (17)"
Cohesion: 0.06
Nodes (33): Confirmed findings, Disputed findings (verifiers disagreed — review manually), Executive summary, garde-manger — Codebase Audit, 🟠 High (3), 🟠 [HIGH/security] Invitation accepted via GET in load() — single-use token consumed by prefetch/hover preload, 🟠 [HIGH/security] safeLocalPath allows open redirect via backslash-prefixed path, 🟠 [HIGH/security] Service worker caches authenticated, household-scoped pages in a user-agnostic DYNAMIC cache (+25 more)

### Community 4 - "Apple HIG implementation for Garde-Manger — Design"
Cohesion: 0.07
Nodes (28): 1. Foundations (`src/app.css`), 2. Navigation chrome, 3. Sheets, 4. Lists & controls, 5. Per-surface application, 6. Accessibility & quality, `ActionSheet.svelte` (new), Apple HIG implementation for Garde-Manger — Design (+20 more)

### Community 5 - "BarcodeScanner component"
Cohesion: 0.08
Nodes (17): barcode-detector, zxing-wasm, { locale }, Phase, Props, statusText, t, videoEl (+9 more)

### Community 6 - "devDependencies"
Cohesion: 0.08
Nodes (25): devDependencies, drizzle-kit, drizzle-orm, eslint, @eslint/compat, eslint-config-prettier, @eslint/js, eslint-plugin-svelte (+17 more)

### Community 7 - "[barcode]/+page.svelte"
Cohesion: 0.16
Nodes (9): icon, {
		imagePath = null,
		barcode = null,
		category = null,
		size = 46,
		alt = ''
	}, categoryIcon(), MAP, { data, form }, isFound, product, productName (+1 more)

### Community 8 - "households/[id]/+page.server.ts"
Cohesion: 0.15
Nodes (27): File Structure, Household-admin CRUD Implementation Plan, Self-review notes, Task 10: Full verification, Task 1: `HouseholdError` + `updateHousehold`, Task 2: `deleteHousehold` (with cascade), Task 3: `setMemberRole` + last-admin protection, Task 4: `removeMember` + last-admin protection (+19 more)

### Community 9 - "item/[id]/+page.server.ts"
Cohesion: 0.19
Nodes (22): Scan confirm add action, resolveActiveHouseholdId, Task 5: Add item (`app` project), Task 1: `recordUse` — quantity-aware lifecycle helper, 1. Partial consumption, Item detail actions (update/consume/discard/remove), addCustom(), addFresh() (+14 more)

### Community 10 - "scripts"
Cohesion: 0.10
Nodes (20): scripts, build, check, check:watch, db:backup, db:generate, db:migrate, db:push (+12 more)

### Community 11 - "login/+page.server.ts"
Cohesion: 0.15
Nodes (14): Task 4: Repoint in-app navigation and post-auth redirects to `/garde-manger`, Testing (TDD), valibot, hashPassword(), verifyPassword(), createAttemptLimiter(), loginAttemptLimiter, loginSchema (+6 more)

### Community 12 - "catalogue test"
Cohesion: 0.23
Nodes (11): seedFoods, foods, shelfLives, FOOD_SEED, FoodSeed, ShelfLifeSeed, main(), seedFoods() (+3 more)

### Community 13 - "[barcode]/+page.server.ts"
Cohesion: 0.10
Nodes (34): Scan confirm load, Scan confirm page, gtinCheckDigit(), isValidBarcode(), normalizeBarcode(), makeUpce(), upcEToUpcA(), ImageStore (+26 more)

### Community 14 - "Memberships FK Schema"
Cohesion: 0.06
Nodes (30): 10. PWA & notifications, 11. Internationalisation (FR / EN), 12. Security, 13. Deployment (Coolify + Railpack), 14. Error handling & testing, 15. Risks, gotchas & open items, 16. Out of scope / future ideas, 1. Overview (+22 more)

### Community 15 - "tipForItem"
Cohesion: 0.15
Nodes (16): Conventions (read once, apply everywhere), Task 3: Overdue day count in the day badge, 2. Overdue day count, 4. Storage tip (item detail only), Context, Design, Files touched, Non-goals (+8 more)

### Community 17 - "Drizzle migration workflow"
Cohesion: 0.25
Nodes (7): 1. Edit the schema, 2. Generate the migration, 3. Review the generated SQL — REQUIRED, 4. Apply, 5. Verify, Commit, Drizzle migration workflow

### Community 18 - "Garde-Manger Design Spec"
Cohesion: 0.12
Nodes (12): Barcode scan (BarcodeDetector + ZXing WASM), Daily reminder cron (/internal/cron/check-expiry), usersToNotify expiry aggregation, id.secret session cookie model, injectManifest service worker (offline view-only), Paraglide JS (inlang) FR/EN i18n, Passkeys (WebAuthn / SimpleWebAuthn), Garde-Manger Design Spec (+4 more)

### Community 19 - "routes/+page.svelte"
Cohesion: 0.14
Nodes (13): canonical, { data }, FeatureCard, features, jsonLd, jsonLdScript, lt, ogImage (+5 more)

### Community 20 - "bun:sqlite database"
Cohesion: 0.20
Nodes (9): $app/tsconfig, compilerOptions, rewriteRelativeImportExtensions, sourceMap, strict, types, exclude, extends (+1 more)

### Community 21 - "Add-Item & DB Seed"
Cohesion: 0.23
Nodes (9): computeBestBy DDM estimate, Hand-rolled FR/EN i18n + resolveLocale, FR/EN i18n key parity test, resolveTheme cookie→data-theme helper, Warm & Friendly design system, ZXing WASM scanner (self-hosted, lazy-loaded), M2 Inventory & Catalogue Plan, M6 Design-System Foundation Plan (+1 more)

### Community 22 - "schema.ts"
Cohesion: 0.19
Nodes (15): drizzle-orm, css, User, DB, credentials, households, inventoryItems, invitations (+7 more)

### Community 23 - "Deploy & Security Architecture"
Cohesion: 0.21
Nodes (11): bun:sqlite database, Garde-Manger design spec, /healthz endpoint, Proxy headers (PROTOCOL_HEADER / HOST_HEADER), WebAuthn passkeys (RP_ID bound), Deploy guide (Coolify + Railpack), package.json (scripts, deps, packageManager), M0 Foundation Plan (+3 more)

### Community 24 - "Public marketing landing page at `/`"
Cohesion: 0.12
Nodes (15): Additional touchpoints surfaced during planning, Approach (decided), Goal, i18n, Link / redirect updates (mechanical), Moved files (logic unchanged), New files, Out of scope (YAGNI) (+7 more)

### Community 25 - "account/+page.server.ts"
Cohesion: 0.23
Nodes (10): deleteCredential(), listCredentials(), Vapid, vapidPublicKey(), normalizeChoice(), resolveTheme(), THEME_COOKIE, ThemeChoice (+2 more)

### Community 26 - "invitations.test.ts"
Cohesion: 0.33
Nodes (9): Task 9: Invitations + join (`app` project), acceptInvitation(), createInvitation(), findByToken(), InvitationError, randomToken(), requireUsableInvitation(), sha256() (+1 more)

### Community 27 - "Household manage hub page"
Cohesion: 0.67
Nodes (3): Invite page, Household manage hub page, Households list page

### Community 28 - "PushSettings component"
Cohesion: 0.19
Nodes (14): POST /api/push/subscribe, POST /api/push/unsubscribe, computeStatus(), deviceLabel(), disable(), enable(), errorMessage, isIos() (+6 more)

### Community 29 - "ItemRow Component"
Cohesion: 0.12
Nodes (16): aria, badge, {
		band,
		effectiveDate,
		now = new Date(),
		t
	}, text, consumeForm, consumeId, dateLabel, discardForm (+8 more)

### Community 30 - "Item detail load"
Cohesion: 0.67
Nodes (3): Product image endpoint GET, Item detail load, Item detail page

### Community 31 - "Invitations Module"
Cohesion: 0.11
Nodes (18): 10. Cross-cutting, 11. Milestones (build order), 12. Testing, 13. Assumptions & open questions, 1. Goals & non-goals, 2. Current-state audit (what we're fixing), 3. Visual direction — "Warm & Friendly" (A × C), 4.1 Light (current — kept) (+10 more)

### Community 32 - "Schema col: credential_id"
Cohesion: 0.11
Nodes (17): Architecture — Approach B, Current state (relevant facts), Data-access layer (`src/lib/server/households.ts`), Decisions (resolved during brainstorming), Edge cases / invariants (summary), Error handling & i18n, Error type, Goal (+9 more)

### Community 33 - "The bug — pantry-list "Eaten" / "Tossed" actions do nothing"
Cohesion: 0.18
Nodes (12): Task 4: Estimate mark (`~`) on estimated dates, E2E Blind Bug Hunt — Run Report, Evidence, Fix (applied), Impact, Reproduce, Root cause, The bug — pantry-list "Eaten" / "Tossed" actions do nothing (+4 more)

### Community 34 - "Schema col: household_id"
Cohesion: 0.12
Nodes (16): Done-when (M1 acceptance), File structure (created/modified in M1), Garde-Manger — M1 Auth & Households Implementation Plan, Milestone context, Task 10: Passkey registration (TDD + enroll island), Task 11: Passkey authentication (TDD + login island) + account passkey mgmt, Task 12: Wire-up, gate, and milestone acceptance, Task 1: Schema + migration for auth & households (+8 more)

### Community 35 - "Schema col: expires_at"
Cohesion: 0.12
Nodes (16): Conventions (read once), File map, Garde-Manger M7 · Garde (home) redesign + Item detail — Implementation Plan, Self-review notes, Task 10: Item-detail route — server, Task 11: Item-detail route — page, Task 12: Milestone verification + final review, Task 1: Category icons + `categoryIcon()` (TDD) (+8 more)

### Community 36 - "End-to-End Testing Harness & Blind Bug Hunt — Design"
Cohesion: 0.15
Nodes (12): 10. Isolation, determinism, error handling, 11. Reporting the found bug, 12. Deliverables, 1. Goal, 2. Scope, 3. Methodology — blind hunt, 4. Server approach (decision: ① built adapter-node), 5. Harness architecture (+4 more)

### Community 37 - "Migration 0001 Snapshot"
Cohesion: 0.29
Nodes (12): Migration 0000 (users table), Migration 0001 (auth/household tables), Migration 0002 (catalogue + inventory tables), credentials table, foods table, households table, inventory_items table, invitations table (+4 more)

### Community 38 - "shelfLifeGuide"
Cohesion: 0.18
Nodes (12): Catalogue helper — `shelfLifeGuide`, Context, Design, Files touched, i18n (both locales + `Messages` interface), Navigation, Non-goals, Route `/encore-bon` (in `(app)`) (+4 more)

### Community 39 - "Schema col: created_at"
Cohesion: 0.13
Nodes (14): Conventions (read once), File map, Garde-Manger M6 · Design-System Foundation — Implementation Plan, Self-review notes, Task 10: Milestone verification, Task 1: Theme tokens via `light-dark()`, Task 2: `resolveTheme` pure helper (TDD), Task 3: Stamp `data-theme` + `lang` server-side (no FOUC) (+6 more)

### Community 40 - "Schema col: joined_at"
Cohesion: 0.13
Nodes (14): Acceptance (M3 done when), Guardrails (apply to every task), M3 — Scanning + Open Food Facts, Task 10 — Self-hosted ZXing WASM + bundle discipline, Task 11 — Final review + merge, Task 1 — `products` schema + migration `0003`, Task 2 — Shared barcode utility `$lib/barcode.ts` (pure), Task 3 — OFF client `$lib/server/off.ts` (pure, cache-first, injectable) (+6 more)

### Community 41 - "i18n index"
Cohesion: 0.06
Nodes (22): m(), previewInvitation(), { data, form }, load(), t, adminCount, { data, form }, dateLocale (+14 more)

### Community 42 - "Coding behavioral guidelines"
Cohesion: 0.18
Nodes (10): 1. Think Before Coding, 2. Simplicity First, 3. Surgical Changes, 4. Goal-Driven Execution, Agent skills, Coding behavioral guidelines, Domain docs, graphify (+2 more)

### Community 43 - "SwipeActions.svelte"
Cohesion: 0.11
Nodes (13): Public Landing Page Implementation Plan, Self-Review, Task 1: Relocate the dashboard to `/garde-manger`, Task 2: Add `landing_*` i18n keys, Task 3: Create the public landing route, Task 5: Update the daily-push deep-link and PWA start_url, Task 6: Full verification + graph refresh, IconName (+5 more)

### Community 44 - "Apple HIG — M1 Foundations Implementation Plan"
Cohesion: 0.18
Nodes (10): Apple HIG — M1 Foundations Implementation Plan, File Structure, Roadmap — subsequent milestones (each gets its own plan when reached), Self-Review, Task 1: HIG token regression test (TDD anchor), Task 2: Typography ramp (iOS Dynamic Type) tokens + utilities, Task 3: HIG semantic color roles (mapped onto warm tokens), Task 4: Material, metric, and motion tokens (+2 more)

### Community 45 - "Apple HIG — M2 Chrome Wiring Implementation Plan"
Cohesion: 0.18
Nodes (10): After M2: remaining milestones (own plans when reached), Apple HIG — M2 Chrome Wiring Implementation Plan, File Structure, Self-Review, Task 1: Extract HouseholdMenu from AppHeader, Task 2: Wire NavigationBar + HouseholdMenu into Home, drop AppHeader from layout, Task 3: NavigationBar on Bilan, Cuisiner, Account, Task 4: Pushed views get a back button (+2 more)

### Community 46 - "requireMembership authorization pattern"
Cohesion: 0.47
Nodes (3): HouseholdError, requireMembership authorization pattern, Household-admin CRUD Design Spec

### Community 47 - "Schema col: expires_at"
Cohesion: 0.14
Nodes (13): Acceptance (M4 done when), Guardrails (apply to every task), M4 — Notifications + PWA, Task 10 — Final review + merge, Task 1 — `push_subscriptions` schema + migration `0004`, Task 2 — VAPID config glue `$lib/server/pushConfig.ts` + install `web-push`, Task 3 — Push module `$lib/server/push.ts` (pure seam, lifecycle), Task 4 — Expiry aggregation `$lib/server/reminders.ts` (pure) (+5 more)

### Community 48 - "push module"
Cohesion: 0.08
Nodes (39): web-push, DailyReminderSummary, runDailyReminders(), secretMatches(), buildDailyPayload(), byteLength(), COPY, DailyCopy (+31 more)

### Community 49 - "Garde-Manger app icon — design spec"
Cohesion: 0.18
Nodes (10): Assets written to `static/`, Deliverables, Design direction (approved), Garde-Manger app icon — design spec, Out of scope, Problem, Refinements agreed during review, Source of truth (+2 more)

### Community 50 - "(app)/+layout.svelte"
Cohesion: 0.18
Nodes (9): backHref, { data, children }, isAccount, isDeep, isHome, path, routeTitle, t (+1 more)

### Community 51 - "Tier 1 — Inventory UX Implementation Plan"
Cohesion: 0.40
Nodes (4): Final verification, Task 5: Storage tip on item detail, Tier 1 — Inventory UX Implementation Plan, ShelfLife

### Community 52 - "catalogue.ts"
Cohesion: 0.14
Nodes (15): A. Bilan month-over-month, B. Opened-basis re-dating, Context, Design, Non-goals, Testing (TDD), Tier 2 — Bilan month-over-month + opened-basis re-dating, BASIS_ORDER (+7 more)

### Community 53 - "garde-manger/+page.svelte"
Cohesion: 0.13
Nodes (12): {
		icon,
		title,
		body = undefined,
		children
	}, active, Household, {
		households,
		activeHouseholdId,
		t
	}, {
		name,
		size = 24,
		class: klass = ''
	}, Option, {
		options,
		value,
		onChange,
		ariaLabel
	}, bands (+4 more)

### Community 54 - "cron test"
Cohesion: 0.22
Nodes (3): FakeSender, FIXED_NOW, VAPID

### Community 55 - "service-worker/index.ts"
Cohesion: 0.25
Nodes (6): ASSET_SET, ASSETS, NETWORK_ONLY_PREFIXES, networkWithOfflineFallback(), offlineFallback(), PushFields

### Community 56 - "File Structure"
Cohesion: 0.25
Nodes (7): File Structure, Notes for the implementer, PWA App Icon Implementation Plan, Task 1: Finalize the master render script, Task 2: Generate the icon set and verify outputs programmatically, Task 3: Wire favicon + apple-touch-icon into app.html, Task 4: Final verification

### Community 58 - "Issue tracker: Forgejo"
Cohesion: 0.29
Nodes (6): Conventions, Issue tracker: Forgejo, Pull requests as a triage surface, Wayfinding operations, When a skill says "fetch the relevant ticket", When a skill says "publish to the issue tracker"

### Community 59 - "dependencies"
Cohesion: 0.29
Nodes (7): dependencies, barcode-detector, @simplewebauthn/browser, @simplewebauthn/server, valibot, web-push, zxing-wasm

### Community 60 - "M3 Scanning + Open Food Facts Plan"
Cohesion: 0.40
Nodes (3): Barcode normalize/validate (GTIN), Open Food Facts integration (cache-first), M3 Scanning + Open Food Facts Plan

### Community 61 - "Domain Docs"
Cohesion: 0.33
Nodes (5): Before exploring, read these, Domain Docs, File structure, Flag ADR conflicts, Use the glossary's vocabulary

### Community 62 - "garde-manger/+page.server.ts"
Cohesion: 0.16
Nodes (10): createHousehold(), listForUser(), resolveActiveHouseholdId(), actions, Groups, Location, actions, load() (+2 more)

### Community 63 - "service-worker/tsconfig.json"
Cohesion: 0.33
Nodes (5): $app/tsconfig/service-worker, compilerOptions, strict, extends, include

### Community 64 - "renovate.json"
Cohesion: 0.33
Nodes (5): config:recommended, extends, packageRules, platformAutomerge, $schema

### Community 65 - "ActionSheet.svelte"
Cohesion: 0.47
Nodes (5): Action, close(), onKeydown(), {
		open = $bindable(false),
		title,
		actions,
		cancelLabel = 'Annuler',
		onClose
	}, pick()

### Community 66 - "Generate a test (bun:test)"
Cohesion: 0.40
Nodes (4): Conventions (match these), Database-touching modules, Generate a test (bun:test), Steps

### Community 67 - "Schema col: barcode"
Cohesion: 0.15
Nodes (12): Done-when (M2 acceptance), File structure (M2), Garde-Manger — M2 Inventory & Catalogue Implementation Plan, Milestone context, Task 1 — Schema + migration 0002 (foods, shelf_lives, inventory_items), Task 2 — Hand-rolled i18n infrastructure, Task 3 — Catalogue data (DRAFT) + idempotent seeder, Task 4 — Catalogue module (search + DDM computation) (+4 more)

### Community 68 - "Schema col: effective_date"
Cohesion: 0.18
Nodes (10): CSS custom-property design tokens, blank(), draw_letter(), fill_rect(), main(), make_badge(), make_icon(), rounded_bg() (+2 more)

### Community 69 - "Build & CSP Config"
Cohesion: 0.17
Nodes (11): Conventions (read once), File map, Garde-Manger M10 · Cuisiner (use-it-up ideas) — Implementation Plan, Self-review notes, Task 1: Cook ideas dataset + `ideasForCategory` (TDD), Task 2: `cook` (utensils) icon, Task 3: i18n keys (Cuisiner + bilan streak-zero polish), Task 4: Cuisiner route (server + page) (+3 more)

### Community 70 - "FK: sessions user id users id fk"
Cohesion: 0.17
Nodes (11): Conventions (read once), File map, Garde-Manger M9 · Bilan (anti-waste stats) — Implementation Plan, Self-review notes, Task 1: `householdStats` (TDD), Task 2: `stats` bar-chart icon, Task 3: i18n keys (nav + bilan), Task 4: `StatTile.svelte` (+3 more)

### Community 71 - "Garde-Manger UI/UX Redesign Design Spec"
Cohesion: 0.22
Nodes (8): Bilan anti-waste stats surface, Bottom tab bar + center FAB navigation, Cuisiner (cook-what's-expiring) surface, Open Food Facts API v2 integration, Thumbnail resolution order (photo→icon→fallback), Garde-Manger UI/UX Redesign Design Spec, Migration 0003 (products OFF cache), products table (OFF cache)

### Community 72 - "Security review (garde-manger)"
Cohesion: 0.40
Nodes (4): How to work, Scope (what to review), Security review (garde-manger), What to flag (in priority order)

### Community 73 - "Generate a test (bun:test)"
Cohesion: 0.40
Nodes (4): Conventions (match these), Database-touching modules, Generate a test (bun:test), Steps

### Community 74 - "i18n/index.ts"
Cohesion: 0.22
Nodes (12): Task 6: i18n keys, A. Food-safety disclaimer, B. Login rate limiting, Context, Design, Files touched, Non-goals, Tier 3 — Food-safety disclaimer in-app + login rate limiting (+4 more)

### Community 75 - "Drizzle migration workflow"
Cohesion: 0.25
Nodes (7): 1. Edit the schema, 2. Generate the migration, 3. Review the generated SQL — REQUIRED, 4. Apply, 5. Verify, Commit, Drizzle migration workflow

### Community 76 - "security-reviewer.md"
Cohesion: 0.50
Nodes (3): How to work, Scope (what to review), What to flag (in priority order)

### Community 77 - "sqlite"
Cohesion: 0.50
Nodes (3): npx, sqlite, mcp-server-sqlite-npx

### Community 80 - "FK: invitations created by users id fk"
Cohesion: 0.18
Nodes (10): Acceptance (M5 done when), Guardrails, M5 — Deploy & harden, Task 1 — Security headers + CSP (the careful one), Task 2 — valibot validation audit, Task 3 — Off-box SQLite backup, Task 4 — Deploy documentation `DEPLOY.md`, Task 5 — Production-config audit (+2 more)

### Community 83 - "Migration 0004 Snapshot"
Cohesion: 0.18
Nodes (10): Done-when (M0 acceptance), File structure (created/modified in M0), Garde-Manger — M0 Foundation Implementation Plan, Scope & milestone context, Task 1: Scaffold the SvelteKit app (Bun, TS, minimal), Task 2: Configure `adapter-node` and verify Bun serving, Task 3: Add Drizzle, then swap the client to `bun:sqlite`, Task 4: First table (`users`) + migration + DB test (TDD) (+2 more)

### Community 87 - "hooks.server.ts handle"
Cohesion: 0.18
Nodes (16): @simplewebauthn/server, App, Locals, handle(), resolveLocale(), clearSessionCookie(), SESSION_COOKIE, setSessionCookie() (+8 more)

### Community 89 - "Runtime Dependencies"
Cohesion: 0.20
Nodes (9): 1. Build & run, 2. Environment variables (production), 3. Reverse proxy (Traefik / Coolify), 4. Persistent storage (single writer), 5. Healthcheck, 6. Scheduled Tasks (two), 7. Manual smoke checklist (post-deploy), 8. First-run notes (+1 more)

### Community 90 - "Schema col: display_name"
Cohesion: 0.20
Nodes (9): Conventions (read once), File map, Garde-Manger M8 · Add / Scan flow — Implementation Plan, Self-review notes, Task 1: i18n key for "change food", Task 2: Redesign `/add` — chooser + focused confirm (scroll-trap fix), Task 3: Restyle `/scan`, Task 4: Restyle `/scan/[barcode]` packaged confirm (+1 more)

### Community 91 - "Schema col: locale"
Cohesion: 0.27
Nodes (9): playwright, APP_ROUTES, capture(), main(), PUBLIC_ROUTES, runAxe(), setTheme(), THEMES (+1 more)

### Community 97 - "Schema col: warn_days"
Cohesion: 0.22
Nodes (8): Auth / env, Build & run, Database, Deploy (Coolify + Railpack), Develop, Garde-Manger, Inventory & catalogue (M2), Test / quality

### Community 99 - "PasskeyLogin component"
Cohesion: 0.12
Nodes (18): POST /api/webauthn/authenticate/options, POST /api/webauthn/authenticate/verify, POST /api/webauthn/register/options, POST /api/webauthn/register/verify, @simplewebauthn/browser, errorMessage, handleEnroll(), loading (+10 more)

### Community 100 - "createDb"
Cohesion: 0.16
Nodes (16): makeDb(), makeDb(), createDb(), runMigrations(), makeDb(), makeDb(), makeDb(), makeDb() (+8 more)

### Community 108 - "backup.test.ts"
Cohesion: 0.39
Nodes (4): dest, sqlite, stamp, backupDatabase()

### Community 109 - "add/+page.server.ts"
Cohesion: 0.29
Nodes (7): searchFoods(), actions, addCustomSchema, addFreshSchema, load(), locationSchema, load()

### Community 110 - "vite.config.ts"
Cohesion: 0.50
Nodes (3): @sveltejs/adapter-node, @sveltejs/vite-plugin-svelte, vite

### Community 122 - "package.json"
Cohesion: 0.11
Nodes (21): gitignorePath, name, packageManager, private, type, version, eslint, @eslint/compat (+13 more)

### Community 162 - "requireMembership authorization pattern"
Cohesion: 0.31
Nodes (11): BottomNav app shell (5-slot tab bar + FAB), categoryIcon() category→IconName mapping, dayBadge() + DayBadge urgency badge, householdStats() anti-waste aggregation, Inline SVG icon sprite + Icon.svelte, ideasForCategory() offline use-it-up ideas, Household-scoped getItemScoped/updateItem/deleteItem, Urgency banding (urgent / soon / ok) (+3 more)

### Community 232 - "Schema col: +page.ts"
Cohesion: 0.50
Nodes (5): Notification Badge 72 (monochrome GM mark), App Icon 192 (GM monogram, blue tile), App Icon 512 (GM monogram, blue tile), Maskable App Icon 192 (GM, full-bleed safe zone), Maskable App Icon 512 (GM, full-bleed safe zone)

### Community 248 - "off tests"
Cohesion: 0.18
Nodes (8): CFG, FakeFetch, FakeFetchOptions, FIXED_NOW, jsonResponse(), makeFakeFetch(), NOT_FOUND_BODY, RecordingImageStore

### Community 268 - "encore-bon/+page.svelte"
Cohesion: 0.10
Nodes (15): {
		variant = 'primary',
		href = undefined,
		type = 'button',
		icon = undefined,
		full = false,
		children,
		...rest
	}, {
		grouped = false,
		children,
		...rest
	}, { data, form }, t, basisLabel, { data }, guideByLocation, locationLabel (+7 more)

### Community 269 - "bilan/+page.svelte"
Cohesion: 0.25
Nodes (6): {
		value,
		label,
		tone = 'neutral'
	}, { data }, empty, s, t, wasteTrend

## Knowledge Gaps
- **51 isolated node(s):** `npx`, `mcp-server-sqlite-npx`, `@sveltejs/adapter-auto`, `@types/bun`, `@types/node` (+46 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 840 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Garde-Manger Design Spec` connect `Garde-Manger Design Spec` to `Migration 0001 Snapshot`, `Garde-Manger UI/UX Redesign Design Spec`, `Deploy & Security Architecture`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `createDb()` (e.g. with `8. Data & seeding` and `runMigrations()`) actually correct?**
  _`createDb()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `npx`, `mcp-server-sqlite-npx`, `@sveltejs/adapter-auto` to the rest of the system?**
  _51 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `account/+page.svelte` be split into smaller, more focused modules?**
  _Cohesion score 0.13450292397660818 - nodes in this community are weakly interconnected._
- **Why does `drizzle-orm` connect `schema.ts` to `ref_types`, `invitations.test.ts`, `createDb`, `households/[id]/+page.server.ts`, `item/[id]/+page.server.ts`, `login/+page.server.ts`, `catalogue test`, `[barcode]/+page.server.ts`, `add/+page.server.ts`, `push module`, `catalogue.ts`, `cron test`, `off tests`, `account/+page.server.ts`, `package.json`, `garde-manger/+page.server.ts`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `runMigrations()` (e.g. with `4. Apply` and `4. Apply`) actually correct?**
  _`runMigrations()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `ref_types` be split into smaller, more focused modules?**
  _Cohesion score 0.12299465240641712 - nodes in this community are weakly interconnected._