# E2E Testing Suite & Blind Bug Hunt — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Playwright e2e harness for garde-manger and an exhaustive suite that drives every user-facing action against a production build, asserting *intended* behavior so an undisclosed bug surfaces as a failing test.

**Architecture:** Playwright `webServer` does a one-time `vite build` then runs the adapter-node server (`bun ./build/index.js`) on a pinned port against a throwaway SQLite DB. Specs assert what a user observes; a thin DB fixture seeds precise dated/multi-household fixtures the UI can't express and corroborates persisted state. Password auth via saved `storageState` for the bulk; one CDP virtual-authenticator spec for passkeys. Assertions encode intent from the design specs + i18n — never from the implementation of the action under test (blind hunt). Full sweep runs with `retries: 0`; any genuine failure is the bug.

**Tech Stack:** SvelteKit (adapter-node) · Bun · Drizzle ORM + `bun:sqlite` · `@playwright/test` (Chromium) · `@simplewebauthn` (passkey) · valibot.

**Reference spec:** `docs/superpowers/specs/2026-06-02-e2e-testing-design.md`

---

## Conventions (read once, apply everywhere)

- **Selectors:** prefer ARIA roles + accessible names using the EN i18n strings (the suite forces `locale=en` for the primary user via the account profile or signup locale). Example: `page.getByRole('button', { name: 'Add to pantry' })`, `page.getByLabel('Quantity')`. Confirm the exact control by reading the route component as **Step 1** of each spec task (mechanics only; do not derive expectations from it).
- **Intended-behavior oracle:** each spec lists the exact assertions. These come from the design specs + i18n and are the contract. If an assertion fails, that is a candidate bug — triage with `systematic-debugging`; do not "fix" the test to match the app.
- **Dates:** compute relative to real `now` in UTC midnight, mirroring `bandFor`/`dayBadge`/`stats` intent (`Date.UTC(y,m,d)`). Helper `utcMidnight(offsetDays)` in `fixtures/dates.ts`.
- **Determinism:** `retries: 0`. Stateful specs use their own seeded household so they don't collide. No real network (OFF pre-seeded; push at request layer).
- **Do NOT modify `src/`.** If a selector is impossible without a hook, note it in the run report rather than editing app code.

## File structure

| File | Responsibility |
|---|---|
| `playwright.config.ts` | projects, webServer (build+run), test env, baseURL, retries 0 |
| `tests/e2e/fixtures/db.ts` | open the app's SQLite file; seed users/households/memberships/items/products/sessions; read helpers |
| `tests/e2e/fixtures/dates.ts` | `utcMidnight`, `isoDate` helpers |
| `tests/e2e/fixtures/test.ts` | extend `@playwright/test` with `app` storageState, `loginAs`, `seed` fixtures |
| `tests/e2e/auth.setup.ts` | sign up primary EN user via UI → save `storageState` |
| `tests/e2e/auth.spec.ts` | signup/login/logout/guard redirects |
| `tests/e2e/add.spec.ts` | addFresh, addCustom (incl. quantity ≥1) |
| `tests/e2e/inventory.spec.ts` | bands, sort, location filter, consume, discard |
| `tests/e2e/item.spec.ts` | item update, consume, discard, remove |
| `tests/e2e/households.spec.ts` | create/switch/settings/role/remove/revoke/delete + scoping |
| `tests/e2e/invitations.spec.ts` | create link, join (single-use, preview-not-consume) |
| `tests/e2e/account.spec.ts` | profile, theme, passkey remove, push (request layer) |
| `tests/e2e/scan.spec.ts` | manual barcode entry, confirm packaged (pre-seeded cache) |
| `tests/e2e/bilan.spec.ts` | monthly eaten/wasted, waste streak |
| `tests/e2e/passkey.spec.ts` | CDP virtual authenticator enroll + login |

---

## Task 1: Harness bootstrap + smoke test

**Files:**
- Modify: `package.json` (scripts + devDependency)
- Modify: `.gitignore`
- Create: `playwright.config.ts`
- Create: `tests/e2e/smoke.spec.ts`

- [ ] **Step 1: Install Playwright test runner + Chromium**

```bash
bun add -d @playwright/test
bunx playwright install chromium
```

- [ ] **Step 2: Add scripts to `package.json`**

In the `"scripts"` block add:

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

- [ ] **Step 3: Append to `.gitignore`**

