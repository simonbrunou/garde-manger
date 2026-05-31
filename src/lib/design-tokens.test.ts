import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';

// app.css lives at src/app.css; this test is at src/lib/design-tokens.test.ts.
const css = readFileSync(new URL('../app.css', import.meta.url), 'utf8');

describe('HIG design tokens', () => {
	const typography = [
		'--text-large-title',
		'--text-title-1',
		'--text-title-2',
		'--text-title-3',
		'--text-headline',
		'--text-body',
		'--text-callout',
		'--text-subhead',
		'--text-footnote',
		'--text-caption-1',
		'--text-caption-2'
	];
	const semantic = ['--text-tertiary', '--separator', '--tint', '--fill-secondary', '--fill-tertiary'];
	const systemic = [
		'--material-bar',
		'--material-overlay',
		'--layout-margin',
		'--row-min-h',
		'--radius-grouped',
		'--ease-ios',
		'--dur-fast',
		'--dur',
		'--dur-sheet'
	];

	for (const token of [...typography, ...semantic, ...systemic]) {
		it(`defines ${token}`, () => {
			expect(css).toContain(`${token}:`);
		});
	}

	const utilities = ['.t-large-title', '.t-title-2', '.t-headline', '.t-body', '.t-subhead', '.t-footnote', '.t-caption'];
	for (const cls of utilities) {
		it(`defines utility class ${cls}`, () => {
			expect(css).toContain(cls);
		});
	}

	it('keeps the HIG button hierarchy', () => {
		for (const v of ['.btn-filled', '.btn-tinted', '.btn-gray', '.btn-plain']) {
			expect(css).toContain(v);
		}
	});
});
