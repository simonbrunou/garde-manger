import { test, expect } from '@playwright/test';
import type { BrowserContext } from '@playwright/test';
import { mintSessionToken } from './db';

const BASE_URL = 'http://localhost:4173';

/** Authenticate an arbitrary seeded user on a context by minting a session cookie
 *  directly (no UI). The cookie is non-secure so it is sent over http://localhost. */
export async function loginAs(context: BrowserContext, userId: string): Promise<void> {
	const token = mintSessionToken(userId);
	await context.addCookies([
		{ name: 'gm_session', value: token, url: BASE_URL, httpOnly: true, sameSite: 'Lax' }
	]);
}

/** Set the active household cookie so the app scopes to a specific household. */
export async function setActiveHousehold(
	context: BrowserContext,
	householdId: string
): Promise<void> {
	await context.addCookies([
		{ name: 'gm_household', value: householdId, url: BASE_URL, httpOnly: true, sameSite: 'Lax' }
	]);
}

export { test, expect };
