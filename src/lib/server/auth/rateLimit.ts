/**
 * In-memory sliding-window limiter for FAILED auth attempts, keyed by a caller-
 * chosen string (login uses the normalized email). Single-instance deployment →
 * in-memory state is fine. Pure factory (no $env/$app) so it is unit-testable.
 */
export function createAttemptLimiter(opts: { maxAttempts: number; windowMs: number }) {
	const byKey = new Map<string, number[]>();
	const prune = (arr: number[], t: number) => {
		while (arr.length > 0 && arr[0] <= t - opts.windowMs) arr.shift();
		return arr;
	};
	return {
		/** true when the key has reached the failed-attempt cap within the window. */
		isLimited(key: string, now: Date): boolean {
			const arr = prune(byKey.get(key) ?? [], now.getTime());
			byKey.set(key, arr);
			return arr.length >= opts.maxAttempts;
		},
		/** record one failed attempt for the key. */
		record(key: string, now: Date): void {
			const arr = prune(byKey.get(key) ?? [], now.getTime());
			arr.push(now.getTime());
			byKey.set(key, arr);
		},
		/** clear the key's attempts (call on a successful login). */
		reset(key: string): void {
			byKey.delete(key);
		}
	};
}

/** Login: 10 failed attempts per rolling 10 min, keyed by normalized email. */
export const loginAttemptLimiter = createAttemptLimiter({ maxAttempts: 10, windowMs: 600_000 });
