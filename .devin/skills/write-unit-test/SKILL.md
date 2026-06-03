---
name: write-unit-test
description: Write a bun:test test for a module in garde-manger, matching the project's existing test style. Use when adding or updating unit tests for a source module.
allowed-tools:
  - read
  - grep
  - glob
  - edit
  - write
  - exec
---

# Generate a test (bun:test)

Tests in this project use **`bun:test`** (not Vitest/Jest) and live next to the code they test as `*.test.ts`. Run with `bun test ./src`.

## Conventions (match these)

- Import from `bun:test`: `import { describe, it, expect } from 'bun:test';` (use `test` instead of `it` only if the target's siblings already do — e.g. `src/lib/server/db/client.test.ts` uses `test`).
- Co-locate: `foo.ts` → `foo.test.ts` in the same directory.
- Tabs for indentation (Prettier config). One `describe` per exported unit; concise `it('does X', ...)` cases.
- Cover the happy path plus null/undefined/empty and boundary inputs — see `src/lib/dates.test.ts` for the pure-logic house style.

## Database-touching modules

If the module uses Drizzle/SQLite, **do not** hit the shared `./data/garde-manger.db`. Build an isolated DB exactly like `src/lib/server/db/client.test.ts`:

```ts
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDb, runMigrations } from '$lib/server/db/client';

let dir: string;
afterEach(() => dir && rmSync(dir, { recursive: true, force: true }));
// in each test:
dir = mkdtempSync(join(tmpdir(), 'gm-test-'));
const { db } = createDb(join(dir, 'test.db'));
runMigrations(db);
```

For pure logic, `createDb(':memory:')` is fine (WAL is skipped for in-memory).

## Steps

1. Read the target module; list its exported functions and their edge cases.
2. Write `<module>.test.ts` following the conventions above.
3. Run `bun test <path>` and iterate until green. Report the result.
