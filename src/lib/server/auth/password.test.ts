import { test, expect } from 'bun:test';
import { hashPassword, verifyPassword } from './password';

// argon2id is memory-hard (~64MB per hash) and intentionally CPU-heavy. Under
// heavy parallel contention (e.g. CI), a single hash can exceed Bun's 5s default
// per-test timeout and flake. 20s survives observed worst-case (~4.5x) slowdown
// while still failing a genuine hang. Keep these timeouts on every hashing test.
const ARGON2_TIMEOUT_MS = 20_000;

test(
	'hashPassword returns a string different from the input',
	async () => {
		const hash = await hashPassword('correct horse');
		expect(typeof hash).toBe('string');
		expect(hash).not.toBe('correct horse');
	},
	ARGON2_TIMEOUT_MS
);

test(
	'verifyPassword returns true for the correct password',
	async () => {
		const hash = await hashPassword('correct horse');
		expect(await verifyPassword('correct horse', hash)).toBe(true);
	},
	ARGON2_TIMEOUT_MS
);

test(
	'verifyPassword returns false for a wrong password',
	async () => {
		const hash = await hashPassword('correct horse');
		expect(await verifyPassword('wrong', hash)).toBe(false);
	},
	ARGON2_TIMEOUT_MS
);

test('verifyPassword returns false (not throw) for a malformed hash', async () => {
	expect(await verifyPassword('whatever', 'not-a-valid-hash')).toBe(false);
});
