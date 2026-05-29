# M5 — Deploy & harden

**Milestone goal:** Make Garde-Manger production-ready on the homelab (Coolify +
Railpack): security headers + CSP that don't break the passkey/scanner islands,
a verified valibot validation surface, an off-box SQLite backup, a documented
deploy (env, volume, recreate strategy, the two Scheduled Tasks), and a
production-config audit. This is the LAST milestone.

**Branch:** `feat/garde-manger-m5-deploy`
**Spec sources:** §12 (security — headers, Permissions-Policy, `.wasm` type, CSRF),
§13 (Coolify+Railpack, proxy headers, volume, single-writer, cron, backup),
§14 (error handling & testing), §15 (risks). Reuse the pure/testable-seam habit.

---

## Guardrails
- Per-task gate: `bun run lint` AND `bun run check` AND `bun test`; run
  `bun run build` for anything touching config/headers/CSP, and **manually verify
  the built server still serves pages** (CSP can silently break islands).
- **CSRF stays ON.** Adding security headers must not disable the Origin check.
- Don't regress the working islands: the passkey enroll/login islands, the
  `/scan` camera + ZXing **WASM** (needs WebAssembly instantiation), the push
  settings island. A too-strict CSP will break these — test each path.
- Keep frugal: no new runtime deps unless essential.

---

## Task 1 — Security headers + CSP (the careful one)

