import { test, expect, describe } from 'bun:test';
import { load } from './+page.server';

// The route's `load` uses redirect()/returns locale based on auth state.
// We call it with a minimal fake event (only `locals` is read).
const call = (locals: unknown) => (load as unknown as (e: { locals: unknown }) => unknown)({ locals });

describe('landing page load', () => {
	test('redirects a logged-in user to /garde-manger', async () => {
		let thrown: { status?: number; location?: string } | undefined;
		try {
			await call({ user: { id: 'u1' }, locale: 'fr' });
		} catch (e) {
			thrown = e as { status?: number; location?: string };
		}
		expect(thrown).toBeDefined();
		expect(thrown?.status).toBe(303);
		expect(thrown?.location).toBe('/garde-manger');
	});

	test('returns the locale for an anonymous visitor', async () => {
		const result = await call({ user: null, locale: 'en' });
		expect(result).toEqual({ locale: 'en' });
	});
});
