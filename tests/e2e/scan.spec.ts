import { test, expect, setActiveHousehold } from './fixtures/test';
import * as db from './fixtures/db';
import { utcMidnight, isoDate } from './fixtures/dates';

const BARCODE = '3017620422003';
const PRODUCT_NAME = 'Test Spread';

// Pre-seed the OFF cache once so every scan lookup is a pure cache hit (no network).
test.beforeAll(() => {
	db.seedProduct({ barcode: BARCODE, name: PRODUCT_NAME, status: 'found' });
});

/** Own a dedicated household scoped to the primary user, then activate it. */
async function useDedicatedHousehold(context: Parameters<typeof setActiveHousehold>[0]) {
	const ownerId = db.getUserIdByEmail('primary@example.com')!;
	const { id } = db.seedHousehold(`scan-${crypto.randomUUID()}`, ownerId);
	await setActiveHousehold(context, id);
	return id;
}

test('manual entry rejects an invalid barcode and stays on /scan', async ({ page }) => {
	await useDedicatedHousehold(page.context());
	await page.goto('/scan');

	await page.getByLabel('Barcode (EAN / UPC)').fill('abc');
	await page.getByRole('button', { name: 'Look up' }).click();

	// Intended: invalid input is rejected with a message and we stay on /scan.
	await expect(page.getByText('Invalid barcode.')).toBeVisible();
	await expect(page).toHaveURL(/\/scan(\?|$)/);
	await expect(page).not.toHaveURL(new RegExp(`/scan/${BARCODE}`));
});

test('manual entry of a valid barcode navigates to the confirm page', async ({ page }) => {
	await useDedicatedHousehold(page.context());
	await page.goto('/scan');

	await page.getByLabel('Barcode (EAN / UPC)').fill(BARCODE);
	await page.getByRole('button', { name: 'Look up' }).click();

	await expect(page).toHaveURL(new RegExp(`/scan/${BARCODE}$`));
});

test('cache hit prefills the product name with no network', async ({ page }) => {
	await useDedicatedHousehold(page.context());
	await page.goto(`/scan/${BARCODE}`);

	// Intended: the OFF cache hit prefills the known product name.
	await expect(page.getByLabel('Product name')).toHaveValue(PRODUCT_NAME);
});

test('confirm without a use-by date is rejected with the DLC-required message', async ({
	page
}) => {
	await useDedicatedHousehold(page.context());
	await page.goto(`/scan/${BARCODE}`);

	// Bypass the browser's native required-field UI so the POST reaches the server,
	// which is what owns the "use-by date required" rule under test. (Test mechanics
	// only: we do NOT touch the date value, so the server still sees an empty DLC.)
	await page.evaluate(() => {
		const form = document.querySelector('form.confirm-form') as HTMLFormElement | null;
		form?.setAttribute('novalidate', '');
	});

	await page.getByRole('button', { name: 'Add to the pantry' }).click();

	// Intended: a packaged product requires a use-by date.
	await expect(page.getByText('A use-by date is required for a packaged product.')).toBeVisible();
});

test('confirm with a use-by date and location adds a packaged item and lists it', async ({
	page
}) => {
	const householdId = await useDedicatedHousehold(page.context());
	await page.goto(`/scan/${BARCODE}`);

	await expect(page.getByLabel('Product name')).toHaveValue(PRODUCT_NAME);

	const useBy = isoDate(utcMidnight(10));
	await page.getByLabel('Use-by date').fill(useBy);
	await page.getByLabel('Location').selectOption('pantry');

	await page.getByRole('button', { name: 'Add to the pantry' }).click();

	// Intended: success redirects to the pantry list.
	await expect(page).toHaveURL(/\/garde-manger(\?|$)/);

	// Intended: a packaged item carrying the scanned barcode now exists.
	const items = db.getActiveItems(householdId);
	const added = items.find((i) => i.barcode === BARCODE);
	expect(added, 'a packaged item with the scanned barcode should exist').toBeTruthy();
	expect(added!.kind).toBe('packaged');

	// Intended: the new item appears on the pantry list under its product name.
	await expect(page.getByText(PRODUCT_NAME).first()).toBeVisible();
});
