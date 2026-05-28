# Garde-Manger — Design Spec

**Status:** Draft for review
**Date:** 2026-05-28
**Author:** Simon Brunou (with Claude)

---

## 1. Overview

Garde-Manger is a self-hosted web app that tracks what's in a household's fridge,
freezer and cupboards, shared across the members of one or several households, to
help **avoid food waste by tracking expiry**.

It is **mobile-first** and installable as a **PWA** (used in the kitchen, on a
phone), **bilingual (French-first, + English)**, and deliberately **not** real-time:
refreshing on load is sufficient.

### Primary user stories

- As a member, I **scan** a packaged product's barcode; the app fetches its
  name/brand/image from Open Food Facts and I enter the **use-by date (DLC)**.
- As a member, I add **fresh produce** with no barcode by picking it from a
  catalogue; the app computes an estimated **"best eaten around" date (DDM)** from
  typical shelf life, which I can override.
- When food leaves, I tap **"j'ai mangé"** or **"jeté"** — a one-tap consumed/discarded signal.
- As a member, I get **one daily push** listing items approaching their date.
- As an admin, I create a household and invite family members via a **shareable link**.
- As a user, I belong to one or more households and **switch** between them.
- I sign in with **email + password** or, on supported devices, a **passkey**.

---

## 2. Values & non-goals

### Values (ranked, from the brief)

1. **Sustainability / ecological frugality** — minimal client JS, small runtime
   footprint, no oversized infra, scales-to-near-nothing at idle.
2. **Self-hostable** — runs on the user's homelab via Coolify + Railpack (non-negotiable).
3. **Clean, maintainable code** — one language (TypeScript) end-to-end, small
   dependency surface, clear module boundaries.

Plus the desired stack qualities: innovative, ecological, fun DX, modern, adaptive
(mobile-first, responsive, accessible, degrades gracefully on poor connections).

### Non-goals (explicitly out of scope for MVP)

- Real-time / live sync between devices (refresh-on-load is enough).
- **Offline writes / sync** — offline is **view-only** (cached read), not offline editing.
- Native mobile apps (PWA only).
- Outbound email / SMTP. Web Push is the only notification channel; invites are
  shareable links (copy / QR). Self-service password reset is **deferred** (admin
  re-invites until then). Passkeys further reduce reliance on passwords.
- OCR / photo recognition of expiry dates or products.
- Shopping lists, recipes, nutrition analysis, waste-analytics dashboards.
- UI languages beyond FR/EN.

---

## 3. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **SvelteKit 2 + Svelte 5 (runes)**, TypeScript, `@sveltejs/adapter-node` | SSR + progressive enhancement; per-route opt-out ships **zero JS** where interactivity isn't needed; one language front+back; first-class PWA tooling; innovative-yet-frugal compiler model. |
| Runtime | **Bun** — dev, tooling, and serving | Fast, all-in-one (install/dev/test/bundle); built-in `bun:sqlite` and `Bun.password` remove native deps. |
| Adapter | **`@sveltejs/adapter-node`, run with Bun** (`bun ./build/index.js`) | The official, maintained adapter handles `ORIGIN` / form actions / CSRF correctly. **Not `svelte-adapter-bun`** — it forks an old adapter-node, is stalled, and mishandles `ORIGIN`, breaking our form-action-heavy, authenticated pages. We forgo native `Bun.serve()` for correctness + maintainability. |
| Database | **SQLite** via built-in **`bun:sqlite`** + **Drizzle ORM** (`drizzle-orm/bun-sqlite`) | Single file, no DB server, trivial backup, ample for family scale; no native compile step. A thin DB-init seam keeps the driver swappable (`bun:sqlite` ↔ `better-sqlite3`) as a fall-back-to-Node escape hatch. |
| Auth | **Email + password** (argon2id via **`Bun.password`**) **+ passkeys** (**SimpleWebAuthn**) **+ invite links**; `id.secret` session cookies | Password = universal baseline + recovery; passkeys = phishing-resistant convenience; invites = household joining. No external hashing dep. |
| Validation | **valibot** | Tiny, tree-shakeable schema validation on every form/body. |
| PWA / SW | **`@vite-pwa/sveltekit`**, `strategies: 'injectManifest'` + custom `src/service-worker.ts` | Manifest + precache + custom `push`/`notificationclick`. SvelteKit's built-in SW registration **disabled** (single owner). |
| Barcode scan | **`barcode-detector`** polyfill (native `BarcodeDetector` on Android Chrome; **ZXing-C++ WASM** fallback on iOS Safari & co.), self-hosted WASM, lazy-loaded on `/scan` only | One code path; ~1 MB WASM kept out of the main bundle. |
| Push | **`web-push`** (VAPID) + **Declarative Web Push** JSON (primary) with classic SW handler (fallback) | Declarative payload renders on iOS without JS, avoiding silent-push subscription revocation. |
| Product data | **Open Food Facts API v2** (server-side, cache-first) | Name/brand/image/quantity by barcode. |
| Shelf-life data | **European guidance**: ADEME + Santé publique France (Manger Bouger) + ANSES; **Ciqual** for the French food taxonomy | Curated, French-first, on-mission (anti-waste), Licence Ouverte / facts (see §8). **Replaces** USDA FoodKeeper. |
| i18n | **Paraglide JS (inlang)** — FR-first + EN | Compile-time messages → zero runtime lib, type-safe keys, missing-translation detection; SSR-friendly. (Hand-rolled dictionary is the no-tooling fallback — see open items.) |
| Hosting | **Coolify + Railpack** on the homelab, persistent volume, Scheduled Tasks for cron + backup | Self-hosted PaaS; Railpack runs Bun via the Node provider. |

