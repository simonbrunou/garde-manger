# Graph Report - t3-f5011648  (2026-10-19)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1549 nodes · 2935 edges · 124 communities (96 shown, 28 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 186 edges (avg confidence: 0.91)
- Token cost: 54,357 input · 300 output

## Graph Freshness
- Built from commit: `17dcaa30`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Navigation & Sheet Components
- WebAuthn Passkey Auth
- Database Query Helpers
- Codebase Audit Findings
- Apple HIG Design
- Barcode Scanner Component
- Dev Dependencies
- Thumbnails & Category Icons
- Household Admin CRUD Plan
- Inventory Add Actions
- Package Scripts
- Password & Rate Limiting
- Shelf-Life Lookup Design
- Barcode Scan & OFF
- Garde-Manger Design Spec
- Tier 1 Inventory UX Design
- Internationalization and Invites
- Drizzle Migration Skill
- Product Architecture Decisions
- Landing Page SEO
- TypeScript Config
- i18n, Theming & Add Flow
- DB & Session Tests
- Deployment & Security Decisions
- Landing Page Design
- Theme & Credentials Helpers
- Household Invitations
- Household Pages
- Push Subscription Settings
- Day Badge & Item Row
- E2E Feature Specs
- UI/UX Redesign Spec
- Household Admin Design
- E2E Bug Hunt Report
- M1 Auth & Households Plan
- M7 Home & Item Detail Plan
- E2E Testing Design
- Database Schema & Migrations
- E2E Testing Plan
- M6 Design System Plan
- M3 Scanning Plan
- Invitation & Household Pages
- Agent Coding Guidelines
- Public Landing Page Plan
- Apple HIG Foundations Plan
- Apple HIG Chrome Plan
- Household Admin Concepts
- M4 Notifications & PWA Plan
- Daily Push Reminders
- App Icon Design
- App Layout Shell
- Partial Consumption Plan
- Bilan and Opened Re-dating
- UI Primitives & Home Page
- Playwright Config and Smoke
- Service Worker Caching
- PWA Icon Plan
- Env Config and Landing
- Forgejo Issue Tracker Docs
- Runtime Dependencies
- Open Food Facts Integration
- Domain Docs Guide
- Item Detail and Listing
- Service Worker TS Config
- Renovate Config
- Action Sheet Component
- Test Generation Skill
- M2 Inventory & Catalogue Plan
- PWA Icon Generator
- M10 Cuisiner Plan
- M9 Bilan Plan
- Push Notifications and PWA
- Security Review Skill
- Unit Test Writing Skill
- Tier 3 Disclaimer & Rate Limit
- Drizzle Migration Skill Copy
- Security Reviewer Agent
- SQLite MCP Config
- Service Worker Reviewer Agent
- Account Page Rendering
- M5 Deploy & Harden Plan
- Add Page Rendering
- App Layout Rendering
- M0 Foundation Plan
- Barcode Page Render Config
- Scan Page Render Config
- Auth Layout Render Config
- Session Hooks & Cookies
- Applied Migrations Guard Hook
- Deployment Guide
- M8 Add/Scan Flow Plan
- UI Audit Capture Script
- Secrets Blocking Hook
- Triage Labels Docs
- Toggle Switch Component
- Login Page Render Config
- Barcode Detector Ponyfill
- Project README
- Favicon Asset
- Passkey Enroll & Login
- Test DB Fixtures
- Account Page
- Add Item Page
- Bilan Summary Page
- App Layout
- Join Token Page
- Backup Script and Tests
- Inventory List E2E
- Expiry Cron Web Push
- Reminder Test Fixtures
- E2E User Fixtures
- App Type Declarations
- ESLint & Package Config
- Home, Bilan & Cuisiner Features
- PWA App Icons
- Global App Styles
- Invitations Module Tests
- OFF Client Tests
- Active Household Cookie
- Bilan Stats Page
- Inventory Module
- Login Page CSR Config

## God Nodes (most connected - your core abstractions)
1. `drizzle-orm` - 37 edges
2. `createDb()` - 35 edges
3. `runMigrations()` - 35 edges
4. `m()` - 33 edges
5. `@sveltejs/kit` - 30 edges
6. `users` - 29 edges
7. `db` - 27 edges
8. `DB` - 26 edges
9. `requireMembership()` - 26 edges
10. `Messages` - 25 edges

## Surprising Connections (you probably didn't know these)
- `i18n` --references--> `Messages`  [INFERRED]
  docs/superpowers/specs/2026-05-30-public-landing-page-design.md → src/lib/i18n/messages/fr.ts