```
# Playwright e2e
.e2e/
test-results/
playwright-report/
tests/e2e/.auth/
```

- [ ] **Step 4: Create `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;

// Valid-format throwaway VAPID keypair (reused from src/lib/server/pushConfig.ts
// DEV_* constants). Test-only; never used against a real push service.
const VAPID_PUBLIC =
	'BPrdp9khG8zONp84LcJv8AauDJ4aHk2dSUL5HbhQKcL7hl7YnfkjaKZdO2-H_ptuZWth0BIKofG6cTOIPhR90NA';
const VAPID_PRIVATE = 'jKQSbVbgB0Nl-fcSHFT24MBUHoqlH3_Qg1xyH03Z0A4';

// Env passed to BOTH the build and the adapter-node server. The built server reads
// process.env at runtime via $env/dynamic/private (no .env files are loaded).
const serverEnv: Record<string, string> = {
	PORT: String(PORT),
	DATABASE_PATH: '.e2e/run.db',
	ORIGIN: BASE_URL,
	RP_ID: 'localhost',
	RP_NAME: 'Garde-Manger',
	OFF_USER_AGENT: 'GardeManger-e2e (test@example.com)',
	VAPID_PUBLIC_KEY: VAPID_PUBLIC,
	VAPID_PRIVATE_KEY: VAPID_PRIVATE,
	VAPID_SUBJECT: 'mailto:e2e@garde-manger.local',
	CRON_SECRET: 'test-cron-secret'
};

export default defineConfig({
	testDir: 'tests/e2e',
	fullyParallel: false,
	retries: 0,
	workers: 1,
	reporter: [['list'], ['html', { open: 'never' }]],
	timeout: 30_000,
	expect: { timeout: 7_500 },
	use: { baseURL: BASE_URL, trace: 'on-first-retry', locale: 'en-US' },
	webServer: {
		// Fresh DB each clean run, then build, then start the production server.
		command: 'rm -rf .e2e && bun run build && bun ./build/index.js',
		url: BASE_URL,
		timeout: 120_000,
		reuseExistingServer: !process.env.CI,
		env: serverEnv,
		stdout: 'pipe',
		stderr: 'pipe'
	},
	projects: [
		{ name: 'setup', testMatch: /auth\.setup\.ts/ },
		{
			name: 'app',
			dependencies: ['setup'],
			testIgnore: [/auth\.setup\.ts/, /passkey\.spec\.ts/, /auth\.spec\.ts/],
			use: { ...devices['Desktop Chrome'], storageState: 'tests/e2e/.auth/user.json' }
		},
		{
			name: 'anon',
			testMatch: /auth\.spec\.ts/,
			use: { ...devices['Desktop Chrome'] }
		},
		{
			name: 'passkey',
			testMatch: /passkey\.spec\.ts/,
			use: { ...devices['Desktop Chrome'] }
		}
	]
});
```

> Note: `workers: 1` + `fullyParallel: false` for the first green build (shared DB, deterministic). Parallelism can be revisited once specs are isolated by household.

- [ ] **Step 5: Create the smoke spec `tests/e2e/smoke.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

// Unauthenticated landing page must render (proves: build ran, server booted on the
// pinned port, fresh DB migrated + foods auto-seeded without crashing).
test('landing page renders for anonymous visitor', async ({ page }) => {
	const res = await page.goto('/');
	expect(res?.status()).toBeLessThan(400);
	await expect(page.getByText('Stop wasting food. Cook what you have.')).toBeVisible();
});
```

Put the smoke spec in the `app` project's ignore? No — it has no auth need. Add it to the `anon` project by widening `anon`'s `testMatch` to `/(auth\.spec|smoke\.spec)\.ts/`.

- [ ] **Step 6: Run the smoke test**

Run: `bun run test:e2e -- --project=anon -g "landing page"`
Expected: 1 passed. The first run builds the app (slow) and creates `.e2e/run.db`.

- [ ] **Step 7: Commit**

```bash
git add package.json bun.lock .gitignore playwright.config.ts tests/e2e/smoke.spec.ts
git commit -m "test(e2e): bootstrap Playwright harness against production build"
```

---

## Task 2: DB fixtures

**Files:**
- Create: `tests/e2e/fixtures/dates.ts`
- Create: `tests/e2e/fixtures/db.ts`

- [ ] **Step 1: Create `tests/e2e/fixtures/dates.ts`**

