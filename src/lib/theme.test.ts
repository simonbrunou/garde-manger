import { describe, it, expect } from 'bun:test';
import { resolveTheme, normalizeChoice, type ThemeChoice } from './theme';

describe('resolveTheme', () => {
	it('passes through explicit light and dark', () => {
		expect(resolveTheme('light')).toBe('light');
		expect(resolveTheme('dark')).toBe('dark');
	});

	it('maps auto / null / unknown to empty (auto)', () => {
		expect(resolveTheme('auto')).toBe('');
		expect(resolveTheme(null)).toBe('');
		expect(resolveTheme(undefined)).toBe('');
		expect(resolveTheme('purple')).toBe('');
	});

	it('normalizeChoice clamps to a valid ThemeChoice', () => {
		const valid: ThemeChoice[] = ['auto', 'light', 'dark'];
		for (const c of valid) expect(normalizeChoice(c)).toBe(c);
		expect(normalizeChoice('nonsense')).toBe('auto');
		expect(normalizeChoice(null)).toBe('auto');
	});
});
