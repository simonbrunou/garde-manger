import { test, expect } from './fixtures/test';
import * as db from './fixtures/db';

// auth.spec.ts — anon project (NO storageState, every test starts logged out).
// seedUser has no password, so password-login tests use a UI-created user.
// Assertions encode INTENDED behaviour from the oracle + the EN i18n catalogue.

const PASSWORD = 'Secret-passw0rd!';

/** Create a fresh unique-email user via the signup UI and return its email.
 *  Forces the stored locale to 'en' (signup defaults new users to 'fr', and
 *  hooks prioritise user.locale) so authenticated-page selectors match EN. */
async function signUpFreshUser(page: import('@playwright/test').Page): Promise<string> {
	const email = `auth-${crypto.randomUUID()}@example.com`;
	await page.goto('/signup');
	await page.getByLabel('Email address').fill(email);
	await page.getByLabel('Display name').fill('Auth Spec User');
	await page.getByLabel('Password').fill(PASSWORD);
	await page.getByRole('button', { name: 'Create my account' }).click();
	// Oracle 2: a successful signup redirects into the app at /garde-manger.
	await page.waitForURL('**/garde-manger');
	const userId = db.getUserIdByEmail(email);
	if (userId) db.setUserLocale(userId, 'en');
	return email;
}

test.describe('auth', () => {
	test('visiting an app route while logged out redirects to /login?redirectTo=<path>', async ({
		page
	}) => {
		// Oracle 1.
		await page.goto('/bilan');
		await expect(page).toHaveURL(/\/login\?redirectTo=%2Fbilan$/);
		await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
	});

	test('signup with a fresh email lands in the app and authenticates the user', async ({
		page
	}) => {
		// Oracle 2.
		await signUpFreshUser(page);
		await expect(page).toHaveURL(/\/garde-manger$/);
		// Authenticated: an app route loads without bouncing to /login.
		await page.goto('/account');
		await expect(page).toHaveURL(/\/account$/);
		const cookies = await page.context().cookies();
		expect(cookies.some((c) => c.name === 'gm_session')).toBeTruthy();
	});

	test('logout lands on /login and re-protects app routes', async ({ page }) => {
		// Oracle 3.
		await signUpFreshUser(page);

		await page.goto('/account');
		await page.getByRole('button', { name: 'Log out' }).click();
		await expect(page).toHaveURL(/\/login$/);

		// Revisiting an app route now redirects to login again.
		await page.goto('/bilan');
		await expect(page).toHaveURL(/\/login\?redirectTo=%2Fbilan$/);
	});

	test('login with a wrong password shows generic "Invalid credentials" and stays on /login', async ({
		page
	}) => {
		// Oracle 4 — no user enumeration: the message must be the generic one even
		// though the email exists, and the page must remain /login.
		const email = await signUpFreshUser(page);

		// Log out first so we exercise a clean login attempt.
		await page.goto('/account');
		await page.getByRole('button', { name: 'Log out' }).click();
		await expect(page).toHaveURL(/\/login$/);

		await page.goto('/login');
		await page.getByLabel('Email address').fill(email);
		await page.getByLabel('Password').fill('totally-wrong-password');
		await page.getByRole('button', { name: 'Log in' }).click();

		await expect(page.getByRole('alert')).toHaveText('Invalid credentials');
		await expect(page).toHaveURL(/\/login$/);
		const cookies = await page.context().cookies();
		expect(cookies.some((c) => c.name === 'gm_session')).toBeFalsy();
	});

	test('login with correct credentials reaches /garde-manger with a session cookie', async ({
		page
	}) => {
		// Oracle 5.
		const email = await signUpFreshUser(page);

		await page.goto('/account');
		await page.getByRole('button', { name: 'Log out' }).click();
		await expect(page).toHaveURL(/\/login$/);

		await page.goto('/login');
		await page.getByLabel('Email address').fill(email);
		await page.getByLabel('Password').fill(PASSWORD);
		await page.getByRole('button', { name: 'Log in' }).click();

		await page.waitForURL('**/garde-manger');
		const cookies = await page.context().cookies();
		expect(cookies.some((c) => c.name === 'gm_session')).toBeTruthy();
	});

	test('signup with an already-used email shows the "account already exists" error', async ({
		page
	}) => {
		// Oracle 6.
		const email = await signUpFreshUser(page);

		await page.goto('/account');
		await page.getByRole('button', { name: 'Log out' }).click();
		await expect(page).toHaveURL(/\/login$/);

		await page.goto('/signup');
		await page.getByLabel('Email address').fill(email);
		await page.getByLabel('Display name').fill('Duplicate User');
		await page.getByLabel('Password').fill(PASSWORD);
		await page.getByRole('button', { name: 'Create my account' }).click();

		await expect(page.getByRole('alert')).toHaveText('An account already exists with this email');
	});

	test('login rate limit: 10 failed attempts trigger the rate-limited message on the 11th', async ({
		page
	}) => {
		// Use a unique email that does not exist — user-not-found also records an attempt,
		// so we never need a real account to exercise the cap. Using a non-existent address
		// also means no interference from previous test runs' in-memory state (each unique
		// email starts fresh in the limiter).
		const email = `ratelimit-${crypto.randomUUID()}@example.com`;

		await page.goto('/login');

		// Submit 10 wrong-password attempts — each should return "Invalid credentials".
		for (let i = 0; i < 10; i++) {
			await page.getByLabel('Email address').fill(email);
			await page.getByLabel('Password').fill(`wrong-password-${i}`);
			await page.getByRole('button', { name: 'Log in' }).click();
			await expect(page.getByRole('alert')).toHaveText('Invalid credentials');
		}

		// 11th attempt: the rate limit cap has been reached — must show the rate-limited message.
		await page.getByLabel('Email address').fill(email);
		await page.getByLabel('Password').fill('wrong-again');
		await page.getByRole('button', { name: 'Log in' }).click();
		await expect(page.getByRole('alert')).toHaveText(
			'Too many attempts. Please wait a few minutes and try again.'
		);
		await expect(page).toHaveURL(/\/login$/);
	});

	test('rate limit: a different email is not affected by another address being limited', async ({
		page
	}) => {
		// Exhaust the cap for one address...
		const limitedEmail = `ratelimit-other-${crypto.randomUUID()}@example.com`;
		await page.goto('/login');
		for (let i = 0; i < 10; i++) {
			await page.getByLabel('Email address').fill(limitedEmail);
			await page.getByLabel('Password').fill(`wrong-${i}`);
			await page.getByRole('button', { name: 'Log in' }).click();
			await expect(page.getByRole('alert')).toHaveText('Invalid credentials');
		}

		// ...then verify a fresh address still gets the normal invalid-credentials response.
		const freshEmail = `ratelimit-fresh-${crypto.randomUUID()}@example.com`;
		await page.getByLabel('Email address').fill(freshEmail);
		await page.getByLabel('Password').fill('some-wrong-password');
		await page.getByRole('button', { name: 'Log in' }).click();
		await expect(page.getByRole('alert')).toHaveText('Invalid credentials');
	});
});
