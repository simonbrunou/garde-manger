import { test, expect } from '@playwright/test';
import { BASE_URL, CRON_SECRET } from './fixtures/constants';

// Mirrors the Coolify "daily reminder push" task (DEPLOY.md §6): a server-side
// curl POST with no body and no Origin header. Plain Node fetch, not Playwright's
// `request` fixture, so no browser-style Origin is attached.
const CRON_URL = `${BASE_URL}/internal/cron/check-expiry`;

test('cron trigger with a JSON content-type reaches the endpoint', async () => {
	const res = await fetch(CRON_URL, {
		method: 'POST',
		headers: { 'x-cron-secret': CRON_SECRET, 'content-type': 'application/json' }
	});
	expect(res.status).toBe(200);
	expect(await res.json()).toEqual({
		usersNotified: expect.any(Number),
		devicesSent: expect.any(Number),
		pruned: expect.any(Number),
		failed: expect.any(Number),
		skipped: expect.any(Number)
	});
});

// SvelteKit 3 treats a POST with no content-type and no Origin as a cross-site
// form submission; this is why the task command must send a content-type.
test('cron trigger without a content-type is rejected by the CSRF guard', async () => {
	const res = await fetch(CRON_URL, {
		method: 'POST',
		headers: { 'x-cron-secret': CRON_SECRET }
	});
	expect(res.status).toBe(403);
});
