# M4 — Notifications + PWA

**Milestone goal:** Garde-Manger becomes an installable PWA that works offline
(view-only) and sends **one aggregated daily Web Push per device** listing items
approaching their date. iOS-first realities are handled: install-to-home-screen
gate, permission priming, and **Declarative Web Push** so notifications render
without waking JS (avoiding iOS silent-push revocation).

**Branch:** `feat/garde-manger-m4-pwa`
**Spec sources:** design §6.4 (daily reminder), §6.6 (install & permission
onboarding), §10 (PWA & notifications), §12 (cron secret, validation), §13 (cron
task, secrets). Reuse M1–M3 patterns: `requireMembership` authz, JSON endpoints
exempt from form-CSRF (like the webauthn `/api/...` routes), pure/testable server
seams (no `$env`/`$app` in importable logic modules).

---

## Guardrails (apply to every task)

- **Per-task gate:** `bun run lint` AND `bun run check` AND `bun test` all green
  before a task is done. Run `bun run build` for any task touching the SW/manifest/Vite config.
- **CSRF stays ON.** JSON `+server.ts` endpoints are already exempt from the
  form-Origin check (browsers can't send cross-origin `application/json` without
  CORS) — match the webauthn endpoints. Never add `csrf:{checkOrigin:false}`.
- **No network / no real push in tests.** `web-push` send is injected; tests pass
  a fake. The cron + push lifecycle is unit-tested with a mock sender.
- **Pure/testable seams:** `$lib/server/push.ts` and the expiry-aggregation logic
  must NOT import `$env`/`$app` (so `bun test` imports them). VAPID keys + secrets
  live in a thin server-only config module passed in by the route glue.
- **bun:sqlite is synchronous.** No `await` on `.get()/.run()/.all()`.
- **Single visible notification per push** (iOS revokes silent pushes). Payload
  < 3 KB, deep-link + badge, NO action buttons.
- **i18n parity (FR+EN, FR primary)** for every new user-facing string.
- **Secrets never logged.** Constant-time compare for `CRON_SECRET`.

---

## Task 1 — `push_subscriptions` schema + migration `0004`

Add to `schema.ts`:
```ts
export const pushSubscriptions = sqliteTable('push_subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull().unique(),     // push service URL (per device)
  p256dh: text('p256dh').notNull(),                   // client public key
  auth: text('auth').notNull(),                       // client auth secret
  deviceLabel: text('device_label'),
  lastSuccessAt: integer('last_success_at', { mode: 'timestamp' }),
  failureCount: integer('failure_count').notNull().default(0),
  lastNotifiedOn: text('last_notified_on'),           // 'YYYY-MM-DD' idempotency guard
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});
```
`bun run db:generate` → review `0004_*.sql` (plain CREATE TABLE, MUST NOT rebuild
other tables). Test (`schema-push.test.ts`): insert/select round-trip; endpoint
UNIQUE rejects a duplicate; cascade on user delete.

---

## Task 2 — VAPID config glue `$lib/server/pushConfig.ts` + install `web-push`

- `bun add web-push` (+ `bun add -d @types/web-push` if needed).
- `pushConfig.ts` (server-only, reads `$env/dynamic/private`, `dev` from `$app/environment`):
  - `getVapid(): { publicKey, privateKey, subject }`. In prod, THROW if any is
    missing (mirror webauthn `assertConfig`). In dev, fall back to a committed
    dev keypair (documented as dev-only) so the flow is testable locally.
  - `vapidPublicKey(): string` — the public key is safe to expose to the client.
- Generate a dev VAPID keypair (`bunx web-push generate-vapid-keys`), put the
  PUBLIC one as a dev default and document `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`
  / `VAPID_SUBJECT` (`mailto:`) in `.env.example`. Never commit a real/prod private key.

---

## Task 3 — Push module `$lib/server/push.ts` (pure seam, lifecycle)

No `$env`/`$app`. The `web-push` send is injected.
```ts
export interface PushSender {
  // resolves to the HTTP status (201/204 ok, 404/410 gone, ...) or throws
  send(sub: WebPushTarget, payload: string, opts: { vapid: Vapid; ttl?: number }): Promise<number>;
}
export function buildDailyPayload(opts: { count: number; locale: 'fr'|'en'; origin: string }): string;
export function saveSubscription(db, userId, sub, deviceLabel?): ...;     // upsert by endpoint
export function deleteSubscriptionByEndpoint(db, endpoint): void;
export function listSubscriptionsForUser(db, userId): Subscription[];
export async function sendToSubscription(db, sub, payload, vapid, deps?): Promise<'ok'|'pruned'|'failed'>;
```
- `buildDailyPayload` produces the **Declarative Web Push** JSON:
  `{"web_push":8030,"notification":{"title":…,"body":…,"navigate":"<origin>/?filter=expiring","lang":locale, "badge"/"icon" optional}}`.
  Assert the serialized payload is **< 3 KB** (truncate body if needed). No action buttons.
  This SAME JSON is what the classic SW `push` handler parses (Task 7), so one
  payload serves both declarative-capable (iOS 18.4+) and classic browsers.
