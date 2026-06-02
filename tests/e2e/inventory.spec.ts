import { test, expect, setActiveHousehold } from './fixtures/test';
import * as db from './fixtures/db';
import { utcMidnight } from './fixtures/dates';
import { randomUUID } from 'node:crypto';

// Inventory list (/garde-manger) — bands, boundaries, sort/null ordering, day
// badges, location filter, and consume-from-list. Each scenario gets its OWN
// dedicated household (warnDays default 3) so concurrent specs and other bands
// never cross-contaminate. All assertions encode INTENDED behaviour from the
// oracle + EN i18n catalogue.

const PRIMARY_EMAIL = 'primary@example.com';

// EN i18n strings (src/lib/i18n/messages/en.ts).
const BAND = {
	urgent: 'Consume soon',
	soon: 'Coming up',
	ok: 'Still good'
};
const LOC = {
	fridge: 'Refrigerator',
	pantry: 'Pantry'
};
const BADGE = {
	overdue: 'Overdue',
	today: 'Today'
};

function ownerId(): string {
	const id = db.getUserIdByEmail(PRIMARY_EMAIL);
	if (!id) throw new Error('primary user not seeded');
	return id;
}

/** Create a dedicated household, owned by the primary user, and scope the page to it. */
async function dedicatedHousehold(page: import('@playwright/test').Page): Promise<string> {
	const { id } = db.seedHousehold(`inv-${randomUUID()}`, ownerId());
	await setActiveHousehold(page.context(), id);
	return id;
}

/** The <section> whose band heading carries the given band label. */
function bandSection(page: import('@playwright/test').Page, label: string) {
	return page.locator('section.band').filter({ has: page.getByRole('heading', { name: label }) });
}

test('bands: past / near / far items land in the correct expiry band', async ({ page }) => {
	const hid = await dedicatedHousehold(page);
	const oid = ownerId();
	const nameA = `A-${randomUUID()}`;
	const nameB = `B-${randomUUID()}`;
	const nameC = `C-${randomUUID()}`;

	db.seedItem({ householdId: hid, addedBy: oid, customName: nameA, useByDate: utcMidnight(-1) });
	db.seedItem({ householdId: hid, addedBy: oid, customName: nameB, useByDate: utcMidnight(2) });
	db.seedItem({ householdId: hid, addedBy: oid, customName: nameC, useByDate: utcMidnight(30) });

	await page.goto('/garde-manger');

	// A (past) -> "Consume soon"; B (+2) -> "Coming up"; C (+30) -> "Still good".
	await expect(bandSection(page, BAND.urgent).getByText(nameA)).toBeVisible();
	await expect(bandSection(page, BAND.soon).getByText(nameB)).toBeVisible();
	await expect(bandSection(page, BAND.ok).getByText(nameC)).toBeVisible();
});

test('boundary: today+warnDays is "soon", one day further is "still good"', async ({ page }) => {
	const hid = await dedicatedHousehold(page);
	const oid = ownerId();
	const onEdge = `edge-${randomUUID()}`; // exactly today + warnDays(3)
	const past = `past-${randomUUID()}`; // today + warnDays + 1

	db.seedItem({ householdId: hid, addedBy: oid, customName: onEdge, useByDate: utcMidnight(3) });
	db.seedItem({ householdId: hid, addedBy: oid, customName: past, useByDate: utcMidnight(4) });

	await page.goto('/garde-manger');

	// +3 is the last day still counted as "soon"; +4 falls into "still good".
	await expect(bandSection(page, BAND.soon).getByText(onEdge)).toBeVisible();
	await expect(bandSection(page, BAND.ok).getByText(past)).toBeVisible();
});

test('sort: nearer dates first, undated items last', async ({ page }) => {
	const hid = await dedicatedHousehold(page);
	const oid = ownerId();
	const far = `far-${randomUUID()}`; // +5
	const near = `near-${randomUUID()}`; // +1
	const undated = `undated-${randomUUID()}`; // no date

	db.seedItem({ householdId: hid, addedBy: oid, customName: far, useByDate: utcMidnight(5) });
	db.seedItem({ householdId: hid, addedBy: oid, customName: near, useByDate: utcMidnight(1) });
	db.seedItem({ householdId: hid, addedBy: oid, customName: undated, useByDate: null });

	await page.goto('/garde-manger');

	// Read every item name in document order across all bands.
	const names = await page.locator('section.band .name').allInnerTexts();
	const idxNear = names.indexOf(near);
	const idxFar = names.indexOf(far);
	const idxUndated = names.indexOf(undated);

	expect(idxNear).toBeGreaterThanOrEqual(0);
	expect(idxFar).toBeGreaterThanOrEqual(0);
	expect(idxUndated).toBeGreaterThanOrEqual(0);

	// Nearer date sorts before the further date.
	expect(idxNear).toBeLessThan(idxFar);
	// Undated item sorts LAST of the three.
	expect(idxUndated).toBeGreaterThan(idxNear);
	expect(idxUndated).toBeGreaterThan(idxFar);
	// And it is the very last row on the page.
	expect(idxUndated).toBe(names.length - 1);
});

