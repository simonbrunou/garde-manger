# Garde-Manger — Design Spec

**Status:** Draft for review
**Date:** 2026-05-28
**Author:** Simon Brunou (with Claude)

---

## 1. Overview

Garde-Manger is a self-hosted web app that tracks what's in a household's fridge
and cupboards, shared across the members of one or several households, to help
**avoid food waste by tracking expiry**.

It is **mobile-first** and installable as a **PWA** (used in the kitchen, on a
phone). It is **not** a real-time app: refreshing on load is sufficient.

### Primary user stories

- As a household member, I scan a packaged product's barcode; the app fetches its
  name/brand/image from Open Food Facts and I enter the use-by date.
- As a member, I add fresh produce with no barcode by picking it from a catalogue;
  the app estimates a "best eaten around" date from typical shelf life.
- As a member, I get a daily push notification listing items approaching their date.
- As an admin, I create a household and invite family members via a shareable link.
- As a user, I belong to one or more households and switch between them.

---

## 2. Values & non-goals

### Values (ranked, from the brief)

1. **Sustainability / ecological frugality** — minimal client JS, small runtime
   footprint, no oversized infra, scales-to-near-nothing at idle.
2. **Self-hostable** — runs on the user's own homelab via Coolify + Railpack.
3. **Clean, maintainable code** — one language end-to-end, small dependency
   surface, clear module boundaries.

### Non-goals (explicitly out of scope for MVP)

- Real-time / live sync between devices (refresh-on-load is enough).
- Native mobile apps (PWA only).
- Outbound email of any kind. Web Push is the only notification channel; invites are
  shareable links (copy / QR), so the MVP needs **no SMTP**. Password reset is deferred
  (see §14) — until then an admin can re-invite. Adding email later is optional.
- OCR / photo recognition of expiry dates or products.
- Shopping lists, recipes, nutrition analysis, waste analytics dashboards.
- Multi-language UI (see §13 open items).

---

## 3. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **SvelteKit 2 + Svelte 5 (runes)**, `@sveltejs/adapter-node` | SSR + progressive enhancement; per-route opt-out of client JS ships zero JS where interactivity isn't needed; one language (TS) front+back; first-class PWA tooling. |
| Runtime | **Node 22** (single long-running process) | Railpack default; one container, no second service. |
| Database | **SQLite** via **Drizzle ORM** + **`better-sqlite3`** | Single file, no DB server, trivial backup, ample for family scale. `better-sqlite3` is the fastest in-process driver for a long-running server. |
| Auth | **Hand-rolled session-cookie auth** (`id.secret` model), `@oslojs/crypto` + `@oslojs/encoding`, **`@node-rs/argon2`** for passwords | Lucia the library is sunset into a guide; we follow its *current* pattern. Few deps, clean, well-documented. |
| PWA / SW | **`@vite-pwa/sveltekit`** with `strategies: 'injectManifest'` + custom `src/service-worker.ts` | Manifest + Workbox precache + custom `push`/`notificationclick` handlers. SvelteKit's built-in SW registration is **disabled** to avoid double ownership. |
| Barcode scan | **`barcode-detector`** polyfill (native `BarcodeDetector` on Android Chrome; ZXing-C++ WASM fallback elsewhere), self-hosted WASM, lazy-loaded on `/scan` only | One code path, ~966 KiB WASM kept out of the main bundle. |
| Push | **`web-push`** (VAPID) + **Declarative Web Push** JSON payload (primary) with classic SW handler (fallback) | Declarative payload renders on iOS without JS, avoiding silent-push subscription revocation. |
| Product data | **Open Food Facts API v2** (server-side, cached) | Name/brand/image/quantity by barcode. |
| Shelf-life data | **USDA FoodKeeper** dataset (CC0), bundled & seeded | Public-domain min/max storage durations by location. |
| Hosting | **Coolify + Railpack** on the user's homelab, persistent volume, Scheduled Task for cron | Self-hosted PaaS, zero-Dockerfile build, built-in cron. |

### Rendering boundary (the "little client JS" value, made concrete)

- **Zero-JS routes** (`export const ssr = true; export const csr = false;`): inventory
  list, item detail, household management, auth pages. Forms round-trip the server
  (no `use:enhance` there — they fully reload).
- **JS islands** (`csr` left default, libs loaded via dynamic `import()`): `/scan`
  (camera + WASM decoder) and notification settings (push subscribe). Form actions
  with `use:enhance` are used on routes that keep CSR.