```ts
const MS_PER_DAY = 86_400_000;

/** UTC midnight today shifted by `offsetDays`. Mirrors the server's start-of-day math. */
export function utcMidnight(offsetDays = 0): Date {
	const now = new Date();
	const base = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
	return new Date(base + offsetDays * MS_PER_DAY);
}

/** 'YYYY-MM-DD' for a date input, in UTC. */
export function isoDate(d: Date): string {
	return d.toISOString().slice(0, 10);
}
```

- [ ] **Step 2: Create `tests/e2e/fixtures/db.ts`**

Reuse the app's own client + schema + server helpers so fixtures never drift from production code. Open the SAME file the server uses.

```ts
import { randomBytes } from 'node:crypto';
import { createDb } from '../../../src/lib/server/db/client';
import * as schema from '../../../src/lib/server/db/schema';
import { hashPassword } from '../../../src/lib/server/auth/password';
import { createSession } from '../../../src/lib/server/auth/session';
import { createHousehold } from '../../../src/lib/server/households';

const DB_PATH = process.env.DATABASE_PATH ?? '.e2e/run.db';

// Single shared handle for the test process (WAL + busy_timeout allow this to
// coexist with the running adapter-node server which holds its own handle).
const { db } = createDb(DB_PATH);

function id(prefix: string): string {
	return `${prefix}_${randomBytes(8).toString('hex')}`;
}

export interface SeededUser {
	id: string;
	email: string;
	password: string;
	displayName: string;
}

/** Upsert a user by email so re-runs against a reused server don't fail on UNIQUE. */
export async function seedUser(opts?: Partial<SeededUser>): Promise<SeededUser> {
	const email = opts?.email ?? `${id('user')}@example.com`;
	const password = opts?.password ?? 'Test-passw0rd!';
	const displayName = opts?.displayName ?? 'Test User';
	const existing = db.select().from(schema.users).where(eq(schema.users.email, email)).get();
	if (existing) return { id: existing.id, email, password, displayName };
	const userId = opts?.id ?? id('user');
	db.insert(schema.users)
		.values({
			id: userId,
			email,
			displayName,
			locale: 'en',
			passwordHash: await hashPassword(password),
			createdAt: new Date()
		})
		.run();
	return { id: userId, email, password, displayName };
}

/** Create a household with `ownerId` as admin (uses the app's own function). */
export function seedHousehold(name: string, ownerId: string): { id: string } {
	return createHousehold(db, { name, ownerId });
}

export function seedMembership(householdId: string, userId: string, role: 'admin' | 'member') {
	db.insert(schema.memberships)
		.values({ id: id('mem'), householdId, userId, role, joinedAt: new Date() })
		.onConflictDoNothing()
		.run();
}

/** Direct insert so tests can set EXACT past/boundary dates the UI can't express. */
export function seedItem(opts: {
	householdId: string;
	addedBy: string;
	customName?: string;
	location?: 'pantry' | 'fridge' | 'freezer';
	useByDate?: Date | null;
	bestByDate?: Date | null;
	quantity?: number;
	status?: 'active' | 'consumed' | 'discarded';
	closedAt?: Date | null;
}): string {
	const itemId = id('item');
	db.insert(schema.inventoryItems)
		.values({
			id: itemId,
			householdId: opts.householdId,
			addedBy: opts.addedBy,
			kind: 'fresh',
			customName: opts.customName ?? 'Seeded item',
			location: opts.location ?? 'fridge',
			quantity: opts.quantity ?? 1,
			addedAt: new Date(),
			useByDate: opts.useByDate ?? null,
			bestByDate: opts.bestByDate ?? null,
			status: opts.status ?? 'active',
			closedAt: opts.closedAt ?? null
		})
		.run();
	return itemId;
}

/** Seed the OFF cache so scan lookups are cache hits (zero network). */
export function seedProduct(opts: {
	barcode: string;
	name?: string;
	brand?: string;
	status?: 'found' | 'not_found';
}) {
	db.insert(schema.products)
		.values({
			barcode: opts.barcode,
			name: opts.name ?? null,
			brand: opts.brand ?? null,
			status: opts.status ?? 'found',
			fetchedAt: new Date()
		})
		.onConflictDoUpdate({
			target: schema.products.barcode,
			set: { name: opts.name ?? null, brand: opts.brand ?? null, status: opts.status ?? 'found' }
		})
		.run();
}

/** Create a real session for `userId` and return the cookie token (for loginAs). */
export async function seedSessionToken(userId: string): Promise<string> {
	const { token } = await createSession(db, userId);
	return token;
}

export function getActiveItems(householdId: string) {
	return db
		.select()
		.from(schema.inventoryItems)
		.where(and(eq(schema.inventoryItems.householdId, householdId), eq(schema.inventoryItems.status, 'active')))
		.all();
}

export { db as testDb, schema };
import { and, eq } from 'drizzle-orm';
```

