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

## Database

Drizzle ORM + `bun:sqlite`. Run `bun run db:generate` after schema changes. Migrations live under `drizzle/` (committed) and are applied automatically at boot.

## Auth / env

| Variable | Purpose | Example |
|---|---|---|
| `DATABASE_PATH` | SQLite file path | `./data/garde-manger.db` |
| `RP_ID` | WebAuthn Relying Party ID — must match the domain serving the app | `localhost` (dev), `manger.example.com` (prod) |
| `RP_NAME` | Human-readable app name shown in passkey dialogs | `Garde-Manger` |
| `ORIGIN` | Full origin the built server accepts requests from (SvelteKit CSRF check) | `http://localhost:5173` (dev), `https://manger.example.com` (prod) |

**Production passkey notes:**
- `RP_ID` must be a stable HTTPS domain. Changing it invalidates all existing passkeys — affected users can still log in with their password and re-enroll.
- Behind Coolify/Traefik, `PROTOCOL_HEADER` and `HOST_HEADER` handle the origin automatically; set `ORIGIN` as a fallback or for direct-access deployments.

## Deploy (Coolify + Railpack)

- **Build pack:** select **Railpack** — it builds and runs with Bun, driven by `"packageManager": "bun@…"` in `package.json`.
- **Env var:** `DATABASE_PATH=/app/data/garde-manger.db`
- **Volume:** mount a **directory** volume at `/app/data`
- **Deploy strategy:** **recreate** (no rolling updates — single SQLite writer)
- **Healthcheck:** `GET /healthz`
- **Start command:** `bun ./build/index.js`

The included `Dockerfile` is the fallback build path if Railpack is unavailable.
