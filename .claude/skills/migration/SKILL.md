---
name: migration
description: Create and apply a Drizzle schema migration for garde-manger (SQLite). Use when adding/changing a table or column. Invoked as /migration.
disable-model-invocation: true
---

# Drizzle migration workflow

This project uses **Drizzle + drizzle-kit** against **SQLite** (`dialect: 'sqlite'`, db at `DATABASE_PATH ?? ./data/garde-manger.db`). Schema lives in `src/lib/server/db/schema.ts`; generated SQL lands in `drizzle/`.

Run these steps in order — do not skip the review step.

## 1. Edit the schema
Make the change in `src/lib/server/db/schema.ts`. Match the existing table/column style (snake_case columns, explicit `references()` for FKs, `notNull()` where appropriate).

## 2. Generate the migration
```bash
bun run db:generate
```
This writes a new numbered `.sql` file in `drizzle/` and updates `drizzle/meta`.

## 3. Review the generated SQL — REQUIRED
Read the new `drizzle/NNNN_*.sql`. SQLite has sharp edges:
- **No `ALTER COLUMN`.** Type/constraint changes become table-rebuild (`__new_*` create → copy → drop → rename). Confirm the data-copy step preserves every row.
- A new `NOT NULL` column **without a default** fails if the table has rows. Add a default or backfill.
- Renames generated as drop+add **lose data** — if you intended a rename, fix the SQL by hand.
- Check FK actions (`on delete`) match intent.

If the SQL is wrong, fix the schema and regenerate (delete the bad `drizzle/NNNN_*.sql` and its meta entry first) rather than hand-patching when possible.

## 4. Apply
```bash
bun run db:migrate     # apply to the database
```
Note: the app also runs `runMigrations()` on boot (`src/lib/server/db/index.ts`), so committing the `drizzle/` files is what actually ships the change.

## 5. Verify
- `bun run db:studio` to eyeball the result, or add/adjust a schema test under `src/lib/server/db/*.test.ts` (these use a temp DB).
- `bun test src/lib/server/db` to confirm migrations still apply cleanly.

## Commit
Commit `schema.ts`, the new `drizzle/NNNN_*.sql`, and the `drizzle/meta/` changes together.
