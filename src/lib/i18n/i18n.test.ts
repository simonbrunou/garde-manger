import { test, expect, describe } from 'bun:test';
import { fr } from './messages/fr';
import { en } from './messages/en';
import { resolveLocale, m } from './index';

describe('resolveLocale', () => {
	test('user locale takes priority over cookie', () => {
		expect(resolveLocale({ userLocale: 'en', cookie: 'fr' })).toBe('en');
	});

	test('cookie takes priority over accept-language', () => {
		expect(resolveLocale({ cookie: 'en', acceptLanguage: 'fr-FR,fr;q=0.9' })).toBe('en');
	});

	test('accept-language "en" → en', () => {
		expect(resolveLocale({ acceptLanguage: 'en-US,en;q=0.9' })).toBe('en');
	});

	test('accept-language "en" (bare) → en', () => {
		expect(resolveLocale({ acceptLanguage: 'en' })).toBe('en');
	});

	test('accept-language "fr" → fr', () => {
		expect(resolveLocale({ acceptLanguage: 'fr-FR' })).toBe('fr');
	});

	test('defaults to fr when nothing matches', () => {
		expect(resolveLocale({})).toBe('fr');
	});

	test('defaults to fr for unknown accept-language', () => {
		expect(resolveLocale({ acceptLanguage: 'de-DE' })).toBe('fr');
	});

	test('null userLocale falls through to cookie', () => {
		expect(resolveLocale({ userLocale: null, cookie: 'en' })).toBe('en');
	});

	test('null cookie falls through to accept-language', () => {
		expect(resolveLocale({ userLocale: null, cookie: null, acceptLanguage: 'en' })).toBe('en');
	});
});

describe('message key parity', () => {
	test('en has exactly the same keys as fr', () => {
		expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort());
	});
});

describe('fr/en parity', () => {
	test('both locales define the same keys', () => {
		expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort());
	});
});

describe('m()', () => {
	test('returns fr messages for "fr"', () => {
		expect(m('fr').nav_home).toBe('Garde-manger');
	});

	test('returns en messages for "en"', () => {
		expect(m('en').nav_home).toBe('Pantry');
	});
});