### Rendering boundary (the "little client JS" value, made concrete)

- **Zero-JS routes** (`export const ssr = true; export const csr = false;`): inventory
  list, item detail, household management, "expiring soon", and the **password** auth
  path. Forms round-trip the server (full reload, no `use:enhance`).
- **JS islands** (CSR on, libs via dynamic `import()`), the *only* three: `/scan`
  (camera + WASM decoder), notification settings (push subscribe), and the **passkey
  button** on auth pages (progressive enhancement over the working password form).

---

## 4. Architecture

A single SvelteKit app (adapter-node, run with Bun) behind Coolify's Traefik proxy,
one SQLite file on a persistent volume (WAL), and daily Coolify Scheduled Tasks.
Three external touchpoints: Open Food Facts (read, cached), Web Push send (daily),
and the bundled European shelf-life seed (build-time only).

```
  Phone (installed PWA)
    │  HTTPS
    ▼
  Coolify proxy (Traefik) ──► SvelteKit (adapter-node on Bun)   [single instance]
                                 │
                                 ├── Drizzle ──► SQLite (/app/data/garde-manger.db, WAL)
                                 ├── OFF v2 lookup (server, cache-first)
                                 └── web-push send (VAPID)

  Coolify Scheduled Task (daily 08:00) ──► POST /internal/cron/check-expiry  🔒 shared secret
  Coolify Scheduled Task (daily)       ──► SQLite online .backup → off-box
```

**Module boundaries** (`$lib/server/*` — each independently understandable/testable;
routes stay thin and delegate):

- `db` — schema, migrations, connection + pragmas at boot, the swappable driver seam.
- `auth` — sessions, password hashing, **WebAuthn (passkeys)**, `hooks.server.ts` integration.
- `households` — membership + role checks, scoping helpers (`requireMembership`).
- `off` — Open Food Facts client + cache (the only place that calls OFF).
- `catalogue` — European-sourced food search + shelf-life (DDM) computation.
- `inventory` — item CRUD, lifecycle (active → consumed/discarded), effective-date logic.
- `push` — subscription storage, send, lifecycle/pruning.
- `i18n` — FR/EN messages + locale resolution.
- `$lib/scan` *(client island)* — camera + decode.

---

## 5. Data model

SQLite via Drizzle. **WAL** mode; `busy_timeout`; `foreign_keys=ON`. Every
inventory/household query is **scoped by `household_id`** and authorized against the
caller's membership — never trust the client. **11 tables** (+ a transient WebAuthn
challenge store, which may be a signed cookie rather than a table).

### Accounts & access

