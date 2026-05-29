import { describe, it, expect } from 'bun:test';
import { dayBadge } from './dates';

const NOW = new Date('2026-05-29T10:00:00Z');

describe('dayBadge', () => {
	it('null date → infinity, no days', () => {
		expect(dayBadge(null, NOW)).toEqual({ label: '∞', days: null });
	});
	it('today or past → 0 days', () => {
		expect(dayBadge('2026-05-29T00:00:00Z', NOW).days).toBe(0);
		expect(dayBadge('2026-05-20T00:00:00Z', NOW).days).toBe(-9);
	});
	it('future → positive day count', () => {
		expect(dayBadge('2026-05-30T00:00:00Z', NOW).days).toBe(1);
		expect(dayBadge('2026-06-03T00:00:00Z', NOW).days).toBe(5);
	});
});