- `Context` --references--> `Messages`  [INFERRED]
  docs/superpowers/specs/2026-06-03-tier2-bilan-opened-design.md → src/lib/i18n/messages/fr.ts
- `Context` --references--> `Messages`  [INFERRED]
  docs/superpowers/specs/2026-06-03-tier4-encore-bon-design.md → src/lib/i18n/messages/fr.ts
- `i18n (both locales + `Messages` interface)` --references--> `Messages`  [INFERRED]
  docs/superpowers/specs/2026-06-03-tier4-encore-bon-design.md → src/lib/i18n/messages/fr.ts
- `4. Apply` --references--> `runMigrations()`  [INFERRED]
  .claude/skills/migration/SKILL.md → src/lib/server/db/client.ts

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

## Communities (124 total, 28 thin omitted)

### Community 0 - "Navigation & Sheet Components"
Cohesion: 0.09
Nodes (18): svelte, {
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
	}, close(), onKeydown() (+10 more)

### Community 1 - "WebAuthn Passkey Auth"
Cohesion: 0.19
Nodes (14): @simplewebauthn/server, WebAuthn Register Options Endpoint POST, WebAuthn Register Verify Endpoint POST, assertConfig(), authenticationOptions(), deleteCredential(), registrationOptions(), User (+6 more)

### Community 2 - "Database Query Helpers"
Cohesion: 0.18
Nodes (25): Self-review (completed), 8. Data & seeding, Files touched, getActiveItems(), getCredentialCount(), getHouseholdIdForUser(), getInvitationsForHousehold(), getItem() (+17 more)

### Community 3 - "Codebase Audit Findings"
Cohesion: 0.06
Nodes (33): Confirmed findings, Disputed findings (verifiers disagreed — review manually), Executive summary, garde-manger — Codebase Audit, 🟠 High (3), 🟠 [HIGH/security] Invitation accepted via GET in load() — single-use token consumed by prefetch/hover preload, 🟠 [HIGH/security] safeLocalPath allows open redirect via backslash-prefixed path, 🟠 [HIGH/security] Service worker caches authenticated, household-scoped pages in a user-agnostic DYNAMIC cache (+25 more)

### Community 4 - "Apple HIG Design"
Cohesion: 0.07
Nodes (28): 1. Foundations (`src/app.css`), 2. Navigation chrome, 3. Sheets, 4. Lists & controls, 5. Per-surface application, 6. Accessibility & quality, `ActionSheet.svelte` (new), Apple HIG implementation for Garde-Manger — Design (+20 more)

### Community 5 - "Barcode Scanner Component"
Cohesion: 0.12
Nodes (10): barcode-detector, zxing-wasm, { locale }, Phase, Props, statusText, t, videoEl (+2 more)

### Community 6 - "Dev Dependencies"
Cohesion: 0.08
Nodes (25): devDependencies, drizzle-kit, drizzle-orm, eslint, @eslint/compat, eslint-config-prettier, @eslint/js, eslint-plugin-svelte (+17 more)

### Community 7 - "Thumbnails & Category Icons"
Cohesion: 0.10
Nodes (15): {
		grouped = false,
		children,
		...rest
	}, icon, {
		imagePath = null,
		barcode = null,
		category = null,
		size = 46,
		alt = ''
	}, categoryIcon(), MAP, canOpen, { data }, it (+7 more)

### Community 8 - "Household Admin CRUD Plan"
Cohesion: 0.13
Nodes (31): File Structure, Household-admin CRUD Implementation Plan, Self-review notes, Task 10: Full verification, Task 1: `HouseholdError` + `updateHousehold`, Task 2: `deleteHousehold` (with cascade), Task 3: `setMemberRole` + last-admin protection, Task 4: `removeMember` + last-admin protection (+23 more)

### Community 9 - "Inventory Add Actions"
Cohesion: 0.31
Nodes (9): Scan confirm add action, resolveActiveHouseholdId, Task 5: Add item (`app` project), Item detail actions (update/consume/discard/remove), addCustom(), addFresh(), addPackaged(), deleteItem() (+1 more)

### Community 10 - "Package Scripts"
Cohesion: 0.10
Nodes (20): scripts, build, check, check:watch, db:backup, db:generate, db:migrate, db:push (+12 more)

