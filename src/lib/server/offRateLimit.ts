import { OffUnavailable } from './off';

/**
 * In-memory sliding-window limiter for OUTBOUND Open Food Facts product calls.
 *
 * The whole server is a single IP to OFF, which rate-limits ~15 product
 * reads/min/IP. A single (semi-trusted) household member iterating distinct
 * uncached barcodes could otherwise exhaust that budget and break scanning for
 * every household. This guard caps live OFF calls comfortably under the limit;
 * when exceeded it throws {@link OffUnavailable}, so the scan flow degrades to
 * manual entry instead of hammering OFF.
 *
 * Single-instance deployment (single SQLite writer) → in-memory state is fine.
 * Pure module (no $env/$app) so it is unit-testable via the factory.
 */
export function createOffRateLimiter(opts: { maxPerWindow: number; windowMs: number }) {
	const timestamps: number[] = [];
	return function guard(now: Date): void {
		const t = now.getTime();
		// Drop timestamps older than the window.
		while (timestamps.length > 0 && timestamps[0] <= t - opts.windowMs) {
			timestamps.shift();
		}
		if (timestamps.length >= opts.maxPerWindow) {
			throw new OffUnavailable('Open Food Facts rate limit reached — try again shortly');
		}
		timestamps.push(t);
	};
}

/** Shared app instance: 12 live OFF calls per rolling 60s (headroom under OFF's ~15/min). */
export const offRateLimitGuard = createOffRateLimiter({ maxPerWindow: 12, windowMs: 60_000 });

/**
 * Per-actor sliding-window limiter, applied IN FRONT of the global one so a
 * single member cannot consume the whole shared OFF budget and starve scanning
 * for everyone. State is keyed by userId; memory is bounded by the active-user
 * count (single-instance deployment).
 */
export function createPerUserOffRateLimiter(opts: { maxPerWindow: number; windowMs: number }) {
	const byUser = new Map<string, number[]>();
	return function guard(userId: string, now: Date): void {
		const t = now.getTime();
		const arr = byUser.get(userId) ?? [];
		while (arr.length > 0 && arr[0] <= t - opts.windowMs) arr.shift();
		if (arr.length >= opts.maxPerWindow) {
			throw new OffUnavailable('Open Food Facts rate limit reached — try again shortly');
		}
		arr.push(t);
		byUser.set(userId, arr);
	};
}

/** Each user: 6 live OFF calls per rolling 60s — one actor can't drain the global 12/60s budget. */
export const perUserOffRateLimitGuard = createPerUserOffRateLimiter({
	maxPerWindow: 6,
	windowMs: 60_000
});