- `sendToSubscription`: call the injected sender; **204/201 → ok** (update
  `last_success_at`, reset `failure_count`); **404/410 → pruned** (delete the row);
  **anything else / throw → failed** (increment `failure_count`).
- `saveSubscription`: upsert by `endpoint` (a device re-subscribing updates keys),
  scoped to `userId`.
- **Test** `push.test.ts` (createDb + temp db, fake `PushSender`): payload shape +
  `< 3KB` guard; 204 updates success + resets failures; 410 prunes the row; 500
  increments `failure_count`; `saveSubscription` upserts by endpoint; list is
  user-scoped.

---

## Task 4 — Expiry aggregation `$lib/server/reminders.ts` (pure)

`usersToNotify(db, now): Array<{ userId; count }>`:
- For each user, aggregate ACROSS their households the `active` inventory items
  whose `effective_date ≤ (start-of-today + household.warn_days days)` (include
  past-due). Respect each household's own `warn_days`. Skip users with 0.
- Return one entry per user with the total count. (Per-device fan-out happens in
  the cron.) Uses the `inv_household_status_eff` index.
- **Test** `reminders.test.ts`: a user in two households with different
  `warn_days`; items just inside/outside each window; consumed/discarded excluded;
  past-due included; user with nothing → absent.

---

## Task 5 — Cron endpoint `/internal/cron/check-expiry/+server.ts`

- `POST`. Read `CRON_SECRET` from env; compare the request's
  `x-cron-secret` (or `Authorization: Bearer`) header with **`crypto.timingSafeEqual`**
  (length-guarded). Missing/!== → `401`. (No session/user — this is machine-to-machine.)
- For each user from `usersToNotify`, for each of their `push_subscriptions`:
  - **Idempotency:** skip if `last_notified_on === today` (safe to call twice/day).
  - `buildDailyPayload({count, locale: <user's locale>, origin})` → `sendToSubscription`.
  - On ok → set `last_notified_on = today` (+ last_success_at); on pruned → row
    already deleted; on failed → leave for retry (failure_count incremented).
- Return a JSON summary `{ usersNotified, devicesSent, pruned, failed }` (no PII).
- **Test** `check-expiry.test.ts`-style (or fold into push/reminders tests):
  wrong/missing secret → 401; correct secret → notifies, sets `last_notified_on`;
  a second immediate call → 0 re-sends (idempotent). Mock the sender; never hit network.
- Note: this route lives OUTSIDE `(app)` (no auth layout) — it's `/internal/...`.

---

## Task 6 — Subscribe / unsubscribe JSON endpoints

- `POST /api/push/subscribe` — `locals.user` required (401 else). Body (valibot):
  `{ endpoint, keys: { p256dh, auth }, deviceLabel? }` → `saveSubscription`. Return `{ ok:true }`.
