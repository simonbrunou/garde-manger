# Tier 1 — Inventory UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface data garde-manger already stores — partial (quantity-aware) consumption, an overdue day count, an estimated-date mark, and a storage tip on item detail.

**Architecture:** Each feature is a thin server/helper unit (unit-tested in isolation) plus a small Svelte render. No schema change, no migration, no new dependency. The lifecycle change is one helper, `recordUse`, that decrements multi-unit rows and only closes them at the last unit.

**Tech Stack:** SvelteKit 2 / Svelte 5, Drizzle + `bun:sqlite`, `bun test` for unit/integration, Playwright for e2e. Source files use TAB indentation — match it.

**Spec:** `docs/superpowers/specs/2026-06-03-tier1-inventory-ux-design.md`

**Conventions:**
- Unit tests live beside the module (`foo.ts` → `foo.test.ts`) and run with `bun test ./src`.
- e2e specs live in `tests/e2e/*.spec.ts`, run with `bun run test:e2e` (builds + serves; slow).
- Type/lint gate: `bun run check` and `bun run lint`.
- New i18n keys go in BOTH `src/lib/i18n/messages/fr.ts` and `en.ts`; `src/lib/i18n/i18n.test.ts` enforces key parity (the `Messages` type derives from `fr`).

---

## Task 1: `recordUse` — quantity-aware lifecycle helper

