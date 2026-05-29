# Deploying Garde-Manger (Coolify + Railpack)

Self-hosted on a homelab via **Coolify** with the **Railpack** build pack. One
container, one embedded SQLite file on a persistent volume (WAL), daily Coolify
Scheduled Tasks for the reminder cron and the backup.

> **Stable domain required.** Passkeys are bound to the `RP_ID` (your domain).
> Changing the domain later invalidates existing passkeys (passwords still work).
> Pick the final hostname before onboarding users.

---

## 1. Build & run

- **Build pack:** Railpack. The Node provider runs Bun because `package.json`
  pins `"packageManager": "bun@<version>"` and `bun.lock` is committed.
- **Build:** `bunx --bun vite build` (the `--bun` flag is required so `bun:sqlite`
  resolves in the SSR graph). This is the repo's `build` script.
- **Start:** `bun ./build/index.js` (adapter-node).
- **Fallback:** a minimal multi-stage `Dockerfile` is kept in the repo if you
  prefer Docker over Railpack.

## 2. Environment variables (production)

| Var                                      | Example / note                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------ |
| `NODE_ENV`                               | `production`                                                             |
| `DATABASE_PATH`                          | `/app/data/garde-manger.db` (on the mounted volume)                      |
| `ORIGIN`                                 | `https://garde-manger.example` — **required** for CSRF + WebAuthn origin |
| `RP_ID`                                  | `garde-manger.example` (your domain, no scheme)                          |
| `RP_NAME`                                | `Garde-Manger`                                                           |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | from `bunx web-push generate-vapid-keys`                                 |
| `VAPID_SUBJECT`                          | `mailto:you@example.com`                                                 |
| `CRON_SECRET`                            | a long random string (the daily-reminder task sends it)                  |
| `OFF_USER_AGENT`                         | `GardeManger/<version> (you@example.com)` — OFF requires a contact       |
| `PRODUCT_IMAGE_DIR`                      | optional; defaults to `<dir of DATABASE_PATH>/product-images`            |
| `OFF_HOST`                               | optional override; prod defaults to `https://world.openfoodfacts.org`    |

Generate VAPID keys once and store them in Coolify's secrets:

```sh
bunx web-push generate-vapid-keys
```

> **Not used:** the design mentioned `SESSION_SECRET`, but sessions use a
> per-session `id.secret` whose secret is stored only as a SHA-256 hash in the
> DB — there is no app-wide session secret to configure.

## 3. Reverse proxy (Traefik / Coolify)

adapter-node derives the request origin from proxy headers — set:

- `PROTOCOL_HEADER=x-forwarded-proto`
- `HOST_HEADER=x-forwarded-host`
- `PORT` / `HOST` are provided by Coolify.

These make the CSRF Origin check and the WebAuthn origin correct behind TLS
termination. HSTS should be added at the proxy (the app intentionally does not
send HSTS, so localhost/dev over http keep working).

## 4. Persistent storage (single writer)

- Mount a **directory** volume at `/app/data` (NOT the bare `.db` file) so the
  WAL siblings (`-wal`, `-shm`), cached OFF product images, and backups live
  together and survive redeploys.
- **Disable rolling updates — use the recreate strategy** (≈1–2 s downtime per
  deploy). SQLite has a single writer; never run two containers against the file.
- Migrations run automatically at boot; the food catalogue seeds on first boot
  (idempotent).

> ⚠️ The seeded shelf-life catalogue is **DRAFT data** (`src/lib/server/seed/foods.data.ts`) and **must be reviewed by a human for food safety** before you rely on it in production — be conservative for risky foods.

## 5. Healthcheck

- `GET /healthz` → `200` (cheap DB ping) / `503` on failure. Point Coolify's
  health check at it.

## 6. Scheduled Tasks (two)

Create two Coolify Scheduled Tasks:

1. **Daily reminder push** — `0 8 * * *`:

   ```sh
   curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" \
     https://garde-manger.example/internal/cron/check-expiry
   ```

   Sends one aggregated Web Push per device to each user with expiring items.
   Idempotent (safe to run twice/day). A wrong/absent secret returns 401; an
   unconfigured `CRON_SECRET` returns 503.

2. **Daily backup** — e.g. `30 3 * * *`:
   ```sh
   DATABASE_PATH=/app/data/garde-manger.db BACKUP_DIR=/app/data/backups bun run db:backup
   ```
   Uses `VACUUM INTO` (a consistent online snapshot — never a raw WAL copy).
   Then push the produced file off-box (rsync/restic/object storage of your
   choice). Prune old snapshots as desired.

## 7. Manual smoke checklist (post-deploy)

The automated suite (`bun test`, 200+ tests) covers unit + integration. A few
flows can only be checked on a real device over HTTPS — run these once after a
deploy:

- [ ] `GET /healthz` returns 200.
- [ ] **Sign up** → land on the home screen; **create a household**.
- [ ] **Add fresh** produce from the catalogue → see the amber DDM estimate and
      it appears banded by urgency on the home screen; **consume** it.
- [ ] **Scan** a real product barcode (rear camera) → confirm page prefilled from
      Open Food Facts → set the **red DLC** → it appears with its photo thumbnail.
      Also test the **manual barcode** field (works without the camera).
- [ ] **Invite & join:** mint an invite as admin, open the link in another
      session, join with the baked-in role.
- [ ] **Sign in** with password, then enroll and sign in with a **passkey**.
- [ ] **Install** the PWA (Add to Home Screen on iOS), then **enable
      notifications**; trigger the cron task and confirm a single visible push
      arrives and deep-links to the expiring items.
- [ ] Go **offline** in the installed app → the inventory still renders (view
      only) with the offline banner.
- [ ] Confirm response headers include the CSP and the camera Permissions-Policy, and the scanner WASM is served as `application/wasm`.

## 8. First-run notes

- The app creates `DATABASE_PATH`'s parent directory, asserts WAL, and runs
  migrations on boot. No manual DB step is needed.
- To re-seed or inspect data locally: `bun run db:seed`, `bun run db:studio`.
