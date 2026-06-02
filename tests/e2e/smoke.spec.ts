import { test, expect } from '@playwright/test';

// Unauthenticated landing page must render. Proves the whole runtime model works:
// the production build ran, the adapter-node server booted on the pinned port, and a
// fresh DB migrated + auto-seeded the foods catalogue without crashing.
test('landing page renders for anonymous visitor', async ({ page }) => {
	const res = await page.goto('/');
	expect(res?.status()).toBeLessThan(400);
	await expect(page.getByText('Stop wasting food. Cook what you have.')).toBeVisible();
});