| Table | Key columns | Notes |
|---|---|---|
| `users` | `id`, `email` (unique, lowercased), `password_hash`, `display_name`, `locale` (`fr`\|`en`), `created_at` | argon2id hash via `Bun.password`. |
| `sessions` | `id`, `secret_hash` (BLOB), `user_id`, `created_at`, `expires_at` | `id.secret` model; cookie `HttpOnly; Secure; SameSite=Lax`; rolling refresh. |
| `households` | `id`, `name`, `warn_days` (default 3), `created_at` | `warn_days` = notification window. |
| `memberships` | `id`, `household_id`, `user_id`, `role` (`admin`\|`member`), `joined_at` | **Unique (household_id, user_id)**. A user may have many. |
| `invitations` | `id`, `household_id`, `token_hash`, `role`, `expires_at`, `created_by`, `used_at` | Single-use, hashed token; shareable link/QR. |
| `credentials` | `id`, `user_id`, `credential_id` (unique), `public_key` (BLOB), `counter`, `transports` (JSON), `backed_up` (bool), `device_label`, `created_at`, `last_used_at` | **Passkeys** (WebAuthn). One user → many. |
| `push_subscriptions` | `id`, `user_id`, `endpoint`, `p256dh`, `auth`, `device_label`, `last_success_at`, `failure_count`, `created_at` | Per user-device. Pruned on 404/410. |

### Reference data (shared, read-mostly)

| Table | Key columns | Notes |
|---|---|---|
| `products` | `barcode` (PK), `name`, `brand`, `image_path`, `quantity`, `categories`, `status` (`found`\|`not_found`), `fetched_at` | OFF cache. Negative results cached with TTL. Image bytes stored locally on the volume. |
| `foods` | `id`, `name_fr`, `name_en`, `subtitle_fr`, `subtitle_en`, `keywords_fr`, `keywords_en`, `category`, `default_location` | Curated ~150–250 common foods (European sources). |
| `shelf_lives` | `id`, `food_id`, `location` (`pantry`\|`fridge`\|`freezer`), `basis` (`purchase`\|`opened`\|`unspecified`), `min`, `max`, `unit` (`hours`…`years`), `not_recommended` (bool), `tips_fr`, `tips_en` | One food → several rows (per location). |

### The inventory

| Table | Key columns | Notes |
|---|---|---|
| `inventory_items` | `id`, `household_id`, `added_by`, `kind` (`packaged`\|`fresh`), `barcode` (→products, nullable), `food_id` (→foods, nullable), `custom_name` (nullable), `quantity` (count, default 1), `location`, `added_at`, `use_by_date` (nullable, DLC), `best_by_date` (nullable, DDM estimate), `is_estimate` (bool), `status` (`active`\|`consumed`\|`discarded`), `closed_at`, `notes` | Links to a product **or** a food **or** a free-text name. |

- **Generated column** `effective_date = COALESCE(use_by_date, best_by_date)`, indexed
  `(household_id, status, effective_date)` — powers the sorted list *and* the daily
  expiry scan with one cheap index.

---

## 6. Key flows

### 6.1 Scan a packaged product
1. `/scan` island opens the rear camera (`getUserMedia`, `facingMode: environment`),
   runs a decode loop (~10 fps, downscaled canvas) via native `BarcodeDetector` or the
   lazily-loaded ZXing WASM fallback. Formats `["ean_13","ean_8","upc_a","upc_e"]`.
2. On a hit: normalize (UPC-A → EAN-13), require the same code on 2 consecutive frames,
   POST the barcode.
3. Server checks `products`; on miss, calls OFF v2 (§9), stores the result (downloads the
   image bytes to the volume), returns it.
4. User confirms name/brand, sets **use-by date (DLC)**, quantity, location → `inventory_item` (`kind=packaged`).
5. **Fallbacks:** not found (`status:0`) → prefilled manual-entry form, cached as
   `not_found` with TTL; camera denied / no focus → manual barcode or name entry
   (the manual link is *always visible*, not hidden behind an error); OFF slow/down →
   short timeout → manual entry.

