import { test, expect, loginAs } from './fixtures/test';
import * as db from './fixtures/db';
import { randomUUID } from 'node:crypto';

// The `app` project ships a shared storageState (the primary user). The account
// spec mutates user-level settings (display name, locale, theme) and credentials,
// so it MUST NOT run on that shared identity. Drop the storageState here and
// create a fresh, isolated context + freshly-seeded user per test instead.
test.use({ storageState: { cookies: [], origins: [] } });

test('profile: update display name persists and language switch changes UI strings', async ({
	browser
}) => {
	const user = db.seedUser({ displayName: 'Original Name', locale: 'en' });
	const context = await browser.newContext();
	await loginAs(context, user.id);
	const page = await context.newPage();

	await page.goto('/account');
	// English page title proves the seeded user is in English to start.
	await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();

	const newName = `Renamed ${randomUUID().slice(0, 8)}`;
	await page.getByLabel('Display name').fill(newName);
	await page.getByRole('button', { name: 'Save' }).click();

	// Intended: success confirmation message after saving the profile.
	await expect(page.getByText('Profile updated.')).toBeVisible();

	// Intended: the new display name persists across a reload.
	await page.reload();
	await expect(page.getByLabel('Display name')).toHaveValue(newName);

	// Switch the language to Français and save.
	await page.getByLabel('Language').selectOption('fr');
	await page.getByRole('button', { name: 'Save' }).click();
	await expect(page.getByText('Profile updated.')).toBeVisible();

	// Intended: the UI now renders French strings. Assert the page title heading
	// which differs unambiguously between locales: "My account" -> "Mon compte".
	// (exact:true so "Profil" can't substring-match the English "Profile".)
	await page.reload();
	await expect(page.getByRole('heading', { name: 'Mon compte', exact: true })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Thème', exact: true })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Profil', exact: true })).toBeVisible();

	// The display name must still be the renamed value after the locale change.
	await expect(page.getByLabel('Nom affiché')).toHaveValue(newName);

	// Switch back to English (label is now French: "Langue", save is "Enregistrer").
	await page.getByLabel('Langue').selectOption('en');
	await page.getByRole('button', { name: 'Enregistrer' }).click();
	await expect(page.getByText('Profil mis à jour.')).toBeVisible();
	await page.reload();
	await expect(page.getByRole('heading', { name: 'My account', exact: true })).toBeVisible();

	await context.close();
});

test('theme: choosing Dark persists in the gm_theme cookie and the html data-theme attribute', async ({
	browser
}) => {
	const user = db.seedUser({ locale: 'en' });
	const context = await browser.newContext();
	await loginAs(context, user.id);
	const page = await context.newPage();

	await page.goto('/account');
	await page.getByRole('button', { name: 'Dark' }).click();

	// setTheme redirects back to /account; wait for the page to settle.
	await expect(page.getByRole('heading', { name: 'Theme' })).toBeVisible();

	// Intended: the theme choice persists in the gm_theme cookie as 'dark'.
	const cookies = await context.cookies();
	const themeCookie = cookies.find((c) => c.name === 'gm_theme');
	expect(themeCookie?.value).toBe('dark');

	// Intended: after navigation the document reflects the dark theme.
	await page.goto('/account');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

	await context.close();
});

test('passkey: a seeded credential appears and Delete removes it', async ({ browser }) => {
	const user = db.seedUser({ locale: 'en' });
	db.seedCredential({ userId: user.id, deviceLabel: 'My Test Passkey' });

	const context = await browser.newContext();
	await loginAs(context, user.id);
	const page = await context.newPage();

	await page.goto('/account');

	// Intended: the seeded passkey shows in the passkeys list.
	await expect(page.getByText('My Test Passkey')).toBeVisible();
	await expect(page.getByText('No passkeys registered.')).toHaveCount(0);

	// Delete it.
	await page.getByRole('button', { name: 'Delete' }).click();

	// Intended: after removal the list shows the empty-state message and there is
	// no credential left for that user.
	await expect(page.getByText('No passkeys registered.')).toBeVisible();
	await expect(page.getByText('My Test Passkey')).toHaveCount(0);

	// Verify via a fresh page load as well (no stale render).
	await page.goto('/account');
	await expect(page.getByText('No passkeys registered.')).toBeVisible();

	expect(db.getCredentialCount(user.id)).toBe(0);

	await context.close();
});

test('push: subscribe stores a subscription, unsubscribe is idempotent', async ({ browser }) => {
	const user = db.seedUser({ locale: 'en' });
	const context = await browser.newContext();
	await loginAs(context, user.id);
	const page = await context.newPage();
	// Establish the authenticated session on page.request by visiting an app page.
	await page.goto('/account');

	const endpoint = 'https://fcm.googleapis.com/fcm/send/e2e-' + randomUUID();
	const subscription = {
		endpoint,
		keys: {
			p256dh:
				'BABBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
			auth: 'YYYYYYYYYYYYYYYYYYYYYYYY'
		}
	};

	// Intended: a plausible https FCM endpoint with valid keys is accepted (200)
	// and the subscription is stored for this user.
	const subRes = await page.request.post('/api/push/subscribe', { data: subscription });
	expect(subRes.ok()).toBeTruthy();
	expect(subRes.status()).toBe(200);
	expect(db.getPushSubscriptionCount(user.id, endpoint)).toBe(1);

	// Intended: unsubscribing the same endpoint succeeds and removes the row.
	const unsub1 = await page.request.post('/api/push/unsubscribe', { data: { endpoint } });
	expect(unsub1.ok()).toBeTruthy();
	expect(unsub1.status()).toBe(200);
	expect(db.getPushSubscriptionCount(user.id, endpoint)).toBe(0);

	// Intended: a second unsubscribe of the same endpoint is idempotent (still ok).
	const unsub2 = await page.request.post('/api/push/unsubscribe', { data: { endpoint } });
	expect(unsub2.ok()).toBeTruthy();
	expect(unsub2.status()).toBe(200);

	await context.close();
});