---

## 4. Architecture

A single SvelteKit app behind Coolify's reverse proxy, one SQLite file on a
persistent volume, one daily Coolify Scheduled Task. Three external touchpoints:
Open Food Facts (read, cached), Web Push send (daily), and the bundled FoodKeeper
seed (build-time only).

```
  Phone (PWA)
    │  HTTPS
    ▼
  Coolify proxy (Traefik) ──► SvelteKit (adapter-node, Node 22)
                                 │
                                 ├── Drizzle ──► SQLite (/app/data/garde-manger.db, WAL)
                                 ├── OFF v2 lookup (server, cache-first)
                                 └── web-push send

  Coolify Scheduled Task (daily) ──► POST /internal/cron/check-expiry (shared-secret header)
```

**Module boundaries** (each independently understandable/testable):

- `$lib/server/db` — schema, migrations, connection (pragmas at boot).
- `$lib/server/auth` — sessions, password hashing, `hooks.server.ts` integration.
- `$lib/server/households` — membership + role checks, scoping helpers.
- `$lib/server/off` — Open Food Facts client + cache (the only place that calls OFF).
- `$lib/server/catalogue` — FoodKeeper-backed food lookup + shelf-life computation.
- `$lib/server/push` — subscription storage, send, lifecycle/pruning.
- `$lib/scan` (client island) — camera + decode.
- Routes — thin; delegate to the above.

---

## 5. Data model

SQLite via Drizzle. WAL mode; `busy_timeout`; `foreign_keys=ON`. Every
inventory/household query is **scoped by `household_id`** and authorized against the
caller's membership — never trust the client.

| Table | Key columns | Notes |
|---|---|---|
| `users` | `id`, `email` (unique), `password_hash`, `display_name`, `created_at` | |
| `sessions` | `id`, `secret_hash` (BLOB), `user_id`, `created_at` | `id.secret` token model; cookie `HttpOnly; Secure; SameSite=Lax`. |
| `households` | `id`, `name`, `warn_days` (default 3), `created_at` | `warn_days` = notification window. |
| `memberships` | `id`, `household_id`, `user_id`, `role` (`admin`\|`member`), `joined_at` | Unique (household_id, user_id). A user may have many. |
| `invitations` | `id`, `household_id`, `token_hash`, `role`, `expires_at`, `created_by`, `used_at` | Single-use, hashed token; shareable link. |
| `products` | `barcode` (PK), `name`, `brand`, `image_path`, `quantity`, `categories`, `status` (`found`\|`not_found`), `fetched_at` | OFF cache. Negative results cached with TTL. Image bytes stored locally. |
| `foods` | `id`, `name`, `name_subtitle`, `keywords`, `category`, `default_location` | FoodKeeper catalogue (curated ~150–250). |
| `shelf_lives` | `id`, `food_id`, `location` (`pantry`\|`fridge`\|`freezer`), `basis` (`purchase`\|`opened`\|`unspecified`), `min`, `max`, `unit` (`hours`\|`days`\|`weeks`\|`months`\|`years`), `not_recommended` (bool), `tips` | One food has several rows (per location). |
| `inventory_items` | `id`, `household_id`, `added_by`, `kind` (`packaged`\|`fresh`), `barcode` (nullable FK→products), `food_id` (nullable FK→foods), `custom_name` (nullable), `quantity`, `location`, `added_at`, `use_by_date` (nullable), `best_by_date` (nullable), `is_estimate` (bool), `status` (`active`\|`consumed`\|`discarded`), `closed_at`, `notes` | Links to a product **or** a food **or** a free-text name. `use_by_date` for packaged; estimated `best_by_date` for fresh. |
| `push_subscriptions` | `id`, `user_id`, `endpoint`, `p256dh`, `auth`, `device_label`, `last_success_at`, `failure_count`, `created_at` | Per user-device. Pruned on 404/410. |

**Effective date** for sorting/notifications = `COALESCE(use_by_date, best_by_date)`.

---

## 6. Key flows

### 6.1 Scan a packaged product

1. `/scan` island acquires the rear camera (`getUserMedia`, `facingMode: environment`),
   runs the decode loop (~10 fps, downscaled canvas), formats `["ean_13","upc_a"]`.
2. On a hit, normalize (UPC-A → EAN-13 with leading 0) and POST the barcode.
3. Server checks `products`; on miss, calls OFF v2 (see §9), stores the result
   (downloads the image bytes into the data volume), then returns it.