### Community 11 - "Password & Rate Limiting"
Cohesion: 0.17
Nodes (13): Task 4: Repoint in-app navigation and post-auth redirects to `/garde-manger`, valibot, hashPassword(), verifyPassword(), createAttemptLimiter(), loginAttemptLimiter, loginSchema, safeLocalPath() (+5 more)

### Community 12 - "Shelf-Life Lookup Design"
Cohesion: 0.06
Nodes (45): Catalogue helper — `shelfLifeGuide`, Context, Design, Files touched, i18n (both locales + `Messages` interface), Navigation, Non-goals, Route `/encore-bon` (in `(app)`) (+37 more)

### Community 13 - "Barcode Scan & OFF"
Cohesion: 0.09
Nodes (35): Scan confirm load, Scan confirm page, gtinCheckDigit(), isValidBarcode(), normalizeBarcode(), makeUpce(), upcEToUpcA(), ImageStore (+27 more)

### Community 14 - "Garde-Manger Design Spec"
Cohesion: 0.06
Nodes (30): 10. PWA & notifications, 11. Internationalisation (FR / EN), 12. Security, 13. Deployment (Coolify + Railpack), 14. Error handling & testing, 15. Risks, gotchas & open items, 16. Out of scope / future ideas, 1. Overview (+22 more)

### Community 15 - "Tier 1 Inventory UX Design"
Cohesion: 0.13
Nodes (18): Conventions (read once, apply everywhere), Task 3: Overdue day count in the day badge, Task 5: Storage tip on item detail, 2. Overdue day count, 4. Storage tip (item detail only), Context, Design, Files touched (+10 more)

### Community 16 - "Internationalization and Invites"
Cohesion: 0.14
Nodes (15): i18n index test, m(), en, fr, previewInvitation(), actions, load(), { data, form } (+7 more)

### Community 17 - "Drizzle Migration Skill"
Cohesion: 0.25
Nodes (7): 1. Edit the schema, 2. Generate the migration, 3. Review the generated SQL — REQUIRED, 4. Apply, 5. Verify, Commit, Drizzle migration workflow