> Move the `import { and, eq }` line to the top with the other imports when writing the file (shown at the bottom only for visibility).

- [ ] **Step 3: Type-check the fixture**

Run: `bunx tsc --noEmit -p tsconfig.json` (or `bun run check`)
Expected: no errors in `tests/e2e/fixtures/db.ts`. Fix import paths if the relative depth is off (file is 3 levels under repo root).

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/fixtures/db.ts tests/e2e/fixtures/dates.ts
git commit -m "test(e2e): DB + date fixtures reusing the app's client/schema"
```

---

## Task 3: Auth setup + extended test fixture

**Files:**
- Create: `tests/e2e/auth.setup.ts`
- Create: `tests/e2e/fixtures/test.ts`

- [ ] **Step 1: Create `tests/e2e/auth.setup.ts`**

Sign up the primary user through the real form (also exercises the signup happy path) and persist the authenticated state. Idempotent: if the email already exists (reused server), log in instead.

```ts
import { test as setup, expect } from '@playwright/test';

const STORAGE = 'tests/e2e/.auth/user.json';
export const PRIMARY = { email: 'primary@example.com', password: 'Primary-passw0rd!', name: 'Primary User' };

setup('authenticate primary user', async ({ page }) => {
	await page.goto('/signup');
	await page.getByLabel('Email address').fill(PRIMARY.email);
	await page.getByLabel('Display name').fill(PRIMARY.name);
	await page.getByLabel('Password').fill(PRIMARY.password);
	await page.getByRole('button', { name: 'Create my account' }).click();

	// Either signup redirected into the app, or the email already exists → log in.
	if (!page.url().includes('/garde-manger')) {
		await page.goto('/login');
		await page.getByLabel('Email address').fill(PRIMARY.email);
		await page.getByLabel('Password').fill(PRIMARY.password);
		await page.getByRole('button', { name: 'Log in' }).click();
	}
	await page.waitForURL('**/garde-manger');
	const cookies = await page.context().cookies();
	expect(cookies.some((c) => c.name === 'gm_session')).toBeTruthy();
	await page.context().storageState({ path: STORAGE });
});
```

- [ ] **Step 2: Create `tests/e2e/fixtures/test.ts`**

```ts
import { test as base, expect } from '@playwright/test';
import * as seed from './db';
import { seedSessionToken } from './db';

export const test = base.extend<{ seed: typeof seed }>({
	seed: async ({}, use) => {
		await use(seed);
	}
});

/** Attach an authenticated session cookie for an arbitrary seeded user to a context. */
export async function loginAs(context: import('@playwright/test').BrowserContext, userId: string, baseURL = 'http://localhost:4173') {
	const token = await seedSessionToken(userId);
	await context.addCookies([
		{ name: 'gm_session', value: token, url: baseURL, httpOnly: true, sameSite: 'Lax' }
	]);
}

export { expect };
```

- [ ] **Step 3: Run setup + smoke under the app project**

Run: `bun run test:e2e -- --project=setup` then `bun run test:e2e -- --project=app -g "landing"` (temporarily add a trivial authed test if needed).
Expected: setup passes and writes `tests/e2e/.auth/user.json`.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/auth.setup.ts tests/e2e/fixtures/test.ts
git commit -m "test(e2e): authenticated storageState setup + test fixtures"
```

---

## Task 4: Auth & route guards (`anon` project)

**File:** Create `tests/e2e/auth.spec.ts`

**Oracle (intended behavior):**
1. Visiting any `(app)` route while logged out redirects to `/login?redirectTo=<original path>`.
2. Login with wrong password shows the generic `Invalid credentials` message (no user enumeration) and stays on `/login`.
3. Successful login redirects to `/garde-manger` and sets `gm_session`.
4. After login, logging out (`/account` → "Log out") clears the session and lands on `/login`; revisiting an `(app)` route redirects to login again.
5. Signup with an already-used email shows `An account already exists with this email`.

