import { test as setup, expect } from '@playwright/test';
import { getUserIdByEmail, setUserLocale } from './fixtures/db';

const STORAGE = 'tests/e2e/.auth/user.json';

export const PRIMARY = {
	email: 'primary@example.com',
	password: 'Primary-passw0rd!',
	name: 'Primary User'
};

setup('authenticate primary user', async ({ page }) => {
	// Sign up through the real form (also covers the signup happy path). Idempotent:
	// if the email already exists (reused server), fall back to logging in.
	await page.goto('/signup');
	await page.getByLabel('Email address').fill(PRIMARY.email);
	await page.getByLabel('Display name').fill(PRIMARY.name);
	await page.getByLabel('Password').fill(PRIMARY.password);
	await page.getByRole('button', { name: 'Create my account' }).click();

	const signedUp = await page
		.waitForURL('**/garde-manger', { timeout: 5000 })
		.then(() => true)
		.catch(() => false);
	if (!signedUp) {
		await page.goto('/login');
		await page.getByLabel('Email address').fill(PRIMARY.email);
		await page.getByLabel('Password').fill(PRIMARY.password);
		await page.getByRole('button', { name: 'Log in' }).click();
		await page.waitForURL('**/garde-manger');
	}

	// Force English so authenticated-page selectors match the EN i18n catalogue
	// (signup defaults new users to 'fr'; user.locale wins over cookies in hooks).
	const userId = getUserIdByEmail(PRIMARY.email);
	if (userId) setUserLocale(userId, 'en');

	// Ensure the user has an active household (create one if none exists yet).
	await page.goto('/households');
	if ((await page.locator('.household-list li').count()) === 0) {
		await page.getByLabel('Household name').fill('Primary Home');
		await page.getByRole('button', { name: 'Create' }).click();
		await page.waitForURL('**/households');
	}

	const cookies = await page.context().cookies();
	expect(cookies.some((c) => c.name === 'gm_session')).toBeTruthy();
	await page.context().storageState({ path: STORAGE });
});