**Files:**
- Modify: `src/lib/server/inventory.ts` (add `recordUse` after `setStatus`)
- Test: `src/lib/server/inventory.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/server/inventory.test.ts`. Add `recordUse` to the existing import from `./inventory`, then append this block (it reuses the file's `makeDb`, `seedFixtures`, `USER_ID`, `HOUSEHOLD_ID`, `FOOD_ID`):

```ts
describe('recordUse', () => {
	let db: DB;
	beforeEach(() => {
		db = makeDb();
		seedFixtures(db);
	});

	it('quantity > 1 decrements by one and keeps the row active', () => {
		const item = addFresh(db, {
			householdId: HOUSEHOLD_ID,
			addedBy: USER_ID,
			foodId: FOOD_ID,
			location: 'fridge',
			quantity: 3
		});
		const updated = recordUse(db, {
			id: item.id,
			householdId: HOUSEHOLD_ID,
			outcome: 'consumed'
		});
		expect(updated?.quantity).toBe(2);
		expect(updated?.status).toBe('active');
		expect(updated?.closedAt).toBeNull();
	});

	it('quantity === 1 with outcome consumed closes the row', () => {
		const item = addFresh(db, {
			householdId: HOUSEHOLD_ID,
			addedBy: USER_ID,
			foodId: FOOD_ID,
			location: 'fridge',
			quantity: 1
		});
		const updated = recordUse(db, {
			id: item.id,
			householdId: HOUSEHOLD_ID,
			outcome: 'consumed'
		});
		expect(updated?.status).toBe('consumed');
		expect(updated?.closedAt).not.toBeNull();
	});

	it('quantity === 1 with outcome discarded closes the row as discarded', () => {
		const item = addFresh(db, {
			householdId: HOUSEHOLD_ID,
			addedBy: USER_ID,
			foodId: FOOD_ID,
			location: 'fridge',
			quantity: 1
		});
		const updated = recordUse(db, {
			id: item.id,
			householdId: HOUSEHOLD_ID,
			outcome: 'discarded'
		});
		expect(updated?.status).toBe('discarded');
	});

	it('returns undefined for an item in another household', () => {
		const item = addFresh(db, {
			householdId: HOUSEHOLD_ID,
			addedBy: USER_ID,
			foodId: FOOD_ID,
			location: 'fridge',
			quantity: 2
		});
		const updated = recordUse(db, {
			id: item.id,
			householdId: 'some-other-household',
			outcome: 'consumed'
		});
		expect(updated).toBeUndefined();
	});

	it('returns undefined for a missing id', () => {
		const updated = recordUse(db, {
			id: 'does-not-exist',
			householdId: HOUSEHOLD_ID,
			outcome: 'consumed'
		});
		expect(updated).toBeUndefined();
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test ./src/lib/server/inventory.test.ts`
Expected: FAIL — `recordUse is not a function` / import error.

- [ ] **Step 3: Implement `recordUse`**

In `src/lib/server/inventory.ts`, add after the `setStatus` function (it uses the already-present `getItemScoped`, `updateItem`, `setStatus` and the `InventoryItem`/`DB` types):

```ts
// ── recordUse ─────────────────────────────────────────────────────────────────

/**
 * Record one unit consumed or discarded. Multi-unit rows decrement by one and
 * stay active; the last unit closes the row via setStatus. Household-scoped:
 * returns undefined if the item does not belong to the household.
 */
export function recordUse(
	db: DB,
	{
		id,
		householdId,
		outcome
	}: { id: string; householdId: string; outcome: 'consumed' | 'discarded' }
): InventoryItem | undefined {
	const item = getItemScoped(db, { id, householdId });
	if (!item) return undefined;
	if (item.quantity > 1) {
		return updateItem(db, { id, householdId, quantity: item.quantity - 1 });
	}
	return setStatus(db, { id, householdId, status: outcome });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun test ./src/lib/server/inventory.test.ts`
Expected: PASS (all `recordUse` cases plus the pre-existing suite).

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/inventory.ts src/lib/server/inventory.test.ts
git commit -m "feat(inventory): recordUse decrements multi-unit rows, closes at last unit"
```

---

## Task 2: Wire `recordUse` into the consume/discard actions

**Files:**
- Modify: `src/routes/(app)/garde-manger/+page.server.ts` (the `consume` and `discard` actions)
- Modify: `src/routes/(app)/item/[id]/+page.server.ts` (the `consume` and `discard` actions)
- Modify: `tests/e2e/inventory.spec.ts` (add a decrement spec)

There is no pure logic here (a one-call swap to a tested helper), so verification is the type gate plus an e2e that proves the decrement-then-close behavior end to end.

- [ ] **Step 1: Swap the home-list actions to `recordUse`**

In `src/routes/(app)/garde-manger/+page.server.ts`:

Change the import on line 11 from:
```ts
import { listActive, setStatus, bandFor } from '$lib/server/inventory';
```
to:
```ts
import { listActive, setStatus, recordUse, bandFor } from '$lib/server/inventory';
```
(`setStatus` stays imported only if still referenced; after this task it is not — remove it from the import if so. `bun run lint` will flag an unused import.)

In the `consume` action, replace:
```ts
		const consumed = setStatus(db, { id, householdId: activeHouseholdId, status: 'consumed' });
		if (!consumed) error(404, 'Item not found in your active household');
```
with:
```ts
		const consumed = recordUse(db, { id, householdId: activeHouseholdId, outcome: 'consumed' });
		if (!consumed) error(404, 'Item not found in your active household');
```

In the `discard` action, replace:
```ts
		const discarded = setStatus(db, { id, householdId: activeHouseholdId, status: 'discarded' });
		if (!discarded) error(404, 'Item not found in your active household');
```
with:
```ts
		const discarded = recordUse(db, { id, householdId: activeHouseholdId, outcome: 'discarded' });
		if (!discarded) error(404, 'Item not found in your active household');
```

- [ ] **Step 2: Swap the item-detail actions to `recordUse`**

In `src/routes/(app)/item/[id]/+page.server.ts`:

Change the import on line 11 from:
```ts
import { getItemScoped, updateItem, deleteItem, setStatus, bandFor } from '$lib/server/inventory';
```
to:
```ts
import { getItemScoped, updateItem, deleteItem, recordUse, bandFor } from '$lib/server/inventory';
```

In the `consume` action, replace:
```ts
		if (!setStatus(db, { id: params.id, householdId: hh, status: 'consumed' })) {
			error(404, 'Not found');
		}
```
with:
```ts
		if (!recordUse(db, { id: params.id, householdId: hh, outcome: 'consumed' })) {
			error(404, 'Not found');
		}
```

In the `discard` action, replace:
```ts
		if (!setStatus(db, { id: params.id, householdId: hh, status: 'discarded' })) {
			error(404, 'Not found');
		}
```
with:
```ts
		if (!recordUse(db, { id: params.id, householdId: hh, outcome: 'discarded' })) {
			error(404, 'Not found');
		}
```

- [ ] **Step 3: Type + lint gate**

Run: `bun run check && bun run lint`
Expected: PASS. If lint reports `setStatus` unused in either route file, delete it from that file's import and re-run.

- [ ] **Step 4: Add a decrement e2e spec**

Append to `tests/e2e/inventory.spec.ts` (mirrors the existing "consume from the list" spec; the helpers `dedicatedHousehold`, `ownerId`, and fixtures are already in the file):

```ts
test('eaten on a multi-unit item decrements before closing the row', async ({ page }) => {
	const hid = await dedicatedHousehold(page);
	const oid = ownerId();
	const name = `multi-${randomUUID()}`;
	// Urgent (past) so the inline "Eaten" button shows without needing focus. Qty 2.
	const id = db.seedItem({
		householdId: hid,
		addedBy: oid,
		customName: name,
		useByDate: utcMidnight(-1),
		quantity: 2
	});

	await page.goto('/garde-manger');
	const row = () => page.locator('section.band .row').filter({ has: page.getByText(name) });

	// First "Eaten": decrements to 1, row stays on the list.
	let consumed = page.waitForResponse(
		(r) => r.request().method() === 'POST' && r.url().includes('/garde-manger')
	);
	await row().getByRole('button', { name: 'Eaten' }).click();
	await consumed;
	await expect(page.getByText(name)).toBeVisible();
	expect(db.getActiveItems(hid).map((r) => r.id as string)).toContain(id);

	// Second "Eaten": closes the row, it disappears from the active list.
	consumed = page.waitForResponse(
		(r) => r.request().method() === 'POST' && r.url().includes('/garde-manger')
	);
	await row().getByRole('button', { name: 'Eaten' }).click();
	await consumed;
	await expect(page.getByText(name)).toHaveCount(0);
	expect(db.getActiveItems(hid).map((r) => r.id as string)).not.toContain(id);
});
```

- [ ] **Step 5: Run the new e2e spec**

Run: `bun run test:e2e -- inventory.spec.ts`
Expected: PASS (the whole inventory spec, including the new decrement test).

- [ ] **Step 6: Commit**

```bash
git add "src/routes/(app)/garde-manger/+page.server.ts" "src/routes/(app)/item/[id]/+page.server.ts" tests/e2e/inventory.spec.ts
git commit -m "feat(inventory): consume/discard decrement multi-unit rows via recordUse"
```

---

## Task 3: Overdue day count in the day badge

**Files:**
- Modify: `src/lib/dates.ts` (add `formatDayBadge`)
- Test: `src/lib/dates.test.ts`
- Modify: `src/lib/components/ui/DayBadge.svelte` (use `formatDayBadge`)
- Modify: `tests/e2e/inventory.spec.ts` (strengthen the overdue badge assertion)

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/dates.test.ts`. Add `formatDayBadge` to the import from `./dates`, then add:

```ts
// Minimal stand-in for the three Messages keys formatDayBadge reads.
const T = { day_today: 'Today', day_unit: 'd', day_overdue: 'Overdue' };

describe('formatDayBadge', () => {
	it('null days → infinity glyph', () => {
		expect(formatDayBadge(null, T)).toEqual({ text: '∞', aria: '∞' });
	});
	it('zero days → today', () => {
		expect(formatDayBadge(0, T)).toEqual({ text: 'Today', aria: 'Today' });
	});
	it('positive days → "N d"', () => {
		expect(formatDayBadge(3, T)).toEqual({ text: '3 d', aria: '3 d' });
	});
	it('negative days → overdue count text + spelled-out aria', () => {
		expect(formatDayBadge(-2, T)).toEqual({ text: '-2', aria: '2 d · Overdue' });
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test ./src/lib/dates.test.ts`
Expected: FAIL — `formatDayBadge is not a function`.

- [ ] **Step 3: Implement `formatDayBadge`**

In `src/lib/dates.ts`, add (the import keeps `dates.ts` free of runtime i18n by typing only the keys it needs):

```ts
import type { Messages } from './i18n';

/**
 * Visible text + accessible label for a day badge, given whole days remaining
 * (from dayBadge). Negative = overdue: shows the signed count, spells out the
 * magnitude for screen readers.
 */
export function formatDayBadge(
	days: number | null,
	t: Pick<Messages, 'day_today' | 'day_unit' | 'day_overdue'>
): { text: string; aria: string } {
	if (days === null) return { text: '∞', aria: '∞' };
	if (days < 0) {
		return { text: String(days), aria: `${Math.abs(days)} ${t.day_unit} · ${t.day_overdue}` };
	}
	if (days === 0) return { text: t.day_today, aria: t.day_today };
	const label = `${days} ${t.day_unit}`;
	return { text: label, aria: label };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun test ./src/lib/dates.test.ts`
Expected: PASS.

- [ ] **Step 5: Use `formatDayBadge` in the component**

Replace the `<script>` body of `src/lib/components/ui/DayBadge.svelte` (lines 1–29, the imports + derived `info`/`text`/`aria`) with:

```svelte
<script lang="ts">
	import { dayBadge, formatDayBadge } from '$lib/dates';
	import type { Messages } from '$lib/i18n';
	import type { Band } from '$lib/server/inventory';
	let {
		band,
		effectiveDate,
		now = new Date(),
		t
	}: { band: Band; effectiveDate: string | null; now?: Date; t: Messages } = $props();
	const badge = $derived(formatDayBadge(dayBadge(effectiveDate, now).days, t));
	const text = $derived(badge.text);
	const aria = $derived(badge.aria);
</script>
```

The markup (`<span class="badge badge-{band}" aria-label={aria}>{text}</span>`) and `<style>` are unchanged.

- [ ] **Step 6: Validate the component with the Svelte tooling**

Run: `bun run check`
Expected: PASS (no type errors). Also run `bun test ./src/lib/dates.test.ts` again — still green.

- [ ] **Step 7: Strengthen the overdue e2e assertion**

In `tests/e2e/inventory.spec.ts`, the test `day badge: overdue / today / N days` currently asserts only the accessible label for the overdue item. Add a visible-count assertion right after the existing overdue label check (line ~131, `await expect(rowFor(overdue).getByLabel(BADGE.overdue)).toBeVisible();`):

```ts
	// Overdue now shows the signed day count (was a bare "!"). Item is 1 day past.
	await expect(rowFor(overdue).getByText('-1', { exact: true })).toBeVisible();
```

The accessible label assertion still passes: the new aria string (`1 d · Overdue`) still contains "Overdue", which `getByLabel` matches as a substring.

- [ ] **Step 8: Run the overdue e2e spec**

Run: `bun run test:e2e -- inventory.spec.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/dates.ts src/lib/dates.test.ts src/lib/components/ui/DayBadge.svelte tests/e2e/inventory.spec.ts
git commit -m "feat(badge): show overdue day count instead of a bare exclamation"
```

---

## Task 4: Estimate mark (`~`) on estimated dates

**Files:**
- Modify: `src/lib/i18n/messages/fr.ts` and `src/lib/i18n/messages/en.ts` (add `est_label`)
- Modify: `src/routes/(app)/garde-manger/+page.server.ts` (add `isEstimate` to `ItemRow` + row build)
- Modify: `src/lib/components/ui/ItemRow.svelte` (`isEstimate` on `RowItem`, `~` prefix + title)
- Modify: `src/routes/(app)/item/[id]/+page.server.ts` (return `isEstimate`)
- Modify: `src/routes/(app)/item/[id]/+page.svelte` (estimate caption under the date)
- Modify: `tests/e2e/fixtures/db.ts` (let `seedItem` set `is_estimate`)
- Modify: `tests/e2e/inventory.spec.ts` (assert the `~` shows only for estimates)

- [ ] **Step 1: Add the `est_label` i18n key (both locales)**

In `src/lib/i18n/messages/en.ts`, add next to `dlc_label`/`ddm_label` (around line 182):
```ts
	est_label: 'estimated',
```
In `src/lib/i18n/messages/fr.ts`, add the matching key at the same logical place:
```ts
	est_label: 'estimée',
```

- [ ] **Step 2: Verify i18n parity stays green**

Run: `bun test ./src/lib/i18n/i18n.test.ts`
Expected: PASS (both locales define `est_label`).

- [ ] **Step 3: Plumb `isEstimate` through the home load**

In `src/routes/(app)/garde-manger/+page.server.ts`:

Add to the `ItemRow` interface (after `category: string | null;`):
```ts
	isEstimate: boolean;
```
Add to the `row` object built in the loop (after `category`):
```ts
			isEstimate: item.isEstimate
```

- [ ] **Step 4: Render the `~` prefix in `ItemRow.svelte`**

In `src/lib/components/ui/ItemRow.svelte`:

Add to the `RowItem` interface (after `category: string | null;`):
```ts
		isEstimate: boolean;
```

Replace the meta line that renders the date (the line containing `{#if dateLabel}&nbsp;· {dateLabel}{/if}`) with a date span that carries the `~` and a title when estimated:
```svelte
			{locLabel}{#if item.quantity > 1}&nbsp;· ×{item.quantity}{/if}{#if dateLabel}&nbsp;· <span title={item.isEstimate ? t.est_label : undefined}>{#if item.isEstimate}~ {/if}{dateLabel}</span>{/if}
```

- [ ] **Step 5: Plumb `isEstimate` through the item-detail load**

In `src/routes/(app)/item/[id]/+page.server.ts`, add to the returned `item` object (after `addedAt: ...`):
```ts
				isEstimate: item.isEstimate
```

- [ ] **Step 6: Render the estimate caption on item detail**

In `src/routes/(app)/item/[id]/+page.svelte`, inside the `{#if it.dateKind}` block, after the date `<label>…</label>` (line ~47), add:
```svelte
				{#if it.isEstimate}<small class="est-note">~ {t.est_label}</small>{/if}
```
Add to the `<style>` block:
```css
	.est-note {
		color: var(--text-muted);
		font-size: 0.8rem;
	}
```

- [ ] **Step 7: Type gate**

Run: `bun run check`
Expected: PASS.

- [ ] **Step 8: Let the e2e fixture seed estimates**

In `tests/e2e/fixtures/db.ts`, add `isEstimate?: boolean;` to the `seedItem` opts object (after `quantity?: number;`), then change the INSERT so `is_estimate` is parameterized. Replace the hard-coded `0` for `is_estimate` in the VALUES list with a `?`, and pass `opts.isEstimate ? 1 : 0` in the corresponding argument position. The edited statement:
```ts
		d.prepare(
			`INSERT INTO inventory_items
				(id, household_id, added_by, kind, custom_name, quantity, location, added_at,
				 use_by_date, best_by_date, is_estimate, status, closed_at)
			 VALUES (?, ?, ?, 'fresh', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		).run(
			id,
			opts.householdId,
			opts.addedBy,
			opts.customName ?? 'Seeded item',
			opts.quantity ?? 1,
			opts.location ?? 'fridge',
			toSec(new Date())!,
			toSec(opts.useByDate),
			toSec(opts.bestByDate),
			opts.isEstimate ? 1 : 0,
			opts.status ?? 'active',
			toSec(opts.closedAt)
		);
```

- [ ] **Step 9: Add the estimate-mark e2e**

Append to `tests/e2e/inventory.spec.ts`:
```ts
test('estimated dates are marked with ~, user-entered dates are not', async ({ page }) => {
	const hid = await dedicatedHousehold(page);
	const oid = ownerId();
	const est = `est-${randomUUID()}`;
	const exact = `exact-${randomUUID()}`;
	db.seedItem({
		householdId: hid,
		addedBy: oid,
		customName: est,
		bestByDate: utcMidnight(2),
		isEstimate: true
	});
	db.seedItem({
		householdId: hid,
		addedBy: oid,
		customName: exact,
		useByDate: utcMidnight(2),
		isEstimate: false
	});

	await page.goto('/garde-manger');
	const rowFor = (name: string) =>
		page.locator('section.band .row').filter({ has: page.getByText(name) });

	await expect(rowFor(est).locator('.meta')).toContainText('~');
	await expect(rowFor(exact).locator('.meta')).not.toContainText('~');
});
```

- [ ] **Step 10: Run the e2e spec**

Run: `bun run test:e2e -- inventory.spec.ts`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/lib/i18n/messages/fr.ts src/lib/i18n/messages/en.ts "src/routes/(app)/garde-manger/+page.server.ts" src/lib/components/ui/ItemRow.svelte "src/routes/(app)/item/[id]/+page.server.ts" "src/routes/(app)/item/[id]/+page.svelte" tests/e2e/fixtures/db.ts tests/e2e/inventory.spec.ts
git commit -m "feat(inventory): mark estimated dates with a ~ prefix"
```

---

## Task 5: Storage tip on item detail

**Files:**
- Modify: `src/lib/server/catalogue.ts` (add `tipForItem`)
- Test: `src/lib/server/catalogue.test.ts`
- Modify: `src/routes/(app)/item/[id]/+page.server.ts` (call `tipForItem`, return `tip`)
- Modify: `src/routes/(app)/item/[id]/+page.svelte` (render the tip line when present)

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/server/catalogue.test.ts`. Add `tipForItem` to the import from `./catalogue` (`foods` and `shelfLives` are already imported in this file). Add a self-contained block that seeds its own food + shelf-life rows (do NOT rely on the bundled seed, whose tip text may change):

```ts
describe('tipForItem', () => {
	let db: DB;
	const FID = 'food-tip-test';
	beforeEach(() => {
		db = makeDb();
		db.insert(foods)
			.values({
				id: FID,
				nameFr: 'Test',
				nameEn: 'Test',
				category: 'Test',
				defaultLocation: 'fridge'
			})
			.run();
	});

	function addShelfLife(opts: {
		location: 'pantry' | 'fridge' | 'freezer';
		basis: 'purchase' | 'opened' | 'unspecified';
		tipsFr: string | null;
		tipsEn: string | null;
	}) {
		db.insert(shelfLives)
			.values({
				id: crypto.randomUUID(),
				foodId: FID,
				location: opts.location,
				basis: opts.basis,
				min: 1,
				max: 2,
				unit: 'days',
				tipsFr: opts.tipsFr,
				tipsEn: opts.tipsEn
			})
			.run();
	}

	it('returns the localized tip for the matching location', () => {
		addShelfLife({ location: 'fridge', basis: 'purchase', tipsFr: 'Au frais', tipsEn: 'Keep cold' });
		expect(tipForItem(db, FID, 'fridge', 'en')).toBe('Keep cold');
		expect(tipForItem(db, FID, 'fridge', 'fr')).toBe('Au frais');
	});

	it('prefers the purchase-basis row over other bases', () => {
		addShelfLife({ location: 'fridge', basis: 'opened', tipsFr: 'O', tipsEn: 'Opened tip' });
		addShelfLife({ location: 'fridge', basis: 'purchase', tipsFr: 'A', tipsEn: 'Purchase tip' });
		expect(tipForItem(db, FID, 'fridge', 'en')).toBe('Purchase tip');
	});

	it('returns null when the location has no tip', () => {
		addShelfLife({ location: 'fridge', basis: 'purchase', tipsFr: null, tipsEn: null });
		expect(tipForItem(db, FID, 'fridge', 'en')).toBeNull();
		expect(tipForItem(db, FID, 'pantry', 'en')).toBeNull();
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test ./src/lib/server/catalogue.test.ts`
Expected: FAIL — `tipForItem is not a function`.

- [ ] **Step 3: Implement `tipForItem`**

In `src/lib/server/catalogue.ts`, add (it reuses the already-imported `eq`, `and`, `db` types, `foods`/`shelfLives`):

```ts
// ── tipForItem ─────────────────────────────────────────────────────────────────

/**
 * The storage tip to show for an inventory item, by its food + location.
 * Prefers the purchase-basis row (the basis estimates are computed from), then
 * any row with a tip. Returns the localized text, or null when none exists.
 */
export function tipForItem(
	db: DB,
	foodId: string,
	location: 'pantry' | 'fridge' | 'freezer',
	locale: 'fr' | 'en'
): string | null {
	const rows = db
		.select()
		.from(shelfLives)
		.where(and(eq(shelfLives.foodId, foodId), eq(shelfLives.location, location)))
		.all();

	const withTip = (r: ShelfLife) => (locale === 'fr' ? r.tipsFr : r.tipsEn);
	const preferred = rows.find((r) => r.basis === 'purchase' && withTip(r)) ?? rows.find((r) => withTip(r));
	return preferred ? (withTip(preferred) ?? null) : null;
}
```

`DB` is imported at the top of `catalogue.ts` as `type { DB } from './db/client'`; `ShelfLife` is the existing `typeof shelfLives.$inferSelect` alias declared in the file.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun test ./src/lib/server/catalogue.test.ts`
Expected: PASS.

- [ ] **Step 5: Call `tipForItem` from the item-detail load**

In `src/routes/(app)/item/[id]/+page.server.ts`:

Add `tipForItem` to the catalogue import (the file does not yet import from catalogue; add at the top with the other `$lib/server` imports):
```ts
import { tipForItem } from '$lib/server/catalogue';
```

Compute the tip after the name/category resolution block (it needs `item.foodId`, `item.location`, `locale`):
```ts
	const tip = item.foodId ? tipForItem(db, item.foodId, item.location, locale) : null;
```

Add `tip` to the returned payload (a sibling of `item`, not inside it):
```ts
	return {
		locale,
		tip,
		item: {
			// …unchanged…
		}
	};
```

- [ ] **Step 6: Render the tip on item detail**

In `src/routes/(app)/item/[id]/+page.svelte`:

Read it from `data` near the top `<script>` (after `const it = $derived(data.item);`):
```svelte
	const tip = $derived(data.tip);
```
Render it after the `{#if it.addedAt}…{/if}` block (before the `<Card>`):
```svelte
{#if tip}<p class="tip">💡 {tip}</p>{/if}
```
Add to `<style>`:
```css
	.tip {
		background: var(--surface-2);
		border-radius: 11px;
		padding: 0.6rem 0.8rem;
		margin: 0 0 1rem;
		font-size: 0.88rem;
		color: var(--text);
	}
```

- [ ] **Step 7: Type gate**

Run: `bun run check`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/server/catalogue.ts src/lib/server/catalogue.test.ts "src/routes/(app)/item/[id]/+page.server.ts" "src/routes/(app)/item/[id]/+page.svelte"
git commit -m "feat(item): show storage tip from the catalogue on item detail"
```

---

## Final verification

- [ ] **Full unit suite**

Run: `bun test ./src`
Expected: PASS.

- [ ] **Type + lint**

Run: `bun run check && bun run lint`
Expected: PASS (no unused `setStatus` import left behind).

- [ ] **Full e2e suite**

Run: `bun run test:e2e`
Expected: PASS.

- [ ] **Refresh the graphify graph** (per project CLAUDE.md, after modifying code)

Run: `graphify update .`

- [ ] **Final commit if anything was regenerated**

```bash
git add -A && git commit -m "chore: refresh graphify graph for Tier 1 inventory UX"
```
