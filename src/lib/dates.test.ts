import { describe, it, expect } from 'bun:test';
import { dayBadge, formatDayBadge } from './dates';

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

// Minimal stand-in for the three Messages keys formatDayBadge reads.
const T = { day_today: 'Today', day_unit: 'd', day_overdue: 'Overdue' };

describe('formatDayBadge', () => {
	it('null days → infinity glyph', () => {
		expect(formatDayBadge(null, T)).toEqual({ text: '∞', aria: '∞' });
	});
	it('zero days → today', () => {
		expect(formatDayBadge(0, T)).toEqual({ text: 'Today', aria: 'Today' });
	});
	it('positive days → "N d"', () => {
		expect(formatDayBadge(3, T)).toEqual({ text: '3 d', aria: '3 d' });
	});
	it('negative days → overdue count text + spelled-out aria', () => {
		expect(formatDayBadge(-2, T)).toEqual({ text: '-2', aria: '2 d, Overdue' });
	});
});
