import { test, expect, describe } from 'bun:test';
import { createAttemptLimiter } from './rateLimit';

const WINDOW = 60_000; // 1 min window for tests
const MAX = 5;

describe('createAttemptLimiter', () => {
	test('under cap: not limited before max attempts are recorded', () => {
		const limiter = createAttemptLimiter({ maxAttempts: MAX, windowMs: WINDOW });
		const now = new Date();
		// Record MAX-1 failures — must still be allowed through.
		for (let i = 0; i < MAX - 1; i++) {
			limiter.record('user@example.com', now);
		}
		expect(limiter.isLimited('user@example.com', now)).toBe(false);
	});

	test('exactly maxAttempts failures → limited', () => {
		const limiter = createAttemptLimiter({ maxAttempts: MAX, windowMs: WINDOW });
		const now = new Date();
		for (let i = 0; i < MAX; i++) {
			limiter.record('user@example.com', now);
		}
		expect(limiter.isLimited('user@example.com', now)).toBe(true);
	});

	test('attempts older than the window are dropped and no longer count', () => {
		const limiter = createAttemptLimiter({ maxAttempts: MAX, windowMs: WINDOW });
		const t0 = new Date(1_000_000);
		// Record MAX attempts at t0 → should be limited at t0.
		for (let i = 0; i < MAX; i++) {
			limiter.record('user@example.com', t0);
		}
		expect(limiter.isLimited('user@example.com', t0)).toBe(true);

		// Advance time past the window — old entries must be pruned.
		const t1 = new Date(t0.getTime() + WINDOW + 1);
		expect(limiter.isLimited('user@example.com', t1)).toBe(false);
	});

	test('reset clears the key so the user is no longer limited', () => {
		const limiter = createAttemptLimiter({ maxAttempts: MAX, windowMs: WINDOW });
		const now = new Date();
		for (let i = 0; i < MAX; i++) {
			limiter.record('user@example.com', now);
		}
		expect(limiter.isLimited('user@example.com', now)).toBe(true);

		limiter.reset('user@example.com');
		expect(limiter.isLimited('user@example.com', now)).toBe(false);
	});

	test('two different keys are tracked independently', () => {
		const limiter = createAttemptLimiter({ maxAttempts: MAX, windowMs: WINDOW });
		const now = new Date();
		// Exhaust one key.
		for (let i = 0; i < MAX; i++) {
			limiter.record('alice@example.com', now);
		}
		expect(limiter.isLimited('alice@example.com', now)).toBe(true);
		// Other key is unaffected.
		expect(limiter.isLimited('bob@example.com', now)).toBe(false);
	});
});
