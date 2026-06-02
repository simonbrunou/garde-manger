# End-to-End Testing Harness & Blind Bug Hunt — Design

**Date:** 2026-06-02
**Status:** Approved (design); pending spec review
**Author:** Simon Brunou (with Claude)

## 1. Goal

Stand up a browser-level end-to-end (e2e) test harness for garde-manger and write an
**exhaustive** suite covering every user-facing action. The suite asserts the app's
**intended** behavior (derived from spec/i18n/intent, never from the current
implementation). A second, implicit goal: a bug the user has spotted on "a certain
action" should be surfaced by a failing test **without** being told which action it is
("blind hunt").

Success criteria:

1. `bun run test:e2e` builds the app, boots an isolated instance, and runs the suite to
   completion on a clean machine (after `playwright install chromium`).
2. The suite covers all in-scope actions in the coverage matrix (§7), each asserting
   intended behavior.
3. Running the full sweep with retries disabled produces at least one **genuine**
   failing assertion that pinpoints a real behavioral bug in one action, corroborated by
   `systematic-debugging` (i.e. not a flake or a test bug).
4. App source is unchanged; the failing test is the evidence of the bug. A fix is
   proposed only on request.

## 2. Scope

**In scope (user's choice: "all user-facing UI", full sweep):**
Every SvelteKit form action plus client-side interactions a user can perform:
auth (signup/login/logout/passkey), add (fresh/custom), scan (manual entry + confirm
packaged), inventory list (filter/bands/sort/consume/discard), item detail
(update/consume/discard/remove), households (create/switch/settings/role/remove/revoke/
delete), invitations (create/accept), account (profile/theme/passkey/push), bilan
(stats), and cross-cutting concerns (household scoping, locale switch).

**Out of scope (YAGNI):**
- Internal cron endpoint `/internal/cron/check-expiry` (not user-facing; already unit-tested).
- Real Web Push delivery (headless Chromium has no push service) and real Open Food
  Facts network calls (non-deterministic). Both are isolated: product lookups hit a
  pre-seeded cache; push subscribe/unsubscribe is exercised at the HTTP request layer.
- Multi-browser matrix (Chromium only for v1; the passkey virtual authenticator requires
  Chromium anyway).
- Visual-regression / screenshot diffing.
- No new `data-test-id` attributes in app source (selectors use ARIA roles and i18n text).

## 3. Methodology — blind hunt

- Assertions encode **intended** behavior taken from: the design specs in
  `docs/superpowers/specs/`, `README.md`, the i18n catalogues
  (`src/lib/i18n/messages/{en,fr}.ts`), and domain intent. They are **not** derived by
  reading the implementation of the action under test, which would encode the bug into
  the test.
- `AUDIT.md` is **not** consulted to target the hunt. (The exploration phase skimmed it;
  we consciously do not aim tests at its findings. Coverage is exhaustive, so the bug is
  caught by breadth, not by tip-off.)
- Reading route/component code to learn *how to drive* the UI (field names, action
  names, button labels) is allowed; deriving *expected outcomes* from it is not.
- The full sweep runs with **retries: 0** so a failure is a real signal. Each failing
  assertion is triaged with the `systematic-debugging` skill to distinguish a real app
  bug from a test/flake bug before it is reported.

## 4. Server approach (decision: ① built adapter-node)

Run a **production build** under Playwright's `webServer`: `vite build` once, then
`bun ./build/index.js` on a pinned port. Rationale: the real adapter-node build exercises
the adapter Origin CSRF check, real link prefetch, Secure cookies, and CSP — the
production behaviors where subtle action bugs live. `vite dev` (option ②) was rejected
because dev mode changes/disables those behaviors and could mask the bug. Pure black-box
with zero DB access (option ③) was rejected because it cannot seed past/boundary dates or
cross-household fixtures, nor corroborate persisted state.

Verified mechanics that make this work:
- `src/lib/server/db/index.ts` runs migrations and auto-seeds the foods catalogue on
  boot, so a fresh `DATABASE_PATH` self-provisions.
- `src/lib/server/auth/cookies.ts` sets `secure: !dev`; a built server has `dev=false`,
  but Chromium treats `http://localhost` as a secure context, so Secure cookies are
  honored.
- `src/lib/server/auth/webauthn.ts` reads `RP_ID`/`ORIGIN` from env; tests pin them to
  the test base URL.

## 5. Harness architecture

- **Dependency:** add `@playwright/test` (devDependency). `playwright` is already present.
- **`playwright.config.ts`:**
  - `testDir: 'tests/e2e'`, Chromium only, `baseURL: 'http://localhost:4173'`.
  - `webServer`: command builds (if needed) and runs `bun ./build/index.js`; `port: 4173`;
    `reuseExistingServer: !process.env.CI`; passes the test env (§6).
  - `retries: 0`, `fullyParallel: false` for stateful specs (parallel where independent).
  - `projects`:
    - `setup` — runs `auth.setup.ts`, produces `storageState`.
    - `app` — authenticated; `dependencies: ['setup']`, `storageState: tests/e2e/.auth/user.json`.
    - `anon` — no storageState (login/signup/join-while-logged-out flows).
    - `passkey` — no storageState; uses a CDP virtual authenticator in its own context.
- **`package.json` scripts:** `test:e2e` (`playwright test`), `test:e2e:ui`
  (`playwright test --ui`). `bun test` (unit) is unchanged.
- **`.gitignore` additions:** `.e2e/`, `test-results/`, `playwright-report/`,
  `tests/e2e/.auth/`.

## 6. Test environment

Set by the `webServer` `env` option (throwaway, isolated). Note: the built adapter-node
server reads `process.env` at runtime via `$env/dynamic/private` — it does **not** load
`.env` files — so every var below is passed through the Playwright `webServer.env` map,
not a dotenv file.

- `PORT=4173` — adapter-node listen port; must match `baseURL` and `ORIGIN`.
- `DATABASE_PATH=.e2e/run.db` (gitignored; removed and recreated per run).
- `ORIGIN=http://localhost:4173`, `RP_ID=localhost`, `RP_NAME=Garde-Manger`.
- `OFF_USER_AGENT="GardeManger-e2e (test@example.com)"` (no real OFF calls are made).
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` — a single fixed, valid
  test VAPID keypair stored as a constant in the e2e config (test-only, not a real
  secret; avoids runtime generation before `webServer` boot).
- `CRON_SECRET=test-cron-secret`.
- `NODE_ENV` left at the built default (production); the suite does not depend on prod
  guards beyond what is listed.

## 7. Coverage matrix (action → intended-behavior assertions)

| Area | Actions | Intended-behavior assertions |
|---|---|---|
| Auth | signup, login (pwd), logout, passkey enroll+login, route guards | invalid creds → generic error (no user enumeration); `(app)` route while logged-out → redirect to `/login?redirectTo=<path>`; logout clears `gm_session` and returns to `/login`; passkey enroll then passkey-login succeeds |
| Add | addFresh, addCustom | added item appears in inventory at chosen location; **quantity must be ≥1** (i18n regex `^[1-9]\d*$`); computed best-by ≈ shelf-life midpoint and is editable; custom item with no dates is allowed |
| Scan | manual barcode entry, confirm/add packaged | invalid barcode → error and stays on scan; **use-by (DLC) is required** to add; product fields prefill from the pre-seeded cache; added packaged item shows in list |
| Inventory list | location filter, urgency bands, sort order, consume, discard | bands urgent/soon/ok computed vs household `warnDays`; **items sorted soonest-first, undated last**; day-badge day count correct; consume/discard removes item from active list and preserves the active location filter |
| Item detail | update (location/qty/date-kind/notes), consume, discard, remove | switching DLC↔DDM clears the other date; invalid location rejected; quantity floored at 1; remove requires the two-step confirm; consume/discard are terminal |
| Households | create, switch, settings (name, warnDays 0–30), setRole, removeMember, revoke invite, delete | new household becomes active and owner is admin; **last admin cannot be demoted/removed**; members do not see admin controls; warnDays out of 0–30 rejected; delete cascades (items/members/invites gone) and resets active household; switch changes context |
| Invitations | create link, accept via `/join/[token]` | single-use; 7-day expiry; role inherited on join; **visiting the join link shows a confirm screen and does NOT consume the token until the user submits the accept action** (intent from i18n `join_confirm_button` + design spec); used/expired/invalid tokens show the right error |
| Account | updateProfile, setTheme, removePasskey, push subscribe/unsubscribe | display name + locale persist; theme persists across navigation; passkey removable from list; push subscribe/unsubscribe succeed at the request layer (UI button may be unavailable headless — asserted accordingly) |
| Bilan | monthly eaten/wasted, waste streak | eaten/wasted counts reflect items consumed/discarded in the current month; waste streak = whole days since the last discard (null/0 when none) |
| Cross-cutting | household scoping, locale switch | a member of household A cannot view or act on an item in household B; switching locale (fr/en) swaps UI strings |

## 8. Data & seeding

- `tests/e2e/fixtures/db.ts` opens the **same** SQLite file via the app's own
  `createDb` + drizzle schema (reused, not reimplemented). Helpers: `seedUser`
  (password via `Bun.password.hash`), `seedHousehold`, `seedMembership`,
  `seedItem({ useByDate, bestByDate, location, status, ... })`, and read helpers
  (`getItems`, `getMemberships`).
- For domain-shaped fixtures (households, memberships, normal item adds) prefer the app's
  own server functions (`households.createHousehold`, `inventory.addFresh/addCustom`).
  For **precise dates** (past / exact band boundaries) insert rows directly.
- Date-sensitive fixtures are computed **relative to real `now` in UTC**, because the
  server uses `new Date()` with UTC start-of-day and exposes no injectable clock. Expected
  band/badge values are computed in the tests with the same UTC math the spec intends.
  Timezone handling is itself something the suite asserts (a plausible divergence area).
- Concurrent access: the app process and the test process both open the WAL SQLite file;
  `busy_timeout` is set, and seed operations are additive/idempotent, so order between
  `webServer` boot and fixture seeding does not matter.
- The product cache (`products` table) is pre-seeded for the barcode(s) used in scan
  tests so no real OFF network call occurs.

## 9. Authentication in tests

- **Password (bulk):** `auth.setup.ts` signs up the primary user through the real form
  and saves `storageState` to `tests/e2e/.auth/user.json`; the `app` project reuses it.
  Multi-user/scoping tests seed additional users via the DB helper.
- **Passkey (one spec):** `passkey.spec.ts` attaches a CDP virtual authenticator
  (`addVirtualAuthenticator`, resident key + user-verified) to a fresh context, enrolls a
  passkey on `/account`, signs out, and logs in via passkey on `/login`.

## 10. Isolation, determinism, error handling

- Fresh `.e2e/run.db` per run (deleted at start of global setup); WAL files cleaned up.
- No real network: OFF via pre-seeded cache; push via request layer with a valid-format
  test VAPID key.
- `retries: 0` for the hunt; stateful specs run serially or with isolated fixtures to
  avoid cross-test interference.
- Chromium only.

## 11. Reporting the found bug

When the sweep is green except for the genuine failure(s): report the offending **action**,
the **intended vs actual** behavior, and the **minimal failing test** as evidence. Do not
modify app source. Offer a proposed fix only if the user asks.

## 12. Deliverables

- `playwright.config.ts`, `tests/e2e/**` (specs + `fixtures/db.ts` + `auth.setup.ts` +
  `passkey.spec.ts`), `@playwright/test` devDependency, `test:e2e*` scripts, `.gitignore`
  updates.
- A short run report identifying the bug surfaced by the suite.