### 6.2 Add fresh produce
1. User searches the `foods` catalogue (server-side over localized name + keywords).
2. Picks a food + a storage **location** (defaults to the food's `default_location`).
3. Server computes **best-eaten-around = added_date + midpoint(min,max)** of the matching
   `shelf_lives` row (in days), flags `is_estimate=true`. `not_recommended` / "ripen first"
   entries surface as guidance, not dates.
4. User may **override**. The UI always frames it as an estimate ("DDM estimée ~2 juin,
   d'après ADEME / Santé publique France"), never a strict use-by.
5. **Fallback:** not in catalogue → free-text `custom_name` item with an optional manual date.

### 6.3 Mark consumed / discarded
- One tap from the list or detail → **"j'ai mangé"** or **"jeté"** → sets `status` + `closed_at`;
  item leaves the active list. This is the data a future "what you waste" view would read — no analytics built now.

### 6.4 Daily reminder
1. Coolify Scheduled Task (`0 8 * * *`) → `POST /internal/cron/check-expiry` (shared secret).
2. Per user, aggregate across their households the `active` items with
   `effective_date ≤ today + warn_days` (or past).
3. Send **one aggregated declarative Web Push per device**: count, deep-link to
   "expiring soon", app badge.
4. On send: `204` → update `last_success_at`; `404/410` → delete subscription; else →
   increment `failure_count`. A `last_notified_on` guard makes the endpoint safe to call twice/day.

### 6.5 Auth, passkeys & invites
- **Signup:** email + password (argon2id via `Bun.password`). `id.secret` session cookie
  validated in `hooks.server.ts` → `event.locals`. Authz enforced in `+page.server.ts` /
  actions (**never** `+layout.server.ts`).
- **Passkeys:** enroll from account settings (or right after signup) via SimpleWebAuthn;
  sign in with password **or** a passkey (discoverable credentials → usernameless one-tap).
- **Invites:** an admin mints a single-use, hashed, expiring `invitation` and shares the link
  (copy / QR). The invitee signs up or logs in → joins with the invite's role.

### 6.6 PWA install & permission onboarding
- Web manifest, `display: standalone`, stable `id`; precache the app shell + scanner WASM.
- **iOS:** detect "not installed" → guide Add-to-Home-Screen **before** offering notifications
  (iOS delivers Web Push only to an installed PWA, 16.4+).
- **Permission priming:** explain value in-app first; call `Notification.requestPermission()`
  only on a positive tap; on each launch, re-check the subscription and offer to reconnect
  (no iOS `pushsubscriptionchange`).

---

## 7. UI / screens

- **Home = urgency-first** (chosen direction): one list sorted by `effective_date`, split
  into three colour bands — 🔴 *à consommer vite* / 🟠 *bientôt* / 🟢 *encore bon*. A
  **household switcher** up top, a **location filter chip** (frigo / congélo / placard) layered
  on, OFF photos as row thumbnails, and a single **"＋ Ajouter"** button. The layout itself
  nudges you to eat what's dying.
- **Add flow:** `＋ Ajouter` → a sheet (📷 *scanner* / 🥕 *fruit ou légume* / ✏️ *saisie libre*).
  - **Packaged → DLC:** form pre-filled by OFF; one **hard date** in red; OFF attribution.
  - **Fresh → DDM:** computed **estimate** in an amber box, explicitly framed as an estimate
    with **✎ Modifier**; sourced from ADEME / Santé publique France.
- The **red hard date you type** vs the **amber soft date we estimate** is the product's core idea.
- Accessible, responsive, FR-first; dates/numbers via `Intl`.

---

## 8. Shelf-life catalogue (European sources)

- **Sources:** ADEME (anti-waste guidance + the DLC/DDM framework), Santé publique France
  ("Manger Bouger" conservation guide), ANSES (food safety; publisher of **Ciqual**, the
  canonical French food-composition table used here for the **food name taxonomy**). EFSA
  provides the EU date-marking framework.
- **No turnkey EU dataset exists** (unlike USDA FoodKeeper). We therefore **curate ~150–250
  common foods** into `foods` + `shelf_lives` ourselves — which we'd do regardless.
- **Licensing:** the storage durations are **facts** (not copyrightable); transcribing them
  into our schema carries no license burden, and we cite the sources for credibility. Where an
  actual dataset is used (Ciqual), it's **Licence Ouverte / Etalab** — permissive,
  attribution-only, **not** share-alike. Attribution surface credits ADEME / Santé publique
  France / ANSES alongside the OFF credit.
- **Vocabulary:** adopt the official French terms — **DLC** (date limite de consommation =
  hard use-by → `use_by_date`) vs **DDM** (date de durabilité minimale = best-before →
  `best_by_date`, `is_estimate`). Using the real terms makes the anti-waste message ("a passed
  DDM ≠ throw it out") native and trustworthy.
- **Computation:** "best eaten around" = `added_date + midpoint(min,max)` in days, per location;
  user-overridable; always an estimate. Curation is **conservative for risky foods** (raw
  meat/eggs/seafood). French-first; English is the translation.

---

## 9. Open Food Facts integration

- **Endpoint:** `GET https://world.openfoodfacts.org/api/v2/product/{barcode}.json`
  `?fields=product_name,brands,image_front_url,image_front_small_url,quantity,categories_tags`.
- **Header:** `User-Agent: GardeManger/<version> (<contact-email>)` (required).
- **Rate limit:** ~15 product reads/min **per IP** — and our server is a single IP for all
  users. Cache is therefore **mandatory**: cache-first, only call OFF on a genuine miss
  ("1 real scan = at most 1 OFF call"). Cache negative (`not_found`) results with a TTL.
- **Not found:** `status: 0` → manual-entry fallback.
- **Licensing/attribution:** data ODbL, images CC-BY-SA 3.0. Show attribution; store images
  locally with credit. **Keep OFF data out of the `foods`/`shelf_lives` tables** so ODbL
  share-alike doesn't attach to our catalogue — OFF is only a runtime barcode→name lookup.
- **Dev:** use the staging host `https://world.openfoodfacts.net` (basic auth `off`/`off`).

---

## 10. PWA & notifications

- **Manifest:** `display: standalone`, stable `id`, name/short_name, **maskable icons**,
  theme/background colours, per-locale `lang`, `start_url`.
- **Service worker:** `@vite-pwa/sveltekit` `injectManifest` + custom `src/service-worker.ts`.
  Precache app shell **and** scanner WASM. SvelteKit's built-in SW registration disabled.
- **Offline (view-only):** SW serves the cached shell; inventory list cached
  **stale-while-revalidate**; writes show a calm "hors-ligne" banner.
- **Push format:** **Declarative Web Push** primary (`{"web_push":8030,…}`, renders on iOS
  18.4+ without JS); classic SW `push → showNotification` fallback. **Every** push shows a
  visible notification (else iOS revokes). Payload < 3 KB, deep-link + badge, no action buttons.
- **Lifecycle:** per-device subscriptions with `failure_count`/`last_success_at`; prune on
  404/410; re-check & offer reconnect on each launch.

---

## 11. Internationalisation (FR / EN)

- **Paraglide JS (inlang):** messages compiled to tree-shakeable functions → **zero runtime
  library**, type-safe keys, build-time missing-translation detection; works with SSR so even
  zero-JS pages render localized.
- **Locale resolution:** `users.locale` → cookie → `Accept-Language`, resolved per request into
  `event.locals`. Dates/numbers via the built-in `Intl`.
- **Catalogue:** localized via the `*_fr` / `*_en` columns. FR-first content; EN translated.

---

## 12. Security

- **Passwords:** argon2id via `Bun.password`.
- **Sessions:** `id.secret`, secret stored only as `SHA-256` hash, constant-time compare;
  cookie `HttpOnly; Secure; SameSite=Lax`; expiry + rolling refresh; validated in `hooks.server.ts`.
- **Authorization:** `requireMembership(householdId, role?)` on **every** household-scoped query;
  enforced in `+page.server.ts` / actions, **never** `+layout.server.ts`.
- **CSRF:** SvelteKit's built-in Origin check on form posts — relies on correct origin behind
  Traefik (proxy headers); this is precisely why the maintained `adapter-node` was required.
- **Passkeys (WebAuthn):** verify challenge/origin/RP-ID; single-use challenges; handle the
  synced-passkey `counter == 0` case (SimpleWebAuthn does); bound to `RP_ID` over HTTPS.
- **Invitations:** hashed, single-use, expiring, role baked in.
- **Internal cron endpoint:** shared secret header (`CRON_SECRET`), constant-time compare.
- **Validation:** valibot on every form/body. **Headers:** `Permissions-Policy: camera=(self)`,
  `.wasm` served as `application/wasm`, a sensible CSP. Rate-limit auth attempts.

---

## 13. Deployment (Coolify + Railpack)

- **Build pack:** select **Railpack**. Declare `"packageManager": "bun@x.y.z"` + commit
  `bun.lock` so Railpack's Node provider installs/runs with Bun. Build `vite build`
  (adapter-node), start `bun ./build/index.js`. A minimal **Dockerfile** is kept as a fallback.
- **Proxy:** `PROTOCOL_HEADER=x-forwarded-proto`, `HOST_HEADER=x-forwarded-host` (correct CSRF
  **and** WebAuthn origin). `PORT`/`HOST` from Coolify.
- **Persistent storage:** mount a **directory** volume at `/app/data` (not the bare `.db` file)
  so WAL `-wal`/`-shm` siblings and cached OFF images live there. DB at
  `/app/data/garde-manger.db`.
- **Single writer:** **disable rolling updates** (recreate strategy, ~1–2 s downtime/deploy),
  single instance — never two containers on the SQLite file.
- **Cron:** Coolify Scheduled Task → the internal expiry endpoint (preferred over in-process).
- **Backup:** a second Scheduled Task using SQLite's online `.backup` (never a raw copy of a
  live WAL file), pushed off-box.
- **Healthcheck:** `/healthz` (cheap DB ping).
- **Secrets (runtime env):** `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:`),
  `SESSION_SECRET`, `CRON_SECRET`, `OFF_USER_AGENT`, `ORIGIN`, `RP_ID`, `RP_NAME`.
- **Stable domain** required for passkeys (RP ID); changing it later invalidates existing
  passkeys (passwords still work).

---

## 14. Error handling & testing

- **Philosophy:** loud on the server (logged), graceful on the client — OFF down → manual entry;
  camera denied → manual; offline → read-only banner; push fail → prune/retry. **No silent
  catches.** SvelteKit `+error.svelte` boundaries; form actions return typed `fail()` messages.
- **Tests (Bun's built-in runner, zero extra dep):**
  - *Unit:* shelf-life math (midpoint→days, unit conversion), effective-date logic, barcode
    normalization, session hashing/verify, `requireMembership`, `t()`.
  - *Integration:* DB layer against a temp SQLite, the cron expiry query, OFF client with mocked
    fetch (cache-first, negative caching, rate-limit discipline), **WebAuthn register/authenticate**
    ceremonies (mocked attestation/assertion, counter handling).
  - *Seed validation:* every curated food has ≥1 valid `shelf_life`, sane units, FR+EN names.
  - *E2E (lean, Playwright, optional):* scan→confirm→list, add-fresh, password + passkey sign-in,
    invite-and-join.

---

## 15. Risks, gotchas & open items

**Top risks (with mitigations):**
1. **iOS push subscription revocation** if a push doesn't render → always show a notification;
   declarative payload; prune + reconnect-on-launch.
2. **iOS install gate** — no Home-Screen install means no push → explicit onboarding.
3. **SQLite single-writer** under rolling deploys → recreate strategy, single instance, mount the directory.
4. **OFF rate-limit ban** (shared IP) → strict cache-first; contact email in `User-Agent`.
5. **WASM weight / offline** → self-host WASM, precache, lazy-load on `/scan` only.
6. **Passkey domain-change invalidation** → mitigated by the password fallback.
7. **Catalogue curation accuracy** → durations transcribed from prose guidance need careful,
   *conservative* review for risky foods. Claude drafts; Simon sanity-checks.

**Open items:**
- The exact curated ~150–250 food list (finalised during implementation).
- **Paraglide JS vs hand-rolled** i18n — spec assumes Paraglide; a zero-dep dictionary is the fallback.
- A future "what you waste" view (data is already captured).
- Self-service password reset (deferred; needs SMTP).

---

## 16. Out of scope / future ideas

Shopping-list generation, recipe suggestions from expiring items, waste-analytics dashboards,
email-digest notifications, self-service password reset via SMTP, expiry-date OCR, offline
writes / sync, barcode lookups for non-OFF regions, UI languages beyond FR/EN, household-level
item history/stats.
```
