# Garde-Manger

Self-hosted, mobile-first PWA to track fridge/cupboard inventory and cut food waste. See [`docs/superpowers/specs/2026-05-28-garde-manger-design.md`](docs/superpowers/specs/2026-05-28-garde-manger-design.md) for the design spec.

## Develop

```sh
bun install
bun run dev
```

## Build & run

```sh
bun run build        # Vite runs under Bun via bunx --bun so bun:sqlite resolves
bun ./build/index.js # serves on port 3000; set DATABASE_PATH as needed
```

## Test / quality

```sh
bun test
bun run lint
bun run check
```

## Inventory & catalogue (M2)

The food catalogue ships with the app and is seeded automatically. On every boot the server checks whether the `foods` table is empty; if so, it runs `seedFoods()` before serving any request. You can also seed (or re-seed) manually:

```sh
bun run db:seed
```

The home page (`/`) displays inventory items grouped into urgency bands — **Eat now / Consommer vite**, **Bientôt / Eat soon**, **Encore bon / Still good** — and is fully bilingual (fr/en). The active language follows the user's profile locale, the `gm_locale` cookie, then the browser's `Accept-Language` header, in that order.

> **Data quality notice:** shelf-life figures in the catalogue are draft estimates and **have not been reviewed by a food-safety professional**. Do not rely on them for health-critical decisions; treat them as rough guidance only until a qualified review is completed.

## Database

Drizzle ORM + `bun:sqlite`. Run `bun run db:generate` after schema changes. Migrations live under `drizzle/` (committed) and are applied automatically at boot.

## Auth / env

| Variable        | Purpose                                                                   | Example                                                            |
| --------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `DATABASE_PATH` | SQLite file path                                                          | `./data/garde-manger.db`                                           |
| `RP_ID`         | WebAuthn Relying Party ID — must match the domain serving the app         | `localhost` (dev), `manger.example.com` (prod)                     |
| `RP_NAME`       | Human-readable app name shown in passkey dialogs                          | `Garde-Manger`                                                     |
| `ORIGIN`        | Full origin the built server accepts requests from (SvelteKit CSRF check) | `http://localhost:5173` (dev), `https://manger.example.com` (prod) |

**Production passkey notes:**

- `RP_ID` must be a stable HTTPS domain. Changing it invalidates all existing passkeys — affected users can still log in with their password and re-enroll.
- Behind Coolify/Traefik, `PROTOCOL_HEADER` and `HOST_HEADER` handle the origin automatically; set `ORIGIN` as a fallback or for direct-access deployments.

## Deploy (Coolify + Railpack)

See **[DEPLOY.md](./DEPLOY.md)** for the full guide: env vars, persistent volume,
recreate strategy, reverse-proxy headers, the two daily Scheduled Tasks (reminder
push + backup), security headers, and a post-deploy smoke checklist.

In short: Railpack build pack (Bun), start `bun ./build/index.js`, mount a
directory volume at `/app/data`, recreate strategy (single SQLite writer),
healthcheck `GET /healthz`. The included `Dockerfile` is the fallback build path.