4. User confirms name/brand, sets **use-by date**, quantity, location → `inventory_item`
   (`kind=packaged`).
5. **Fallbacks:** product not found → prefilled manual-entry form; camera denied / no
   camera / can't focus → manual barcode/name entry.

### 6.2 Add fresh produce

1. User searches the `foods` catalogue (server-side search over name/keywords).
2. Picks a food and a storage **location** (defaults to the food's `default_location`).
3. Server computes **best-eaten-around = added_date + midpoint(min,max)** of the matching
   `shelf_lives` row, converted to days. Flags `is_estimate=true`. `not_recommended` /
   "when ripe" entries are surfaced as guidance, not dates.
4. User may **override** the computed date. UI always frames it as an estimate
   ("best eaten around ~Jun 30, based on USDA guidance"), never a strict use-by.

### 6.3 Daily reminder

1. Coolify Scheduled Task (default `0 8 * * *`) calls `POST /internal/cron/check-expiry`
   with a shared-secret header.
2. For each user, aggregate across their households the `active` items whose effective
   date ≤ `today + warn_days` (or already past).
3. Send **one** declarative Web Push per device summarizing the count, deep-linking to
   an "expiring soon" view, and setting the app badge to the count.
4. On send: `204` → update `last_success_at`; `404/410` → delete subscription; other
   failures → increment `failure_count`.

### 6.4 Auth & invites

- Email + password signup; argon2id hashing; `id.secret` session cookie validated in
  `hooks.server.ts`, which populates `event.locals`. Authz enforced in
  `+page.server.ts` / server actions (**not** in `+layout.server.ts`).
- An admin generates an **invitation** (single-use, hashed token, expiring) and shares
  the link (copy / QR). The invitee signs up or logs in and is added to the household
  with the invitation's role. Email sending is optional — the link is the mechanism.

### 6.5 PWA install & permission onboarding

- Web manifest with `display: standalone` and a stable `id`; precache the app shell and
  the scanner WASM in the service worker.
- On iOS, detect "not installed" (not `display-mode: standalone`) and guide the user
  through Add-to-Home-Screen *before* offering notifications.
- Permission **priming**: explain value in-app first; call `Notification.requestPermission()`
  only on a positive tap. On each launch, re-check the subscription and offer to
  reconnect if it was dropped (iOS gives no `pushsubscriptionchange` event).

---

## 7. Feature decisions (confirmed)

- **Roles:** `admin` + `member`. Admins manage members, invites, and household
  settings; members do all inventory actions.
- **OFF images:** download and store bytes locally (in the data volume) with CC-BY-SA
  attribution — works offline, no broken links, license-compliant.
- **Catalogue size:** curated ~150–250 common foods derived from FoodKeeper.
- **Notification window:** per-household `warn_days`, default 3.
- **Notification cadence:** one aggregated daily push per device.

---

## 8. Deployment (Coolify + Railpack)

- **Build pack:** select **Railpack** explicitly (Coolify's default reverted to
  Nixpacks). `package.json` → `"engines": { "node": "22" }`. Build `vite build`
  (adapter-node), start `node build`. Set `RAILPACK_NO_SPA=1` so the SSR build isn't
  misdetected as static.
- **Proxy:** set `PROTOCOL_HEADER=x-forwarded-proto` and `HOST_HEADER=x-forwarded-host`
  (behind Coolify's trusted proxy). `PORT`/`HOST` from Coolify.
- **Persistent storage:** mount a **directory** (Volume, destination `/app/data`) — not
  the single `.db` file. DB at `/app/data/garde-manger.db`; the dir must be writable so
  WAL's `-wal`/`-shm` siblings are created. Locally cached OFF images also live under
  `/app/data`.
- **Single writer:** **disable rolling updates** for this app (recreate strategy,
  ~1–2 s downtime per deploy) so two containers never share the SQLite file. Single
  instance — no PM2/cluster.
- **Cron:** Coolify Scheduled Task running the daily reminder (curl the internal
  endpoint, or run a script in the container). Preferred over in-process `node-cron`.
- **Backup:** a second daily Scheduled Task using SQLite's online `.backup`
  (`sqlite3 …".backup …"`, never a raw copy of the live WAL file), pushed off-box
  (Coolify's own backup does **not** cover app volumes).
- **Secrets (runtime env):** `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
  (`mailto:` — never `localhost`), `SESSION_SECRET`, `CRON_SECRET`, `OFF_USER_AGENT`.

---

## 9. Open Food Facts integration

- **Endpoint:** `GET https://world.openfoodfacts.org/api/v2/product/{barcode}.json`
  with `?fields=product_name,brands,image_front_url,image_front_small_url,quantity,categories_tags`
  (fetch only what we need).
- **Header:** `User-Agent: GardeManger/<version> (<contact-email>)` (required).
- **Rate limit:** 15 product reads/min **per IP** — and our server is a single IP for
  all users. The cache is therefore mandatory: cache-first, only call OFF on a genuine
  cache miss ("1 API call = 1 real scan"). Cache negative (not-found) results with a TTL.
- **Not found:** `status: 0` → manual-entry fallback.
- **Licensing/attribution:** data is ODbL, images CC-BY-SA 3.0. Show an
  attribution surface (about/footer) crediting Open Food Facts, and keep image credit.
  **Keep OFF data out of the FoodKeeper catalogue tables** so ODbL share-alike doesn't
  attach to our shelf-life DB — OFF is used only as a runtime barcode→name lookup.
- **Dev:** use the staging host `https://world.openfoodfacts.net` (basic auth `off`/`off`)
  to avoid hitting production during development.

---

## 10. Shelf-life catalogue (USDA FoodKeeper)

- **Source:** FoodKeeper JSON (CC0, public domain — freely redistributable). Bundled at
  build time and seeded into `foods` + `shelf_lives`; **not** fetched at runtime (FSIS
  blocks bot fetches).
- **Normalization:** map FoodKeeper's per-location min/max/metric quartets to
  `shelf_lives` rows. `DOP_*` fields → `basis=purchase`; plain → `basis=unspecified`;
  `*_After_Opening` → `basis=opened`. Keep `(min, max, unit)` — do not collapse to a
  single integer. Curate down to ~150–250 common household foods.
- **Computation:** "best eaten around" = `added_date + midpoint(min,max)` in days, for
  the chosen location; user-overridable; always presented as an estimate.

---

## 11. Notifications (Web Push) details

- **Format:** Declarative Web Push JSON as primary (`{"web_push":8030,"notification":{…}}`)
  so iOS renders without JS; classic SW `push`→`showNotification` handler as fallback for
  Android/older iOS. **Every** push shows a visible notification.
- **Lifecycle:** store subscriptions per user-device with `failure_count`/`last_success_at`;
  prune on `404/410`; re-check & offer reconnect on each app launch (no iOS
  `pushsubscriptionchange`).
- **Payload:** keep < 3 KB; include deep-link URL and badge count; do not rely on action
  buttons (unreliable on iOS).

---

## 12. Security considerations

- Passwords: argon2id (`@node-rs/argon2`). Sessions: high-entropy `id.secret`, secret
  stored only as a hash; constant-time compare; cookie `HttpOnly; Secure; SameSite=Lax`.
- Authz in hooks / `+page.server.ts` / actions; never in `+layout.server.ts`.
- Every household-scoped query verifies the caller's membership and role.
- Invitations: hashed single-use tokens with expiry.
- Internal cron endpoint guarded by a shared secret; not reachable without it.
- `Permissions-Policy: camera=(self)`; serve `.wasm` with `application/wasm`.

---

## 13. Risks, gotchas & open items

**Top risks (with mitigations):**

1. **iOS push subscription revocation** if a push doesn't render → always show a
   notification; use declarative payload; prune + reconnect-on-launch.
2. **iOS install gate** — no Home-Screen install means no push → explicit onboarding.
3. **SQLite single-writer** under rolling deploys → recreate strategy, single instance,
   mount the directory not the file.
4. **OFF rate-limit ban** (shared IP) → strict cache-first, contact email in User-Agent
   so a ban is reversible.
5. **WASM weight / offline** → self-host WASM, precache in SW, lazy-load on `/scan` only.

**Open items for review:**

- **UI language.** The product name is French; the brief is in English. MVP defaults to
  one UI language (English unless you prefer French). FoodKeeper ships EN/ES/PT — a
  French catalogue would need translation (out of scope for MVP). Your call.
- **Catalogue curation list** — the exact ~150–250 foods can be finalized during
  implementation; happy to propose a list.

---

## 14. Out of scope / future ideas

Shopping list generation, recipe suggestions from expiring items, waste analytics,
email-digest notifications, self-service password reset via email (needs SMTP),
expiry-date OCR, barcode for non-OFF regions, multi-language UI and catalogue,
household-level item history/stats.
