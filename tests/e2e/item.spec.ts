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

test('Consume on a multi-unit item decrements quantity and stays on item page', async ({
	page
}) => {
	const { householdId, ownerId } = freshHousehold();
	const itemId = db.seedItem({
		householdId,
		addedBy: ownerId,
		customName: 'Multi-unit eat me',
		quantity: 2,
		useByDate: utcMidnight(7)
	});
	await setActiveHousehold(page.context(), householdId);

	await page.goto(`/item/${itemId}`);
	await page.getByRole('button', { name: 'Eaten' }).click();

	// A multi-unit decrement leaves the row active — must stay on the item page.
	await page.waitForURL(`**/item/${itemId}`);
	expect(page.url()).toContain(`/item/${itemId}`);

	// Quantity should now be 1 (decremented from 2).
	await expect(page.locator('input[name="quantity"]')).toHaveValue('1');
});

test('Mark as opened: re-dates the item from the opened-basis shelf life', async ({ page }) => {
	const { householdId, ownerId } = freshHousehold();

	// Seed a food with an opened-basis shelf life (fridge, 2–4 days)
	const foodId = `food-opened-${crypto.randomUUID()}`;
	db.seedFood({
		id: foodId,
		nameFr: 'Lait test',
		nameEn: 'Test Milk',
		category: 'Dairy',
		defaultLocation: 'fridge'
	});
	db.seedShelfLife({ foodId, location: 'fridge', basis: 'opened', min: 2, max: 4, unit: 'days' });

	// Seed an inventory item referencing that food (no date yet)
	const itemId = db.seedItem({ householdId, addedBy: ownerId, foodId, location: 'fridge' });

	await setActiveHousehold(page.context(), householdId);
	await page.goto(`/item/${itemId}`);

	// The "Mark as opened" button should be visible
	await expect(page.getByRole('button', { name: 'Mark as opened' })).toBeVisible();

	// Click it
	await page.getByRole('button', { name: 'Mark as opened' }).click();

	// Should redirect back to the same item page
	await page.waitForURL(`**/item/${itemId}`);

	// The item should now have a best_by_date set and is_estimate = 1
	const row = db.getItem(itemId)!;
	expect(row.best_by_date).not.toBeNull();
	expect(Number(row.is_estimate)).toBe(1);
	expect(row.use_by_date).toBeNull();

	// The estimate marker should be visible on the page
	await expect(page.locator('.est-note')).toBeVisible();
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

	// The quantity input has min=1; bypass the native constraint (as add.spec does) so
	// the 0 actually reaches the server and exercises its flooring (Math.max(1, …)).
	const qty = page.getByLabel('Quantity');
	await qty.evaluate((el: HTMLInputElement) => {
		el.removeAttribute('min');
		el.value = '0';
	});
	await expect(qty).toHaveValue('0');
	await page.getByRole('button', { name: 'Save' }).click();
	await page.waitForURL(`**/item/${itemId}`);

	// Intended: 0 is floored to 1 (never persisted as 0). The seed was 3, so a value of
	// exactly 1 also proves the form submitted (it wasn't blocked by native validation).
	const row = db.getItem(itemId)!;
	expect(Number(row.quantity)).toBe(1);
});

test('Editing an estimated item clears the ~ estimate marker', async ({ page }) => {
	const { householdId, ownerId } = freshHousehold();
	const itemId = db.seedItem({
		householdId,
		addedBy: ownerId,
		customName: 'Estimated yogurt',
		bestByDate: new Date(Date.now() + 3 * 86_400_000),
		isEstimate: true
	});
	await setActiveHousehold(page.context(), householdId);
	await page.goto(`/item/${itemId}`);

	// An estimated date shows the "~ estimated" caption.
	await expect(page.locator('.est-note')).toBeVisible();

	// Saving the edit form makes the date user-controlled — the estimate marker clears.
	await page.getByRole('button', { name: 'Save' }).click();
	await page.waitForURL(`**/item/${itemId}`);

	await expect(page.locator('.est-note')).toHaveCount(0);
	expect(Number(db.getItem(itemId)!.is_estimate)).toBe(0);
});