- `POST /api/push/unsubscribe` — `locals.user` required. Body `{ endpoint }`.
  Delete ONLY if the row belongs to `locals.user` (ownership scope — don't let a
  user delete another user's subscription). Return `{ ok:true }`.
- These are JSON (exempt from form-CSRF, like webauthn). valibot-validate bodies.

---

## Task 7 — Service worker + `@vite-pwa/sveltekit` (injectManifest)

- `bun add -d @vite-pwa/sveltekit`. Configure the Vite plugin: `strategies:
  'injectManifest'`, `srcDir: 'src'`, `filename: 'service-worker.ts'`,
  `registerType` + manifest (Task 8). **Disable** SvelteKit's built-in SW
  registration (we own a single SW). Ensure `bunx --bun vite build` still works.
- `src/service-worker.ts` (TypeScript, SW global types):
  - **Precache** the injected manifest (app shell) **and** the scanner WASM asset.
  - **Offline view-only:** navigation requests → network-first with a cached-shell
    fallback; inventory/data GETs → **stale-while-revalidate**; never cache POSTs.
  - `push` handler: `event.waitUntil(parse(event.data) → showNotification(title,{body,data:{navigate},badge,icon}))`. ALWAYS shows a visible notification.
  - `notificationclick`: focus an existing client or `openWindow(navigate)`.
  - Take care to `skipWaiting`/`clients.claim` sensibly (single-owner SW).
- Verify the build emits the SW + precache manifest and the WASM is precached.

---

## Task 8 — Web manifest + maskable icons

- `manifest.webmanifest`: `display: 'standalone'`, stable `id`, `name`
  ("Garde-Manger"), `short_name`, `start_url: '/'`, `theme_color`/`background_color`,
  `lang` (fr), `icons` incl. **maskable** 192 + 512 + any-purpose.
- Generate icons (a simple 🧺/pantry mark is fine) at 192×192, 512×512, and a
  maskable variant with safe padding; place in `static/`. Reference from the
  manifest and add `<link rel="manifest">` + theme-color meta + apple-touch-icon
  in `src/app.html`.
- iOS apple-specific: `apple-touch-icon`, `apple-mobile-web-app-capable` /
  `mobile-web-app-capable`, status-bar style.

---

## Task 9 — Notification settings island + offline banner + iOS onboarding

- **Account page** (`(app)/account`): add a "Notifications" section as an island
  (the page already has a passkey island; add a `PushSettings.svelte`):
  - Feature/permission detection: `'serviceWorker' in navigator`,
    `'PushManager' in window`, `Notification.permission`.
  - **iOS install gate:** if iOS Safari AND not `navigator.standalone`/display-mode
    standalone → show **Add-to-Home-Screen** guidance and DO NOT offer subscribe
    (iOS delivers push only to an installed PWA). Otherwise show the subscribe CTA.
  - **Permission priming:** explain the value first; call
    `Notification.requestPermission()` only on a positive tap; then
    `registration.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey:
    <VAPID public key> })` → POST `/api/push/subscribe`. Unsubscribe button → POST
    `/api/push/unsubscribe` + `subscription.unsubscribe()`.
  - **Reconnect on launch:** on mount, if permission granted but no active
    subscription, offer to reconnect (no iOS `pushsubscriptionchange`). 
  - The VAPID public key reaches the client via the account `load` (`vapidPublicKey()`).
- **Offline banner:** a small component (in the `(app)` layout) that shows a calm
  "hors-ligne — lecture seule" banner on `offline`/`online` events; writes are
  view-only (the banner communicates this — no write queue).
- i18n keys for: notifications section title/explainer, enable/disable, iOS
  install steps, permission-denied note, offline banner.

---

## Task 10 — Final review + merge

- **Spec-compliance review** (fresh subagent): §6.4 (per-user cross-household
  aggregation, one push/device, `last_notified_on` idempotency, 404/410 prune),
  §6.6 (iOS install gate before permission, prime-then-request, reconnect), §10
  (manifest standalone+maskable, injectManifest SW precaches shell+WASM, SWR
  offline view-only, declarative payload + classic fallback, <3KB visible push).
- **Security review (opus):** `CRON_SECRET` constant-time + length-guarded, no
  auth bypass on `/internal/...`; subscribe/unsubscribe ownership scoping (can't
  delete/forge another user's sub); no secrets/endpoints logged or leaked in
  responses; SW scope/caching can't serve another household's data or cache
  authenticated POST responses; payload has no PII beyond a count; CSRF still ON;
  VAPID private key never sent to the client.
- Apply fixes; re-run `lint + check + test + build`.
- Merge to `main` locally, push to origin. Update roadmap memory (M4 ✅, M5 next).
- **Manual-test note (device-only, like passkeys/camera):** real push delivery +
  iOS install + offline behaviour need a physical device over HTTPS; document the
  smoke steps. All server logic (cron auth, aggregation, lifecycle, payload) is
  unit-tested with a mocked sender.

---

## Acceptance (M4 done when)

1. The app is installable (valid manifest + maskable icons + registered SW) and,
   once installed, loads offline showing the cached inventory (view-only) with a
   calm offline banner; writes are clearly not available offline.
2. A user can enable notifications (with iOS install-gate + permission priming);
   the subscription is stored per device and pruned on 404/410.
3. `POST /internal/cron/check-expiry` with the correct `CRON_SECRET` sends one
   aggregated, <3 KB, visible push per device to each user with expiring items,
   deep-linking to "expiring soon"; a wrong/absent secret is 401; a second call
   the same day is a no-op (idempotent).
4. The pushed payload is Declarative Web Push (renders on iOS 18.4+ without JS)
   and the classic SW `push` handler renders the same payload as a fallback.
5. `bun run lint && bun run check && bun test && bun run build` all green; server
   logic covered by tests with a mocked push sender and zero network access.
