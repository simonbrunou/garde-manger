import { test, expect } from './fixtures/test';
import * as db from './fixtures/db';

// Deterministic food + shelf_life data seeded before tests run.
const FOOD_ID = `food_e2e_beurre_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
const FOOD_NAME_EN = 'E2E Butter Test';
const FOOD_NAME_FR = 'E2E Beurre Test';

test.beforeAll(() => {
	db.seedFood({
		id: FOOD_ID,
		nameFr: FOOD_NAME_FR,
		nameEn: FOOD_NAME_EN,
		category: 'Dairy',
		defaultLocation: 'fridge'
	});
	// pantry purchase: 1–7 days, no tip
	db.seedShelfLife({
		foodId: FOOD_ID,
		location: 'pantry',
		basis: 'purchase',
		min: 1,
		max: 7,
		unit: 'days'
	});
	// fridge opened: 2–4 weeks, with tips
	db.seedShelfLife({
		foodId: FOOD_ID,
		location: 'fridge',
		basis: 'opened',
		min: 2,
		max: 4,
		unit: 'weeks',
		tipsFr: 'Conseil conservation beurre',
		tipsEn: 'Keep butter wrapped in fridge'
	});
});

test.describe('encore-bon — shelf-life lookup', () => {
	test('bottom nav shows "Still good?" tab and navigates to /encore-bon', async ({ page }) => {
		await page.goto('/garde-manger');
		const tab = page.getByRole('link', { name: 'Still good?' });
		await expect(tab).toBeVisible();
		await tab.click();
		await page.waitForURL('**/encore-bon');
		await expect(page.getByRole('heading', { name: 'Still good?' })).toBeVisible();
	});

	test('searching the seeded food shows it in results', async ({ page }) => {
		await page.goto('/encore-bon');
		await page.getByLabel('Search for a food').fill('E2E Butter');
		await page.getByRole('button', { name: 'Search' }).click();
		await page.waitForURL(/q=E2E/);
		await expect(page.getByRole('link', { name: FOOD_NAME_EN })).toBeVisible();
	});

	test('clicking a result shows the shelf-life guide with localized keeps and disclaimer', async ({
		page
	}) => {
		// Navigate directly with the food selected so we bypass search latency.
		await page.goto(
			`/encore-bon?q=${encodeURIComponent('E2E Butter')}&food=${encodeURIComponent(FOOD_ID)}`
		);

		// Food name appears as the card heading.
		await expect(page.getByRole('heading', { name: FOOD_NAME_EN })).toBeVisible();

		// The fridge / opened row should show "Keeps 2–4 weeks".
		await expect(page.getByText('Keeps 2–4 weeks')).toBeVisible();

		// The tip for the opened fridge row should appear.
		await expect(page.getByText('Keep butter wrapped in fridge')).toBeVisible();

		// The disclaimer must be present.
		await expect(
			page.getByText('Estimated date — not a food-safety guarantee', { exact: false })
		).toBeVisible();
	});

	test('garbage search shows no-results message', async ({ page }) => {
		await page.goto('/encore-bon?q=xyznonexistent999abc');
		await expect(page.getByText('No results.')).toBeVisible();
	});
});
