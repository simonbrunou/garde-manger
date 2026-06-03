/**
 * In-memory sliding-window limiter for FAILED auth attempts, keyed by a caller-
 * chosen string (login uses the normalized email). Single-instance deployment →
 * in-memory state is fine. Pure factory (no $env/$app) so it is unit-testable.
 */
export function createAttemptLimiter(opts: { maxAttempts: number; windowMs: number }) {
	const byKey = new Map<string, number[]>();
	// Return the key's in-window timestamps, dropping expired ones. Deletes the key
	// entirely when none remain so a flood of distinct keys (e.g. email enumeration)
	// can't grow the map without bound — only keys with a live failure are retained.
	const live = (key: string, t: number): number[] => {
		const arr = byKey.get(key);
		if (!arr) return [];
		while (arr.length > 0 && arr[0] <= t - opts.windowMs) arr.shift();
		if (arr.length === 0) byKey.delete(key);
		return arr;
	};
	return {
		/** true when the key has reached the failed-attempt cap within the window. */
		isLimited(key: string, now: Date): boolean {
			return live(key, now.getTime()).length >= opts.maxAttempts;
		},
		/** record one failed attempt for the key. */
		record(key: string, now: Date): void {
			const t = now.getTime();
			const arr = live(key, t);
			arr.push(t);
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
