import { describe, it, expect } from 'bun:test';
import { createOffRateLimiter } from './offRateLimit';
import { OffUnavailable } from './off';

describe('createOffRateLimiter', () => {
	it('allows up to maxPerWindow calls, then throws OffUnavailable', () => {
		const guard = createOffRateLimiter({ maxPerWindow: 3, windowMs: 60_000 });
		const t = new Date('2026-05-29T10:00:00.000Z');
		guard(t);
		guard(t);
		guard(t);
		expect(() => guard(t)).toThrow(OffUnavailable);
	});

	it('frees up slots once the window slides past old timestamps', () => {
		const guard = createOffRateLimiter({ maxPerWindow: 2, windowMs: 60_000 });
		const base = new Date('2026-05-29T10:00:00.000Z').getTime();
		guard(new Date(base));
		guard(new Date(base + 1000));
		// 3rd within the window → blocked
		expect(() => guard(new Date(base + 2000))).toThrow(OffUnavailable);
		// 61s later, the first two have aged out → allowed again
		expect(() => guard(new Date(base + 61_000))).not.toThrow();
	});

	it('does not count blocked attempts against the window', () => {
		const guard = createOffRateLimiter({ maxPerWindow: 1, windowMs: 10_000 });
		const base = new Date('2026-05-29T10:00:00.000Z').getTime();
		guard(new Date(base));
		expect(() => guard(new Date(base + 1000))).toThrow(); // blocked, not recorded
		// After the first ages out, a new call succeeds.
		expect(() => guard(new Date(base + 11_000))).not.toThrow();
	});
});
