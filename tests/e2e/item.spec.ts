import { test, expect, setActiveHousehold } from './fixtures/test';
import * as db from './fixtures/db';
import { utcMidnight, isoDate } from './fixtures/dates';

// Dedicated household per spec run so concurrent specs do not interfere.
function freshHousehold() {
	const ownerId = db.getUserIdByEmail('primary@example.com');
	if (!ownerId) throw new Error('primary user missing');
	const { id } = db.seedHousehold(`item-spec-${crypto.randomUUID()}`, ownerId);
	return { householdId: id, ownerId };
}

test('Update: location + quantity + notes persist after Save and reload', async ({ page }) => {
	const { householdId, ownerId } = freshHousehold();
	const itemId = db.seedItem({
		householdId,
		addedBy: ownerId,
		customName: 'Update target',
		location: 'fridge',
		quantity: 1
	});
	await setActiveHousehold(page.context(), householdId);

	await page.goto(`/item/${itemId}`);

	// Change location, quantity, notes via the edit form, then Save.
	await page.getByLabel('Location').selectOption('pantry');
	const qty = page.getByLabel('Quantity');
	await qty.fill('5');
	const notes = page.getByLabel('Notes');
	await notes.fill('opened jar, finish this week');
	await page.getByRole('button', { name: 'Save' }).click();

	// After save the action redirects back to /item/<id>; reload to prove persistence.
	await page.waitForURL(`**/item/${itemId}`);
	await page.reload();

	await expect(page.getByLabel('Location')).toHaveValue('pantry');
	await expect(page.getByLabel('Quantity')).toHaveValue('5');
	await expect(page.getByLabel('Notes')).toHaveValue('opened jar, finish this week');

	// Confirm at the DB layer too.
	const row = db.getItem(itemId)!;
	expect(row.location).toBe('pantry');
	expect(row.quantity).toBe(5);
	expect(row.notes).toBe('opened jar, finish this week');
});

test('Date invariant: a Use-by (DLC) item keeps only use_by_date after Save', async ({ page }) => {
	const { householdId, ownerId } = freshHousehold();
	const itemId = db.seedItem({
		householdId,
		addedBy: ownerId,
		customName: 'DLC item',
		useByDate: utcMidnight(2),
		bestByDate: null
	});
	await setActiveHousehold(page.context(), householdId);

	await page.goto(`/item/${itemId}`);

	// The page renders a single date input (label "Use by") for a DLC item.
	const newDate = utcMidnight(10);
	await page.getByLabel('Use by').fill(isoDate(newDate));
	await page.getByRole('button', { name: 'Save' }).click();
	await page.waitForURL(`**/item/${itemId}`);

	// Intended invariant: exactly one of use_by_date / best_by_date is set, and for a
	// DLC item it must be use_by_date (best_by_date stays null).
	const row = db.getItem(itemId)!;
	const hasUseBy = row.use_by_date != null;
	const hasBestBy = row.best_by_date != null;
	expect(hasUseBy).toBe(true);
	expect(hasBestBy).toBe(false);
	expect(Number(hasUseBy) + Number(hasBestBy)).toBe(1);
	expect(row.use_by_date).toBe(Math.floor(newDate.getTime() / 1000));
});

test('Date invariant: a Best-before (DDM) item keeps only best_by_date after Save', async ({
	page
}) => {
	const { householdId, ownerId } = freshHousehold();
	const itemId = db.seedItem({
		householdId,
		addedBy: ownerId,
		customName: 'DDM item',
		useByDate: null,
		bestByDate: utcMidnight(3)
	});
	await setActiveHousehold(page.context(), householdId);

	await page.goto(`/item/${itemId}`);

	const newDate = utcMidnight(12);
	await page.getByLabel('Best before').fill(isoDate(newDate));
	await page.getByRole('button', { name: 'Save' }).click();
	await page.waitForURL(`**/item/${itemId}`);

	// Intended invariant: exactly one date column set, and it is best_by_date.
	const row = db.getItem(itemId)!;
	const hasUseBy = row.use_by_date != null;
	const hasBestBy = row.best_by_date != null;
	expect(hasBestBy).toBe(true);
	expect(hasUseBy).toBe(false);
	expect(Number(hasUseBy) + Number(hasBestBy)).toBe(1);
	expect(row.best_by_date).toBe(Math.floor(newDate.getTime() / 1000));
});

test('Consume makes the item terminal: it leaves the active list', async ({ page }) => {
	const { householdId, ownerId } = freshHousehold();
	const itemId = db.seedItem({
		householdId,
		addedBy: ownerId,
		customName: 'Eat me',
		quantity: 1
	});
	await setActiveHousehold(page.context(), householdId);

	await page.goto(`/item/${itemId}`);
	await page.getByRole('button', { name: 'Eaten' }).click();

	// Action redirects to the active garde-manger list; the item must no longer be active.
	await page.waitForURL('**/garde-manger');

	const activeIds = db.getActiveItems(householdId).map((r) => r.id);
	expect(activeIds).not.toContain(itemId);

	const row = db.getItem(itemId)!;
	expect(row.status).not.toBe('active');
});

test('Discard makes the item terminal: it leaves the active list', async ({ page }) => {
	const { householdId, ownerId } = freshHousehold();
	const itemId = db.seedItem({
		householdId,
		addedBy: ownerId,
		customName: 'Toss me',
		quantity: 1
	});
	await setActiveHousehold(page.context(), householdId);

	await page.goto(`/item/${itemId}`);
	await page.getByRole('button', { name: 'Tossed' }).click();

	await page.waitForURL('**/garde-manger');

	const activeIds = db.getActiveItems(householdId).map((r) => r.id);
	expect(activeIds).not.toContain(itemId);

	const row = db.getItem(itemId)!;
	expect(row.status).not.toBe('active');
});

test('Remove: two-step disclosure delete removes the row', async ({ page }) => {
	const { householdId, ownerId } = freshHousehold();
	const itemId = db.seedItem({
		householdId,
		addedBy: ownerId,
		customName: 'Delete me',
		quantity: 1
	});
	await setActiveHousehold(page.context(), householdId);

	await page.goto(`/item/${itemId}`);

	// Confirm button is inside a collapsed <details>; open the disclosure first.
	await page.getByText('Delete item', { exact: true }).click();
	await page.getByRole('button', { name: 'Confirm deletion' }).click();

	await page.waitForURL('**/garde-manger');

	expect(db.getItem(itemId)).toBeUndefined();
});

test('Quantity floored at 1: setting 0 must not persist 0', async ({ page }) => {
	const { householdId, ownerId } = freshHousehold();
	const itemId = db.seedItem({
		householdId,
		addedBy: ownerId,
		customName: 'Floor target',
		quantity: 3
	});
	await setActiveHousehold(page.context(), householdId);

	await page.goto(`/item/${itemId}`);

	// The quantity input has min=1; force a 0 to probe server-side flooring.
	const qty = page.getByLabel('Quantity');
	await qty.fill('0');
	await page.getByRole('button', { name: 'Save' }).click();
	await page.waitForURL(`**/item/${itemId}`);

	// Intended behavior: quantity is floored to at least 1 (0 must never persist).
	const row = db.getItem(itemId)!;
	expect(Number(row.quantity)).toBeGreaterThanOrEqual(1);
});