- [ ] **Step 1:** Read `src/routes/(auth)/login/+page.svelte`, `signup/+page.svelte`, and `(app)/+layout.server.ts` for control names + redirect param.
- [ ] **Step 2:** Write `auth.spec.ts` covering the 5 oracle points. Seed a known user via `seedUser` for the login-success and wrong-password cases; use a fresh email for the redirect case. Example redirect assertion:

```ts
import { test, expect } from '@playwright/test';

test('app route while logged out redirects to login with redirectTo', async ({ page }) => {
	await page.goto('/bilan');
	await expect(page).toHaveURL(/\/login\?redirectTo=%2Fbilan/);
});
```

- [ ] **Step 3:** Run: `bun run test:e2e -- --project=anon`. Expected: all pass (investigate any failure per `systematic-debugging`).
- [ ] **Step 4:** Commit `test(e2e): auth flows and route guards`.

---

## Task 5: Add item (`app` project)

**File:** Create `tests/e2e/add.spec.ts`

**Oracle:**
1. **addFresh:** search a catalogue food (e.g. "apple"/"tomato"), select it, choose Refrigerator, submit "Add to pantry" → redirected to `/garde-manger` and the item appears in the list.
2. The fresh form shows an editable estimated best-before (prefix `≈`, note "Estimated best-before…"); the value is editable.
3. **addCustom:** free-entry name + location, no dates → item added and listed.
4. **Quantity ≥ 1 (intent from i18n regex `^[1-9]\d*$`):** submitting `addFresh`/`addCustom` with quantity `0` must NOT create an item with quantity 0 — the action rejects it (stays on form / shows error / no new active item). Assert via `getActiveItems(householdId)` that no quantity-0 row exists.
5. Quantity defaults to 1 when left blank.

- [ ] **Step 1:** Read `src/routes/(app)/add/+page.svelte` + `add/+page.server.ts` for the search control, result selection, the `quantity` input name, and the two submit buttons ("Add to pantry" / custom "Add").
- [ ] **Step 2:** Resolve the primary user's active household id (query memberships by the primary user's id via `testDb`) so assertions can read its items.
- [ ] **Step 3:** Write the 5 oracle checks. For #4, set the quantity field to `0` and submit; then `expect(getActiveItems(hid).some(i => i.quantity === 0)).toBe(false)`.
- [ ] **Step 4:** Run: `bun run test:e2e -- --project=app add.spec`. Expected: pass (any failure → triage).
- [ ] **Step 5:** Commit `test(e2e): add fresh/custom incl. quantity validation`.

---

## Task 6: Inventory list — bands, sort, filter, lifecycle (`app` project)

**File:** Create `tests/e2e/inventory.spec.ts`

Use an isolated household for this spec: `const h = seedHousehold('Inv ' + Date.now(), primaryUserId)` is wrong (no Date in plan-land — use a random suffix from `crypto`); seed it, `seedMembership` the primary user as admin, set the active-household cookie by switching to it in the UI, or seed directly and select via the household switcher.

**Oracle (warnDays default = 3):**
1. **Bands:** seed three active items in the household: A `useByDate = utcMidnight(-1)` (past), B `useByDate = utcMidnight(+2)` (within warnDays), C `useByDate = utcMidnight(+30)` (far). On `/garde-manger`, A appears under **"Consume soon"**, B under **"Coming up"**, C under **"Still good"**.
2. **Boundary:** an item at `utcMidnight(+3)` (exactly today+warnDays) is **"Coming up"** (soon), and one at `utcMidnight(+4)` is **"Still good"**.
3. **Sort + NULLs last:** seed items with dates `+5`, `+1`, and one with `useByDate=null`. Within the list, the `+1` item appears before `+5`, and the **undated item appears last**.
4. **Day badge:** the past item shows "Overdue"; an item at `utcMidnight(0)` shows "Today"; `+2` shows "2 d".
5. **Location filter:** seed one fridge + one pantry item; the "Refrigerator" filter shows only the fridge item.
6. **Consume/discard from list:** triggering consume on an item removes it from the active list (and it no longer appears after reload).

- [ ] **Step 1:** Read `garde-manger/+page.svelte` for band headings, item rows, the location SegmentedControl, and the consume/discard controls (swipe vs button — use the button/form path, not the swipe gesture).
- [ ] **Step 2:** Write the spec with a dedicated seeded household; assert band membership by locating each band heading and checking the item is within its section.
- [ ] **Step 3:** Run: `bun run test:e2e -- --project=app inventory.spec`. Expected: pass (triage any failure).
- [ ] **Step 4:** Commit `test(e2e): inventory bands, sort, filter, lifecycle`.

