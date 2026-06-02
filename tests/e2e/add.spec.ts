import { test, expect, setActiveHousehold } from './fixtures/test';
import * as db from './fixtures/db';

// The /add route lets a user add inventory items three ways: scanner, fresh-produce
// catalogue search, and free entry. These specs cover the catalogue-search ("fresh")
// and free-entry ("custom") flows. Oracle/intended behavior is taken from the i18n
// catalogue and product intent — NOT from the action implementation.

const PRIMARY_EMAIL = 'primary@example.com';

/** Seed a fresh, dedicated household owned by the primary user and scope the page to
 *  it, so concurrent specs cannot pollute the assertions. Returns the household id. */
async function freshHousehold(page: import('@playwright/test').Page): Promise<string> {
	const ownerId = db.getUserIdByEmail(PRIMARY_EMAIL)!;
	const { id } = db.seedHousehold(`add-spec-${crypto.randomUUID()}`, ownerId);
	await setActiveHousehold(page.context(), id);
	return id;
}

/** Search the fresh-produce catalogue and open the confirm view for the first hit.
 *  Tries a couple of common foods so the spec is resilient to catalogue content. */
async function openFirstFreshResult(page: import('@playwright/test').Page): Promise<string> {
	for (const term of ['apple', 'tomato', 'banana', 'carrot']) {
		await page.goto(`/add?q=${term}`);
		const search = page.getByLabel('Search for a food');
		await expect(search).toBeVisible();
		const firstResult = page.locator('ul.results li a').first();
		if (await firstResult.count()) {
			const name = (await firstResult.locator('span').first().innerText()).trim();
			await firstResult.click();
			// We are now on the focused confirm view.
			await expect(page.getByRole('button', { name: 'Add to pantry' })).toBeVisible();
			return name;
		}
	}
	throw new Error('No catalogue food found for any seed search term');
}

test.describe('add — fresh produce (catalogue)', () => {
	test('addFresh: search, pick Refrigerator, add to pantry → listed', async ({ page }) => {
		const hid = await freshHousehold(page);
		const foodName = await openFirstFreshResult(page);

		// Choose Refrigerator location. Option labels carry an estimate suffix
		// (e.g. "Refrigerator (≈ …)"), so select by the stable underlying value.
		await page.getByLabel('Location').selectOption('fridge');

		await page.getByRole('button', { name: 'Add to pantry' }).click();

		// Intended: redirect to the pantry list and the item appears.
		await page.waitForURL('**/garde-manger');
		await expect(page.getByText(foodName, { exact: false }).first()).toBeVisible();

		// And it exists as an active row in this household.
		const items = db.getActiveItems(hid);
		expect(items.length).toBe(1);
	});

	test('fresh form shows an editable estimated best-before', async ({ page }) => {
		await freshHousehold(page);
		await openFirstFreshResult(page);

		// The estimate note (amber box) explains the date is an editable estimate.
		const estimateBox = page.getByRole('note');
		await expect(estimateBox).toBeVisible();
		await expect(estimateBox).toContainText('Estimated best-before');
		// The "≈" prefix marks the estimate inside that box.
		await expect(estimateBox).toContainText('≈');

		// The best-before date field must be editable: present, enabled, type=date.
		const dateField = page.getByLabel('Best before (BBD)');
		await expect(dateField).toBeVisible();
		await expect(dateField).toBeEditable();
		await expect(dateField).toHaveAttribute('type', 'date');

		// Confirm it actually accepts a typed override value.
		await dateField.fill('2030-01-15');
		await expect(dateField).toHaveValue('2030-01-15');
	});

	test('fresh quantity defaults to 1 when left blank', async ({ page }) => {
		const hid = await freshHousehold(page);
		await openFirstFreshResult(page);

		// Clear the quantity field so nothing is submitted for it.
		const qty = page.getByLabel('Quantity');
		await qty.fill('');
		await expect(qty).toHaveValue('');

		await page.getByRole('button', { name: 'Add to pantry' }).click();
		await page.waitForURL('**/garde-manger');

		const items = db.getActiveItems(hid);
		expect(items.length).toBe(1);
		// Intended (i18n/product intent): a blank quantity defaults to 1.
		expect(items[0].quantity).toBe(1);
	});

	test('quantity 0 must not create an item (intent: ^[1-9]\\d*$)', async ({ page }) => {
		const hid = await freshHousehold(page);
		await openFirstFreshResult(page);

		const qty = page.getByLabel('Quantity');
		// Force quantity 0. Bypass the native min=1 constraint so the request actually
		// reaches the server, exercising the intended server-side validation.
		await qty.evaluate((el: HTMLInputElement) => {
			el.removeAttribute('min');
			el.value = '0';
		});
		await expect(qty).toHaveValue('0');

		await page.getByRole('button', { name: 'Add to pantry' }).click();

		// Give the server a moment to (not) create the row regardless of where it lands.
		await page.waitForLoadState('networkidle');

		// Intended: quantity 0 is invalid → NO active row may have quantity 0.
		const items = db.getActiveItems(hid);
		const zeroRows = items.filter((i) => i.quantity === 0);
		expect(zeroRows).toHaveLength(0);
	});
});

test.describe('add — free entry (custom)', () => {
	test('addCustom: name + location, no dates → added and listed', async ({ page }) => {
		const hid = await freshHousehold(page);
		const uniqueName = `Custom ${crypto.randomUUID().slice(0, 8)}`;

		await page.goto('/add');

		// Expand the "Free entry" method.
		await page.getByText('Free entry', { exact: true }).click();

		await page.getByLabel('Name').fill(uniqueName);
		// Custom form has its own Location select; pick Pantry.
		await page.locator('#custom-location').selectOption({ label: 'Pantry' });

		await page.getByRole('button', { name: 'Add', exact: true }).click();

		await page.waitForURL('**/garde-manger');
		await expect(page.getByText(uniqueName, { exact: false }).first()).toBeVisible();

		const items = db.getActiveItems(hid);
		expect(items.length).toBe(1);
		expect(items[0].custom_name).toBe(uniqueName);
	});
});
