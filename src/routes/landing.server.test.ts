import { test, expect, describe } from 'bun:test';
import { load } from './+page.server';

// The route's `load` uses redirect()/returns locale based on auth state.
// We call it with a minimal fake event (only `locals` and `url` are read).
const call = (locals: unknown, url: URL = new URL('https://manger.example.com/')) =>
	(load as unknown as (e: { locals: unknown; url: URL }) => unknown)({ locals, url });

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

	test('returns locale + origin for an anonymous visitor', async () => {
		const result = await call({ user: null, locale: 'en' });
		expect(result).toEqual({
			locale: 'en',
			origin: 'https://manger.example.com',
			langParam: null
		});
	});

	test('surfaces a valid ?lang override as langParam', async () => {
		const result = await call(
			{ user: null, locale: 'en' },
			new URL('https://manger.example.com/?lang=en')
		);
		expect(result).toEqual({
			locale: 'en',
			origin: 'https://manger.example.com',
			langParam: 'en'
		});
	});

	test('ignores an invalid ?lang value', async () => {
		const result = await call(
			{ user: null, locale: 'fr' },
			new URL('https://manger.example.com/?lang=de')
		);
		expect(result).toEqual({
			locale: 'fr',
			origin: 'https://manger.example.com',
			langParam: null
		});
	});
});