---

## Task 7: Item detail (`app` project)

**File:** Create `tests/e2e/item.spec.ts`

**Oracle:**
1. **Update:** open `/item/[id]`, change location + quantity + notes, save → values persist on reload.
2. **Date kind switch:** set date-kind to DLC with a date, save; switch to DDM with a date, save → the DLC date is cleared and only the DDM date remains (assert via `testDb`).
3. **Consume / discard:** each sets the item terminal (leaves active list, `/garde-manger` no longer shows it).
4. **Remove:** the two-step delete (disclosure → "Confirm deletion") deletes the row (gone from `testDb`).
5. **Invalid location rejected:** (best-effort) if the location control is a free select, attempt an out-of-enum value via the underlying form; expect the persisted value to remain a valid enum.

- [ ] **Step 1:** Read `item/[id]/+page.svelte` + `+page.server.ts` for the update form fields, date-kind control, and delete disclosure.
- [ ] **Step 2:** Seed an item via `seedItem`, navigate to its detail page, drive each oracle point.
- [ ] **Step 3:** Run: `bun run test:e2e -- --project=app item.spec`. Expected: pass (triage failures).
- [ ] **Step 4:** Commit `test(e2e): item detail update/lifecycle/remove`.

---

## Task 8: Households + cross-household scoping (`app` project)

**File:** Create `tests/e2e/households.spec.ts`

