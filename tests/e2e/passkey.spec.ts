import { test, expect, loginAs, setActiveHousehold } from './fixtures/test';
import * as db from './fixtures/db';
import { DatabaseSync } from 'node:sqlite';

// Passkey enroll -> usernameless login round-trip via a Chromium CDP virtual
// authenticator. No storageState: this project authenticates a freshly seeded
// passkey-only user (password_hash NULL) by minting a session cookie, enrolls a
// passkey on /account, logs out, then logs back in from /login using the resident
// credential the virtual authenticator now holds.
//
// Intended behavior (oracle + product intent):
//  - Enrolling a passkey adds it to the credential list on /account.
//  - After logging out, the passkey login button on /login authenticates the user
//    (usernameless / discoverable credential) and lands them on /garde-manger.
test('a user can enroll a passkey and then log in with it', async ({ page, context }) => {
	// Fresh passkey-only user (English locale) with their own household, so the
	// post-login landing on /garde-manger is not blocked by a missing household.
	const user = db.seedUser({ locale: 'en' });
	const hh = db.seedHousehold(`passkey-${crypto.randomUUID()}`, user.id);
	await loginAs(context, user.id);
	await setActiveHousehold(context, hh.id);

	// Attach a virtual authenticator BEFORE enrolling. Resident key + user
	// verification are required so the later usernameless login can discover it.
	const client = await context.newCDPSession(page);
	await client.send('WebAuthn.enable');
	const { authenticatorId } = await client.send('WebAuthn.addVirtualAuthenticator', {
		options: {
			protocol: 'ctap2',
			transport: 'internal',
			hasResidentKey: true,
			hasUserVerification: true,
			isUserVerified: true,
			automaticPresenceSimulation: true
		}
	});
	expect(authenticatorId).toBeTruthy();

	// --- Enroll ---------------------------------------------------------------
	await page.goto('/account');
	// No passkeys yet for this brand-new user.
	await expect(page.getByText('No passkeys registered.')).toBeVisible();

	await page.getByRole('button', { name: 'Ajouter une passkey' }).click();

	// Enrolling must add the passkey to the list (the component reloads the page on
	// success). Intended behavior: exactly one credential row now exists.
	const passkeyItems = page.locator('ul.passkey-list li');
	await expect(passkeyItems).toHaveCount(1);
	// And the empty-state message must be gone.
	await expect(page.getByText('No passkeys registered.')).toHaveCount(0);

	// The credential must actually be persisted for this user.
	await expect
		.poll(() => {
			// Direct DB read: a resident credential row should exist for the user.
			return countCredentialsForUser(user.id);
		})
		.toBe(1);

	// --- Log out --------------------------------------------------------------
	await page.getByRole('button', { name: 'Log out' }).click();
	// Logging out lands on the login page.
	await page.waitForURL('**/login');

	// --- Log in with the passkey (usernameless) -------------------------------
	await expect(page.getByRole('button', { name: 'Se connecter avec une passkey' })).toBeVisible();
	await page.getByRole('button', { name: 'Se connecter avec une passkey' }).click();

	// Verifying with the virtual authenticator must land the user on /garde-manger.
	await page.waitForURL('**/garde-manger');
	await expect(page).toHaveURL(/\/garde-manger$/);
});

/** Count persisted credentials for a user by reading the same SQLite file the
 *  server uses. Mirrors the test-side db helper's connection approach. */
function countCredentialsForUser(userId: string): number {
	// Use the same node:sqlite path the fixtures use.
	const DB_PATH = process.env.DATABASE_PATH ?? '.e2e/run.db';
	const d = new DatabaseSync(DB_PATH);
	try {
		d.exec('PRAGMA busy_timeout = 5000;');
		const row = d
			.prepare('SELECT COUNT(*) AS n FROM credentials WHERE user_id = ?')
			.get(userId) as { n: number };
		return row.n;
	} finally {
		d.close();
	}
}