### Community 18 - "Product Architecture Decisions"
Cohesion: 0.11
Nodes (14): Barcode scan (BarcodeDetector + ZXing WASM), Bilan anti-waste stats surface, Bottom tab bar + center FAB navigation, Cuisiner (cook-what's-expiring) surface, id.secret session cookie model, Open Food Facts API v2 integration, Paraglide JS (inlang) FR/EN i18n, Passkeys (WebAuthn / SimpleWebAuthn) (+6 more)

### Community 19 - "Landing Page SEO"
Cohesion: 0.14
Nodes (13): canonical, { data }, FeatureCard, features, jsonLd, jsonLdScript, lt, ogImage (+5 more)

### Community 20 - "TypeScript Config"
Cohesion: 0.20
Nodes (9): $app/tsconfig, compilerOptions, rewriteRelativeImportExtensions, sourceMap, strict, types, exclude, extends (+1 more)

### Community 21 - "i18n, Theming & Add Flow"
Cohesion: 0.21
Nodes (9): computeBestBy DDM estimate, Hand-rolled FR/EN i18n + resolveLocale, FR/EN i18n key parity test, resolveTheme cookie→data-theme helper, Warm & Friendly design system, ZXing WASM scanner (self-hosted, lazy-loaded), M2 Inventory & Catalogue Plan, M6 Design-System Foundation Plan (+1 more)

### Community 22 - "DB & Session Tests"
Cohesion: 0.25
Nodes (13): drizzle-orm, DB, credentials, households, inventoryItems, invitations, memberships, products (+5 more)

### Community 23 - "Deployment & Security Decisions"
Cohesion: 0.18
Nodes (12): bun:sqlite database, Garde-Manger design spec, /healthz endpoint, Proxy headers (PROTOCOL_HEADER / HOST_HEADER), WebAuthn passkeys (RP_ID bound), Deploy guide (Coolify + Railpack), package.json (scripts, deps, packageManager), M0 Foundation Plan (+4 more)

### Community 24 - "Landing Page Design"
Cohesion: 0.12
Nodes (15): Additional touchpoints surfaced during planning, Approach (decided), Goal, i18n, Link / redirect updates (mechanical), Moved files (logic unchanged), New files, Out of scope (YAGNI) (+7 more)

### Community 25 - "Theme & Credentials Helpers"
Cohesion: 0.21
Nodes (10): opts, { value, t }, listCredentials(), Vapid, vapidPublicKey(), normalizeChoice(), THEME_COOKIE, ThemeChoice (+2 more)

### Community 26 - "Household Invitations"
Cohesion: 0.27
Nodes (10): Task 9: Invitations + join (`app` project), createHousehold(), acceptInvitation(), createInvitation(), findByToken(), InvitationError, randomToken(), requireUsableInvitation() (+2 more)

### Community 27 - "Household Pages"
Cohesion: 0.67
Nodes (3): Invite page, Household manage hub page, Households list page

### Community 28 - "Push Subscription Settings"
Cohesion: 0.12
Nodes (19): POST /api/push/subscribe, POST /api/push/unsubscribe, { locale }, offline, Props, t, computeStatus(), deviceLabel() (+11 more)

### Community 29 - "Day Badge & Item Row"
Cohesion: 0.12
Nodes (15): path, { t }, aria, badge, {
		band,
		effectiveDate,
		now = new Date(),
		t
	}, text, consumeForm, consumeId (+7 more)

### Community 30 - "E2E Feature Specs"
Cohesion: 0.21
Nodes (6): File structure, freshHousehold(), isoDate(), utcMidnight(), loginAs(), setActiveHousehold()

### Community 31 - "UI/UX Redesign Spec"
Cohesion: 0.11
Nodes (18): 10. Cross-cutting, 11. Milestones (build order), 12. Testing, 13. Assumptions & open questions, 1. Goals & non-goals, 2. Current-state audit (what we're fixing), 3. Visual direction — "Warm & Friendly" (A × C), 4.1 Light (current — kept) (+10 more)

### Community 32 - "Household Admin Design"
Cohesion: 0.11
Nodes (17): Architecture — Approach B, Current state (relevant facts), Data-access layer (`src/lib/server/households.ts`), Decisions (resolved during brainstorming), Edge cases / invariants (summary), Error handling & i18n, Error type, Goal (+9 more)

### Community 33 - "E2E Bug Hunt Report"
Cohesion: 0.16
Nodes (13): Task 4: Estimate mark (`~`) on estimated dates, E2E Blind Bug Hunt — Run Report, Evidence, Fix (applied), Impact, Reproduce, Root cause, The bug — pantry-list "Eaten" / "Tossed" actions do nothing (+5 more)

### Community 34 - "M1 Auth & Households Plan"
Cohesion: 0.12
Nodes (16): Done-when (M1 acceptance), File structure (created/modified in M1), Garde-Manger — M1 Auth & Households Implementation Plan, Milestone context, Task 10: Passkey registration (TDD + enroll island), Task 11: Passkey authentication (TDD + login island) + account passkey mgmt, Task 12: Wire-up, gate, and milestone acceptance, Task 1: Schema + migration for auth & households (+8 more)

### Community 35 - "M7 Home & Item Detail Plan"
Cohesion: 0.12
Nodes (16): Conventions (read once), File map, Garde-Manger M7 · Garde (home) redesign + Item detail — Implementation Plan, Self-review notes, Task 10: Item-detail route — server, Task 11: Item-detail route — page, Task 12: Milestone verification + final review, Task 1: Category icons + `categoryIcon()` (TDD) (+8 more)

### Community 36 - "E2E Testing Design"
Cohesion: 0.15
Nodes (12): 10. Isolation, determinism, error handling, 11. Reporting the found bug, 12. Deliverables, 1. Goal, 2. Scope, 3. Methodology — blind hunt, 4. Server approach (decision: ① built adapter-node), 5. Harness architecture (+4 more)

### Community 37 - "Database Schema & Migrations"
Cohesion: 0.29
Nodes (12): Migration 0000 (users table), Migration 0001 (auth/household tables), Migration 0002 (catalogue + inventory tables), credentials table, foods table, households table, inventory_items table, invitations table (+4 more)

### Community 38 - "E2E Testing Plan"
Cohesion: 0.14
Nodes (13): E2E Testing Suite & Blind Bug Hunt — Implementation Plan, Task 10: Account — profile, theme, passkey remove, push (`app` project), Task 11: Scan — manual entry + confirm packaged (`app` project), Task 12: Bilan — monthly stats + waste streak (`app` project), Task 13: Passkey via virtual authenticator (`passkey` project), Task 14: Full sweep + triage + report, Task 1: Harness bootstrap + smoke test, Task 2: DB fixtures (+5 more)

### Community 39 - "M6 Design System Plan"
Cohesion: 0.13
Nodes (14): Conventions (read once), File map, Garde-Manger M6 · Design-System Foundation — Implementation Plan, Self-review notes, Task 10: Milestone verification, Task 1: Theme tokens via `light-dark()`, Task 2: `resolveTheme` pure helper (TDD), Task 3: Stamp `data-theme` + `lang` server-side (no FOUC) (+6 more)

### Community 40 - "M3 Scanning Plan"
Cohesion: 0.13
Nodes (14): Acceptance (M3 done when), Guardrails (apply to every task), M3 — Scanning + Open Food Facts, Task 10 — Self-hosted ZXing WASM + bundle discipline, Task 11 — Final review + merge, Task 1 — `products` schema + migration `0003`, Task 2 — Shared barcode utility `$lib/barcode.ts` (pure), Task 3 — OFF client `$lib/server/off.ts` (pure, cache-first, injectable) (+6 more)

### Community 41 - "Invitation & Household Pages"
Cohesion: 0.07
Nodes (14): { data, form }, t, adminCount, { data, form }, dateLocale, t, { form, data }, t (+6 more)

### Community 42 - "Agent Coding Guidelines"
Cohesion: 0.18
Nodes (10): 1. Think Before Coding, 2. Simplicity First, 3. Surgical Changes, 4. Goal-Driven Execution, Agent skills, Coding behavioral guidelines, Domain docs, graphify (+2 more)

### Community 43 - "Public Landing Page Plan"
Cohesion: 0.20
Nodes (5): {
		actions,
		children
	}, dragging, maxReveal, offset, SwipeAction

### Community 44 - "Apple HIG Foundations Plan"
Cohesion: 0.18
Nodes (10): Apple HIG — M1 Foundations Implementation Plan, File Structure, Roadmap — subsequent milestones (each gets its own plan when reached), Self-Review, Task 1: HIG token regression test (TDD anchor), Task 2: Typography ramp (iOS Dynamic Type) tokens + utilities, Task 3: HIG semantic color roles (mapped onto warm tokens), Task 4: Material, metric, and motion tokens (+2 more)

### Community 45 - "Apple HIG Chrome Plan"
Cohesion: 0.18
Nodes (10): After M2: remaining milestones (own plans when reached), Apple HIG — M2 Chrome Wiring Implementation Plan, File Structure, Self-Review, Task 1: Extract HouseholdMenu from AppHeader, Task 2: Wire NavigationBar + HouseholdMenu into Home, drop AppHeader from layout, Task 3: NavigationBar on Bilan, Cuisiner, Account, Task 4: Pushed views get a back button (+2 more)

### Community 46 - "Household Admin Concepts"
Cohesion: 0.47
Nodes (3): HouseholdError, requireMembership authorization pattern, Household-admin CRUD Design Spec

### Community 47 - "M4 Notifications & PWA Plan"
Cohesion: 0.14
Nodes (13): Acceptance (M4 done when), Guardrails (apply to every task), M4 — Notifications + PWA, Task 10 — Final review + merge, Task 1 — `push_subscriptions` schema + migration `0004`, Task 2 — VAPID config glue `$lib/server/pushConfig.ts` + install `web-push`, Task 3 — Push module `$lib/server/push.ts` (pure seam, lifecycle), Task 4 — Expiry aggregation `$lib/server/reminders.ts` (pure) (+5 more)

### Community 48 - "Daily Push Reminders"
Cohesion: 0.08
Nodes (34): DailyReminderSummary, runDailyReminders(), FakeSender, FIXED_NOW, VAPID, buildDailyPayload(), byteLength(), COPY (+26 more)

### Community 49 - "App Icon Design"
Cohesion: 0.18
Nodes (10): Assets written to `static/`, Deliverables, Design direction (approved), Garde-Manger app icon — design spec, Out of scope, Problem, Refinements agreed during review, Source of truth (+2 more)

### Community 50 - "App Layout Shell"
Cohesion: 0.18
Nodes (9): backHref, { data, children }, isAccount, isDeep, isHome, path, routeTitle, t (+1 more)

### Community 51 - "Partial Consumption Plan"
Cohesion: 0.33
Nodes (8): Final verification, Task 1: `recordUse` — quantity-aware lifecycle helper, Tier 1 — Inventory UX Implementation Plan, 1. Partial consumption, InventoryItem, recordUse(), setStatus(), seedFixtures()

### Community 52 - "Bilan and Opened Re-dating"
Cohesion: 0.25
Nodes (8): A. Bilan month-over-month, B. Opened-basis re-dating, Context, Design, Non-goals, Testing (TDD), Tier 2 — Bilan month-over-month + opened-basis re-dating, updateItem()

### Community 53 - "UI Primitives & Home Page"
Cohesion: 0.10
Nodes (17): Task 3: Create the public landing route, {
		variant = 'primary',
		href = undefined,
		type = 'button',
		icon = undefined,
		full = false,
		children,
		...rest
	}, {
		icon,
		title,
		body = undefined,
		children
	}, active, Household, {
		households,
		activeHouseholdId,
		t
	}, IconName, {
		name,
		size = 24,
		class: klass = ''
	} (+9 more)

### Community 54 - "Playwright Config and Smoke"
Cohesion: 0.36
Nodes (6): serverEnv, @playwright/test, BASE_URL, CRON_SECRET, DB_PATH, PORT

### Community 55 - "Service Worker Caching"
Cohesion: 0.25
Nodes (6): ASSET_SET, ASSETS, NETWORK_ONLY_PREFIXES, networkWithOfflineFallback(), offlineFallback(), PushFields

### Community 56 - "PWA Icon Plan"
Cohesion: 0.25
Nodes (7): File Structure, Notes for the implementer, PWA App Icon Implementation Plan, Task 1: Finalize the master render script, Task 2: Generate the icon set and verify outputs programmatically, Task 3: Wire favicon + apple-touch-icon into app.html, Task 4: Final verification

### Community 57 - "Env Config and Landing"
Cohesion: 0.29
Nodes (3): @sveltejs/kit, variables, load()

### Community 58 - "Forgejo Issue Tracker Docs"
Cohesion: 0.29
Nodes (6): Conventions, Issue tracker: Forgejo, Pull requests as a triage surface, Wayfinding operations, When a skill says "fetch the relevant ticket", When a skill says "publish to the issue tracker"

### Community 59 - "Runtime Dependencies"
Cohesion: 0.29
Nodes (7): dependencies, barcode-detector, @simplewebauthn/browser, @simplewebauthn/server, valibot, web-push, zxing-wasm

### Community 60 - "Open Food Facts Integration"
Cohesion: 0.40
Nodes (3): Barcode normalize/validate (GTIN), Open Food Facts integration (cache-first), M3 Scanning + Open Food Facts Plan

### Community 61 - "Domain Docs Guide"
Cohesion: 0.33
Nodes (5): Before exploring, read these, Domain Docs, File structure, Flag ADR conflicts, Use the glossary's vocabulary

### Community 62 - "Item Detail and Listing"
Cohesion: 0.18
Nodes (16): Product image endpoint GET, Item detail load, Item detail page, openedEstimate(), listForUser(), resolveActiveHouseholdId(), bandFor(), getItemScoped() (+8 more)

### Community 63 - "Service Worker TS Config"
Cohesion: 0.33
Nodes (5): $app/tsconfig/service-worker, compilerOptions, strict, extends, include

### Community 64 - "Renovate Config"
Cohesion: 0.33
Nodes (5): config:recommended, extends, packageRules, platformAutomerge, $schema

### Community 65 - "Action Sheet Component"
Cohesion: 0.47
Nodes (5): Action, close(), onKeydown(), {
		open = $bindable(false),
		title,
		actions,
		cancelLabel = 'Annuler',
		onClose
	}, pick()

### Community 66 - "Test Generation Skill"
Cohesion: 0.40
Nodes (4): Conventions (match these), Database-touching modules, Generate a test (bun:test), Steps

### Community 67 - "M2 Inventory & Catalogue Plan"
Cohesion: 0.15
Nodes (12): Done-when (M2 acceptance), File structure (M2), Garde-Manger — M2 Inventory & Catalogue Implementation Plan, Milestone context, Task 1 — Schema + migration 0002 (foods, shelf_lives, inventory_items), Task 2 — Hand-rolled i18n infrastructure, Task 3 — Catalogue data (DRAFT) + idempotent seeder, Task 4 — Catalogue module (search + DDM computation) (+4 more)

### Community 68 - "PWA Icon Generator"
Cohesion: 0.18
Nodes (10): CSS custom-property design tokens, blank(), draw_letter(), fill_rect(), main(), make_badge(), make_icon(), rounded_bg() (+2 more)

### Community 69 - "M10 Cuisiner Plan"
Cohesion: 0.17
Nodes (11): Conventions (read once), File map, Garde-Manger M10 · Cuisiner (use-it-up ideas) — Implementation Plan, Self-review notes, Task 1: Cook ideas dataset + `ideasForCategory` (TDD), Task 2: `cook` (utensils) icon, Task 3: i18n keys (Cuisiner + bilan streak-zero polish), Task 4: Cuisiner route (server + page) (+3 more)

### Community 70 - "M9 Bilan Plan"
Cohesion: 0.17
Nodes (11): Conventions (read once), File map, Garde-Manger M9 · Bilan (anti-waste stats) — Implementation Plan, Self-review notes, Task 1: `householdStats` (TDD), Task 2: `stats` bar-chart icon, Task 3: i18n keys (nav + bilan), Task 4: `StatTile.svelte` (+3 more)

### Community 71 - "Push Notifications and PWA"
Cohesion: 0.28
Nodes (6): Daily reminder cron (/internal/cron/check-expiry), usersToNotify expiry aggregation, injectManifest service worker (offline view-only), Migration 0004 (push_subscriptions), M4 Notifications + PWA Plan, push_subscriptions table

### Community 72 - "Security Review Skill"
Cohesion: 0.40
Nodes (4): How to work, Scope (what to review), Security review (garde-manger), What to flag (in priority order)

### Community 73 - "Unit Test Writing Skill"
Cohesion: 0.40
Nodes (4): Conventions (match these), Database-touching modules, Generate a test (bun:test), Steps

### Community 74 - "Tier 3 Disclaimer & Rate Limit"
Cohesion: 0.14
Nodes (16): Task 6: i18n keys, Public Landing Page Implementation Plan, Self-Review, Task 1: Relocate the dashboard to `/garde-manger`, Task 2: Add `landing_*` i18n keys, Task 5: Update the daily-push deep-link and PWA start_url, Task 6: Full verification + graph refresh, A. Food-safety disclaimer (+8 more)

### Community 75 - "Drizzle Migration Skill Copy"
Cohesion: 0.25
Nodes (7): 1. Edit the schema, 2. Generate the migration, 3. Review the generated SQL — REQUIRED, 4. Apply, 5. Verify, Commit, Drizzle migration workflow

### Community 76 - "Security Reviewer Agent"
Cohesion: 0.50
Nodes (3): How to work, Scope (what to review), What to flag (in priority order)

### Community 77 - "SQLite MCP Config"
Cohesion: 0.50
Nodes (3): npx, sqlite, mcp-server-sqlite-npx

### Community 80 - "M5 Deploy & Harden Plan"
Cohesion: 0.18
Nodes (10): Acceptance (M5 done when), Guardrails, M5 — Deploy & harden, Task 1 — Security headers + CSP (the careful one), Task 2 — valibot validation audit, Task 3 — Off-box SQLite backup, Task 4 — Deploy documentation `DEPLOY.md`, Task 5 — Production-config audit (+2 more)

### Community 83 - "M0 Foundation Plan"
Cohesion: 0.18
Nodes (10): Done-when (M0 acceptance), File structure (created/modified in M0), Garde-Manger — M0 Foundation Implementation Plan, Scope & milestone context, Task 1: Scaffold the SvelteKit app (Bun, TS, minimal), Task 2: Configure `adapter-node` and verify Bun serving, Task 3: Add Drizzle, then swap the client to `bun:sqlite`, Task 4: First table (`users`) + migration + DB test (TDD) (+2 more)

### Community 87 - "Session Hooks & Cookies"
Cohesion: 0.26
Nodes (12): handle(), resolveLocale(), clearSessionCookie(), SESSION_COOKIE, setSessionCookie(), createSession(), invalidateSession(), randomId() (+4 more)

### Community 89 - "Deployment Guide"
Cohesion: 0.20
Nodes (9): 1. Build & run, 2. Environment variables (production), 3. Reverse proxy (Traefik / Coolify), 4. Persistent storage (single writer), 5. Healthcheck, 6. Scheduled Tasks (two), 7. Manual smoke checklist (post-deploy), 8. First-run notes (+1 more)

### Community 90 - "M8 Add/Scan Flow Plan"
Cohesion: 0.20
Nodes (9): Conventions (read once), File map, Garde-Manger M8 · Add / Scan flow — Implementation Plan, Self-review notes, Task 1: i18n key for "change food", Task 2: Redesign `/add` — chooser + focused confirm (scroll-trap fix), Task 3: Restyle `/scan`, Task 4: Restyle `/scan/[barcode]` packaged confirm (+1 more)

### Community 91 - "UI Audit Capture Script"
Cohesion: 0.27
Nodes (9): playwright, APP_ROUTES, capture(), main(), PUBLIC_ROUTES, runAxe(), setTheme(), THEMES (+1 more)

### Community 97 - "Project README"
Cohesion: 0.22
Nodes (8): Auth / env, Build & run, Database, Deploy (Coolify + Railpack), Develop, Garde-Manger, Inventory & catalogue (M2), Test / quality

### Community 99 - "Passkey Enroll & Login"
Cohesion: 0.12
Nodes (18): POST /api/webauthn/authenticate/options, POST /api/webauthn/authenticate/verify, POST /api/webauthn/register/options, POST /api/webauthn/register/verify, @simplewebauthn/browser, errorMessage, handleEnroll(), loading (+10 more)

### Community 100 - "Test DB Fixtures"
Cohesion: 0.25
Nodes (15): makeDb(), makeDb(), createDb(), runMigrations(), makeDb(), makeDb(), makeDb(), makeDb() (+7 more)

### Community 108 - "Backup Script and Tests"
Cohesion: 0.23
Nodes (5): dest, sqlite, stamp, css, backupDatabase()

### Community 109 - "Inventory List E2E"
Cohesion: 0.32
Nodes (6): Task 2: Wire `recordUse` into the consume/discard actions, BADGE, BAND, dedicatedHousehold(), LOC, ownerId()

### Community 110 - "Expiry Cron Web Push"
Cohesion: 0.39
Nodes (6): web-push, secretMatches(), resolveHostIps(), getVapid(), webPushSender, POST()

### Community 112 - "E2E User Fixtures"
Cohesion: 0.40
Nodes (5): signUpFreshUser(), getUserIdByEmail(), primaryId(), freshHousehold(), useDedicatedHousehold()

### Community 122 - "ESLint & Package Config"
Cohesion: 0.09
Nodes (26): gitignorePath, imports, #lib/*, name, packageManager, private, type, version (+18 more)

### Community 162 - "Home, Bilan & Cuisiner Features"
Cohesion: 0.31
Nodes (11): BottomNav app shell (5-slot tab bar + FAB), categoryIcon() category→IconName mapping, dayBadge() + DayBadge urgency badge, householdStats() anti-waste aggregation, Inline SVG icon sprite + Icon.svelte, ideasForCategory() offline use-it-up ideas, Household-scoped getItemScoped/updateItem/deleteItem, Urgency banding (urgent / soon / ok) (+3 more)

### Community 232 - "PWA App Icons"
Cohesion: 0.50
Nodes (5): Notification Badge 72 (monochrome GM mark), App Icon 192 (GM monogram, blue tile), App Icon 512 (GM monogram, blue tile), Maskable App Icon 192 (GM, full-bleed safe zone), Maskable App Icon 512 (GM, full-bleed safe zone)

### Community 248 - "OFF Client Tests"
Cohesion: 0.20
Nodes (7): CFG, FakeFetch, FakeFetchOptions, FIXED_NOW, jsonResponse(), makeFakeFetch(), NOT_FOUND_BODY

### Community 269 - "Bilan Stats Page"
Cohesion: 0.25
Nodes (6): {
		value,
		label,
		tone = 'neutral'
	}, { data }, empty, s, t, wasteTrend

## Knowledge Gaps
- **51 isolated node(s):** `prettier`, `prettier-plugin-svelte`, `svelte-check`, `@sveltejs/adapter-auto`, `@types/bun` (+46 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 834 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Garde-Manger Design Spec` connect `Product Architecture Decisions` to `Database Schema & Migrations`, `i18n, Theming & Add Flow`, `Push Notifications and PWA`, `Deployment & Security Decisions`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `createDb()` (e.g. with `8. Data & seeding` and `runMigrations()`) actually correct?**
  _`createDb()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `prettier`, `prettier-plugin-svelte`, `svelte-check` to the rest of the system?**
  _51 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Navigation & Sheet Components` be split into smaller, more focused modules?**
  _Cohesion score 0.09116809116809117 - nodes in this community are weakly interconnected._
- **Why does `@sveltejs/kit` connect `Env Config and Landing` to `WebAuthn Passkey Auth`, `Household Admin CRUD Plan`, `Password & Rate Limiting`, `Shelf-Life Lookup Design`, `Barcode Scan & OFF`, `Expiry Cron Web Push`, `Daily Push Reminders`, `Internationalization and Invites`, `Session Hooks & Cookies`, `Theme & Credentials Helpers`, `ESLint & Package Config`, `Item Detail and Listing`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `runMigrations()` (e.g. with `4. Apply` and `4. Apply`) actually correct?**
  _`runMigrations()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `Codebase Audit Findings` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._