- **CSP via SvelteKit's `kit.csp`** (svelte.config.js): use `mode: 'auto'`
  (hash/nonce for SvelteKit's own inline scripts) with a `directives` block:
  - `default-src 'self'`
  - `script-src 'self'` (SvelteKit adds hashes/nonces for its bootstrap; the
    barcode-detector chunk + zxing wasm are same-origin modules). If WebAssembly
    instantiation needs it, add `'wasm-unsafe-eval'` to `script-src` (modern
    browsers gate `WebAssembly.instantiate` behind this; test the scanner).
  - `style-src 'self' 'unsafe-inline'` (Svelte injects scoped `<style>`; SvelteKit
    can hash these — prefer hashes, fall back to `'unsafe-inline'` only if needed).
  - `img-src 'self' data:` (OFF thumbnails are same-origin via our image route).
  - `connect-src 'self'` (push subscribe/webauthn are same-origin; OFF is
    server-side; the push service connection is the browser's, not the page's).
  - `manifest-src 'self'`, `worker-src 'self'` (the service worker),
    `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`,
    `object-src 'none'`.
- **Other headers in `hooks.server.ts`** (a `handle` that sets them on `resolve`):
  - `Permissions-Policy: camera=(self), microphone=(), geolocation=()` (scanner
    needs camera=self).
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `X-Frame-Options: DENY` (belt-and-suspenders with frame-ancestors)
  - Do NOT set HSTS here (Traefik/Coolify terminates TLS — document it as a proxy
    concern instead, to avoid locking dev/localhost into HTTPS).
- **`.wasm` content-type:** confirm adapter-node serves the precached
  `zxing_reader.*.wasm` as `application/wasm` (Vite/sirv usually do). If not,
  add a tiny `handle` branch setting the header for `*.wasm`. Verify in the built
  server (`bun ./build/index.js` then `curl -I` the wasm asset).
- **TEST after building:** run the built server with `ORIGIN` set, load `/login`
  (passkey island), `/scan` (camera island + wasm), `/account` (push island),
  and the home page — confirm no CSP violations break them (check that scripts
  execute and the wasm loads). Document the manual check.

## Task 2 — valibot validation audit

- Sweep every `+page.server.ts` action and every `+server.ts` POST: confirm each
  reads input through a valibot schema (or equivalently strict validation) and
  returns a typed `fail()` / `error()`. List endpoints + their schema; fill any
  gap. Known-good already: signup/login, household create/invite, add fresh/
  custom, scan add, push subscribe/unsubscribe. Verify the cron + webauthn JSON
  bodies. No silent `catch` that swallows (spec §14).

## Task 3 — Off-box SQLite backup

- `scripts/backup.ts` (Bun): open the DB read-only and run **`VACUUM INTO
  '<dest>'`** (the correct online backup for a live WAL DB — never a raw file
  copy). Dest path from an arg/env (e.g. `BACKUP_DIR`), timestamped filename
  (timestamp passed in / from the OS, since `Date.now()` is fine in app scripts).
  Optionally prune backups older than N days.
- Add a `db:backup` script to package.json. Document wiring it to a Coolify
  Scheduled Task that copies/pushes the file off-box.
- A small test of the backup function against a temp DB (produces a valid,
  openable SQLite file with the same row counts).

## Task 4 — Deploy documentation `DEPLOY.md`

Consolidate (supersede M0's scattered notes):
- **Railpack:** `packageManager: bun@x.y.z` + committed `bun.lock`; build
  `bunx --bun vite build`; start `bun ./build/index.js`. Dockerfile kept as fallback.
- **Env vars (prod):** `DATABASE_PATH=/app/data/garde-manger.db`, `ORIGIN`
  (stable https domain — required for CSRF + WebAuthn), `RP_ID`, `RP_NAME`,
  `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`, `CRON_SECRET`,
  `OFF_USER_AGENT` (with contact), `NODE_ENV=production`. (Note: `SESSION_SECRET`
  from the spec is NOT used — sessions are per-session `id.secret` hashed in the
  DB; omit it.)
- **Proxy:** `PROTOCOL_HEADER=x-forwarded-proto`, `HOST_HEADER=x-forwarded-host`,
  `PORT`/`HOST` from Coolify (correct CSRF + WebAuthn origin behind Traefik).
- **Volume:** mount a **directory** at `/app/data` (DB + `-wal`/`-shm` + cached
  OFF product images live there).
- **Single writer:** recreate strategy (disable rolling updates), single instance.
- **Healthcheck:** `GET /healthz`.
- **Scheduled Tasks (two):** (1) daily `0 8 * * *` →
  `curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" https://<domain>/internal/cron/check-expiry`;
  (2) daily backup → `bun run db:backup` then push off-box.
- **Stable domain warning** for passkeys (RP ID change invalidates passkeys;
  password still works).
- A first-run note: VAPID keypair generation (`bunx web-push generate-vapid-keys`).

## Task 5 — Production-config audit

- Verify every dev-default is guarded for prod: WebAuthn `assertConfig` (RP_ID/
  ORIGIN), `getOffConfig` (OFF_USER_AGENT), `getVapid` (VAPID_*), cron empty-secret
  → 503. Add any missing prod guard. Confirm no committed real secret (the dev
  VAPID keypair is explicitly throwaway). Confirm `.env.example` lists every var.
- Confirm the seed catalogue's DRAFT food-safety warning is present and the data
  is flagged as needing human review before prod (spec §15 risk 7).

## Task 6 — End-to-end smoke (documented; automated optional)

- The 209-test unit/integration suite is the automated safety net. Per spec §14,
  full Playwright E2E is **optional** — to stay frugal we DON'T add a browser/
  Playwright dependency. Instead: document a concise **manual smoke checklist**
  (`DEPLOY.md` section): signup → create household → add fresh → see urgency →
  consume; scan/manual-barcode → confirm (DLC) → see packaged item; invite-and-
  join; password + passkey sign-in (device); enable notifications + fire the cron
  with the secret (device). Clearly mark camera/push/passkey as device-only.
- (Optional stretch, only if it stays dependency-light: a Bun test that boots
  `bun ./build/index.js` against a temp DB and hits `/healthz` + a signup POST
  with an Origin header. Skip if flaky in CI.)

## Task 7 — Final review + merge

- **Spec-compliance review:** §12 headers/CSP/Permissions-Policy/.wasm/CSRF,
  §13 deploy doc completeness (volume, recreate, proxy headers, two scheduled
  tasks, healthcheck), §14 validation + no silent catches, backup is `VACUUM INTO`.
- **Security review (opus):** CSP actually restrictive (no `unsafe-eval` beyond
  `wasm-unsafe-eval`, no wildcard origins), headers correct, backup can't be
  triggered by an attacker / doesn't expose the DB over HTTP, no secret leakage,
  CSRF still on, cron still secret-gated. Confirm the CSP doesn't *appear* set but
  silently allow everything.
- Apply fixes; re-run `lint + check + test + build` and the manual CSP smoke.
- Merge to `main`, push to origin. Update roadmap memory (M5 ✅ — project
  feature-complete). Post the final milestone + project-completion update.

---

## Acceptance (M5 done when)
1. The built server sends a restrictive CSP + `Permissions-Policy: camera=(self)`
   + nosniff/Referrer-Policy/frame protections, and the passkey, scanner (wasm),
   and push islands STILL work (manually verified); `.wasm` is `application/wasm`.
2. Every form action / JSON endpoint validates input (valibot) with no silent catches.
3. `bun run db:backup` produces a valid off-box-able SQLite snapshot via `VACUUM INTO`.
4. `DEPLOY.md` fully describes a reproducible Coolify+Railpack deploy incl. env,
   volume, recreate strategy, proxy headers, healthcheck, and the two Scheduled
   Tasks; production config guards are verified.
5. `bun run lint && bun run check && bun test && bun run build` all green.