**Oracle:**
1. **Create:** `/households` → create "My House" → it appears and becomes active; the creator is admin (admin controls visible on its manage page).
2. **Switch:** with two memberships, switching via the household menu changes the active context (subsequent `/garde-manger` shows the switched household's items).
3. **Settings:** admin updates name + `warnDays` (e.g. 5) → "Settings saved."; setting warnDays to 31 or -1 is rejected ("Invalid name or number of days.").
4. **Roles:** in a 1-admin + 1-member household, the admin can promote the member; the **last admin cannot be demoted or removed** (control disabled or action errors `The household must keep at least one admin.`).
5. **Remove member / revoke invite:** admin removes a member → gone from list; revoking a pending invite removes it.
6. **Delete household:** typing the exact name then "Delete household" cascades (members/items/invites gone — assert via `testDb`) and resets the active household.
7. **Scoping:** seed household B (owned by a second seeded user) with an item; the primary user (not a member of B) gets 404/redirect when navigating to that item's `/item/[id]`, and cannot consume it.

- [ ] **Step 1:** Read `households/+page.svelte`, `households/[id]/+page.svelte`, `HouseholdMenu.svelte` for control names; use EN labels: "Create", "Make admin"/"Make member", "Remove", "Revoke", "Delete household", "Type the household name to confirm".
- [ ] **Step 2:** For scoping (#7), seed user B + household B + item via fixtures; assert the primary user cannot access it.
- [ ] **Step 3:** Run: `bun run test:e2e -- --project=app households.spec`. Expected: pass (triage failures).
- [ ] **Step 4:** Commit `test(e2e): household CRUD, roles, delete cascade, scoping`.

---

## Task 9: Invitations + join (`app` project)

**File:** Create `tests/e2e/invitations.spec.ts`

**Oracle (intent from i18n `join_confirm_*` + invitations design = single-use, 7-day, role-inherited, preview-not-consume):**
1. **Create link:** admin on `/households/[id]/invite` selects a role, "Generate an invitation link" → a `/join/<token>` link is shown.
2. **Preview does NOT consume:** a logged-in *second* user navigates (GET) to `/join/<token>`. The page shows the confirm screen ("Join household" / "Join this household") and the invitation's `usedAt` in `testDb` is **still null** (token not burned by mere navigation/prefetch).
3. **Accept consumes once:** the second user submits "Join this household" → becomes a member with the invited role; `usedAt` is now set; redirected to the household.
4. **Single-use:** visiting+submitting the same token again shows `This invitation link has already been used.`
5. **Expired / invalid:** seed an invitation with `expiresAt` in the past → `expired`; a bogus token → `not_found`.

- [ ] **Step 1:** Read `join/[token]/+page.server.ts` + `+page.svelte` and `households/[id]/invite/+page.svelte` for the link element and the accept control. (Mechanics only — derive the "preview must not consume" expectation from the i18n confirm strings + design spec, not from the load/action code.)
- [ ] **Step 2:** Create the invitation via the UI (or `createInvitation` through `testDb` to control the raw token); seed a second user and `loginAs` a second context. Assert `usedAt` via `testDb` before and after submit.
- [ ] **Step 3:** Run: `bun run test:e2e -- --project=app invitations.spec`. Expected: pass (triage failures — this is a high-suspicion area for GET-vs-POST behavior).
- [ ] **Step 4:** Commit `test(e2e): invitation create + join single-use/preview semantics`.

---

## Task 10: Account — profile, theme, passkey remove, push (`app` project)

**File:** Create `tests/e2e/account.spec.ts`

**Oracle:**
1. **Profile:** change display name + language (en/fr) on `/account` → "Profile updated."; reload shows the new name; switching to fr changes UI strings (e.g. nav).
2. **Theme:** choosing Dark persists (the `gm_theme` cookie set and the document theme attribute reflects dark after navigation).
3. **Passkey remove:** seed a credential row for the primary user via `testDb`; it appears in the passkeys list; "Delete" removes it (gone from list + `testDb`).
4. **Push (request layer):** POST `/api/push/subscribe` via `page.request` with a synthetic subscription `{ endpoint: 'https://fcm.googleapis.com/...', keys:{ p256dh, auth } }` returns ok and creates a row; POST `/api/push/unsubscribe` with the same endpoint removes it (idempotent: a second unsubscribe still returns ok). Note in a comment that the UI button is unavailable headless.

- [ ] **Step 1:** Read `account/+page.svelte`, `PushSettings.svelte`, and `api/push/*/+server.ts` for the subscribe payload shape + endpoint validation (must be https, non-loopback).
- [ ] **Step 2:** Write the 4 oracle checks.
- [ ] **Step 3:** Run: `bun run test:e2e -- --project=app account.spec`. Expected: pass (triage failures).
- [ ] **Step 4:** Commit `test(e2e): account profile/theme/passkey/push`.

---

## Task 11: Scan — manual entry + confirm packaged (`app` project)

**File:** Create `tests/e2e/scan.spec.ts`

**Oracle:**
1. **Manual barcode entry:** on `/scan`, entering an invalid barcode shows `Invalid barcode.` and stays; a valid one (e.g. `3017620422003`) navigates to `/scan/3017620422003`.
2. **Cache hit (no network):** pre-seed `products` for that barcode (`seedProduct({ barcode:'3017620422003', name:'Test Spread', status:'found' })`); the confirm page prefills the product name "Test Spread".
3. **DLC required:** submitting without a use-by date shows `A use-by date is required for a packaged product.`
4. **Add succeeds:** with a use-by date + location → item added (`kind='packaged'`, barcode set) and appears on `/garde-manger`.

- [ ] **Step 1:** Read `scan/+page.svelte`, `scan/[barcode]/+page.svelte` + `+page.server.ts` for the manual-entry form, confirm form fields, and the DLC input.
- [ ] **Step 2:** Seed the product first (so the `[barcode]` load is a cache hit and never calls OFF). Drive the 4 oracle points.
- [ ] **Step 3:** Run: `bun run test:e2e -- --project=app scan.spec`. Expected: pass (triage failures).
- [ ] **Step 4:** Commit `test(e2e): scan manual entry + packaged add (offline cache)`.

---

## Task 12: Bilan — monthly stats + waste streak (`app` project)

**File:** Create `tests/e2e/bilan.spec.ts`

**Oracle (current calendar month, UTC; streak = whole days since last discard):**
1. Seed (in a dedicated household) 2 items `status='consumed'` and 1 `status='discarded'`, all with `closedAt = utcMidnight(0)` → `/bilan` shows Eaten = 2, Wasted = 1.
2. Items consumed/discarded *before* the 1st of the current month are NOT counted.
3. **Streak:** with a single discard at `closedAt = utcMidnight(-5)` and nothing since, the streak shows "5 days waste-free" (`bilan_streak(5)`); with no discards ever, "No waste recorded yet 🎉".

- [ ] **Step 1:** Read `bilan/+page.svelte` for the Eaten/Wasted tiles and streak text.
- [ ] **Step 2:** Seed items with explicit `status`/`closedAt`; switch the active household to the seeded one; assert the tiles + streak text.
- [ ] **Step 3:** Run: `bun run test:e2e -- --project=app bilan.spec`. Expected: pass (triage failures).
- [ ] **Step 4:** Commit `test(e2e): bilan monthly counts + waste streak`.

---

## Task 13: Passkey via virtual authenticator (`passkey` project)

**File:** Create `tests/e2e/passkey.spec.ts`

**Oracle:** a user can enroll a passkey and then log in with it.

- [ ] **Step 1:** Read `PasskeyEnroll.svelte` / `PasskeyLogin.svelte` for the enroll/login button labels.
- [ ] **Step 2:** Write the spec. Seed + password-login a fresh user (own context, no storageState), then attach a CDP virtual authenticator and enroll:

```ts
import { test, expect } from '@playwright/test';
import { seedUser } from './fixtures/db';

test('enroll a passkey then log in with it', async ({ page, context }) => {
	const user = await seedUser();
	// Virtual authenticator (Chromium CDP)
	const client = await context.newCDPSession(page);
	await client.send('WebAuthn.enable');
	await client.send('WebAuthn.addVirtualAuthenticator', {
		options: {
			protocol: 'ctap2',
			transport: 'internal',
			hasResidentKey: true,
			hasUserVerification: true,
			isUserVerified: true,
			automaticPresenceSimulation: true
		}
	});

	// Password login first (enroll requires an authenticated session)
	await page.goto('/login');
	await page.getByLabel('Email address').fill(user.email);
	await page.getByLabel('Password').fill(user.password);
	await page.getByRole('button', { name: 'Log in' }).click();
	await page.waitForURL('**/garde-manger');

	// Enroll on the account page
	await page.goto('/account');
	await page.getByRole('button', { name: /passkey/i }).click();
	await expect(page.getByText(/passkey/i)).toBeVisible();

	// Log out, then log in via passkey
	await page.goto('/account');
	await page.getByRole('button', { name: 'Log out' }).click();
	await page.waitForURL('**/login');
	await page.getByRole('button', { name: /passkey/i }).click();
	await page.waitForURL('**/garde-manger');
});
```

- [ ] **Step 3:** Run: `bun run test:e2e -- --project=passkey`. Expected: pass. If the CDP virtual authenticator can't satisfy `userVerification: 'required'`, note it and keep `isUserVerified: true` (already set). Triage genuine failures.
- [ ] **Step 4:** Commit `test(e2e): passkey enroll + login via virtual authenticator`.

---

## Task 14: Full sweep + triage + report

- [ ] **Step 1:** Kill any reused dev server, then run the entire suite clean:

Run: `CI=1 bun run test:e2e`
Expected: a fresh build, fresh DB, all projects run. Most specs pass; **a small number of genuine failures pinpoint the bug.**

- [ ] **Step 2:** For each failure, apply `superpowers:systematic-debugging`: reproduce in isolation, confirm the assertion encodes intended behavior (re-check against design spec + i18n), and rule out a test/flake/selector bug. A confirmed intent violation is the bug.
- [ ] **Step 3:** Write a short run report (the offending **action**, **intended vs actual**, and the **minimal failing test** as evidence). Do NOT modify `src/`. Offer a proposed fix only if asked.
- [ ] **Step 4:** Commit the report: `git commit -m "test(e2e): full-sweep run report identifying the bug"` (add a `docs/superpowers/` note or include in the PR description).

---

## Self-review (completed)

- **Spec coverage:** every coverage-matrix row (§7 of the spec) maps to a task — auth/guards→T4, add+quantity→T5, scan→T11, inventory bands/sort/filter/lifecycle→T6, item detail→T7, households+scoping→T8, invitations/join→T9, account+push→T10, bilan→T12, passkey→T13, blind hunt+report→T14. Harness/env/seeding (§4–§9) → T1–T3.
- **Placeholders:** none — config, fixtures, auth, smoke, passkey, and one redirect assertion are full code; every test task carries a concrete intended-behavior oracle with EN i18n selectors. Spec bodies are written against those oracles after reading the component for control names (mechanics only).
- **Type/name consistency:** fixture exports (`seedUser`, `seedHousehold`, `seedMembership`, `seedItem`, `seedProduct`, `seedSessionToken`, `getActiveItems`, `testDb`, `schema`) are referenced consistently; `loginAs`/`PRIMARY` exported where used; cookie name `gm_session`, theme cookie `gm_theme`, locale cookie `gm_locale` match `src/`.
```
