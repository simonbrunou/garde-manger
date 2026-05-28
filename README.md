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

## Deploy (Coolify + Railpack)

- **Build pack:** select **Railpack** — it builds and runs with Bun, driven by `"packageManager": "bun@…"` in `package.json`.
- **Env var:** `DATABASE_PATH=/app/data/garde-manger.db`
- **Volume:** mount a **directory** volume at `/app/data`
- **Deploy strategy:** **recreate** (no rolling updates — single SQLite writer)
- **Healthcheck:** `GET /healthz`
- **Start command:** `bun ./build/index.js`

The included `Dockerfile` is the fallback build path if Railpack is unavailable.