test('day badge: overdue / today / N days', async ({ page }) => {
	const hid = await dedicatedHousehold(page);
	const oid = ownerId();
	const overdue = `od-${randomUUID()}`;
	const today = `td-${randomUUID()}`;
	const twoDays = `2d-${randomUUID()}`;

	db.seedItem({ householdId: hid, addedBy: oid, customName: overdue, useByDate: utcMidnight(-1) });
	db.seedItem({ householdId: hid, addedBy: oid, customName: today, useByDate: utcMidnight(0) });
	db.seedItem({ householdId: hid, addedBy: oid, customName: twoDays, useByDate: utcMidnight(2) });

	await page.goto('/garde-manger');

	const rowFor = (name: string) =>
		page.locator('section.band .row').filter({ has: page.getByText(name) });

	// Past item -> accessible "Overdue" badge.
	await expect(rowFor(overdue).getByLabel(BADGE.overdue)).toBeVisible();
	// Item due today -> "Today".
	await expect(rowFor(today).getByLabel(BADGE.today)).toBeVisible();
	// Item due in two days -> "2 d".
	await expect(rowFor(twoDays).getByText('2 d')).toBeVisible();
});

test('location filter: Refrigerator shows only fridge items', async ({ page }) => {
	const hid = await dedicatedHousehold(page);
	const oid = ownerId();
	const fridgeItem = `fr-${randomUUID()}`;
	const pantryItem = `pa-${randomUUID()}`;

	db.seedItem({
		householdId: hid,
		addedBy: oid,
		customName: fridgeItem,
		location: 'fridge',
		useByDate: utcMidnight(2)
	});
	db.seedItem({
		householdId: hid,
		addedBy: oid,
		customName: pantryItem,
		location: 'pantry',
		useByDate: utcMidnight(2)
	});

	await page.goto('/garde-manger');

	// Both visible under the default "All" filter.
	await expect(page.getByText(fridgeItem)).toBeVisible();
	await expect(page.getByText(pantryItem)).toBeVisible();

	// Activate the Refrigerator filter tab.
	await page.getByRole('tab', { name: LOC.fridge }).click();
	await page.waitForURL('**/garde-manger?location=fridge');

	await expect(page.getByText(fridgeItem)).toBeVisible();
	await expect(page.getByText(pantryItem)).toHaveCount(0);
});

test('consume from the list removes the item from the active list', async ({ page }) => {
	const hid = await dedicatedHousehold(page);
	const oid = ownerId();
	const name = `eat-${randomUUID()}`;
	// Urgent (past) so the inline "Eaten" button is shown without needing focus.
	const id = db.seedItem({
		householdId: hid,
		addedBy: oid,
		customName: name,
		useByDate: utcMidnight(-1)
	});

	await page.goto('/garde-manger');
	await expect(page.getByText(name)).toBeVisible();

	const row = page.locator('section.band .row').filter({ has: page.getByText(name) });
	// Submit the real consume form via its inline button (the no-JS/form path, not a
	// swipe gesture). It POSTs and 303-redirects back to /garde-manger. Register the
	// response wait BEFORE the click (a post-click waitForURL is a no-op here — the URL
	// already matches /garde-manger — and could resolve before the round-trip).
	const consumed = page.waitForResponse(
		(r) => r.request().method() === 'POST' && r.url().includes('/garde-manger')
	);
	await row.getByRole('button', { name: 'Eaten' }).click();
	await consumed;

	// The redirect lands on a fresh list; the consumed item is gone from it.
	await expect(page.getByText(name)).toHaveCount(0);

	// And the DB confirms it is no longer active.
	const active = db.getActiveItems(hid).map((r) => r.id as string);
	expect(active).not.toContain(id);
});
