const MS_PER_DAY = 86_400_000;

/** UTC midnight today shifted by `offsetDays`. Mirrors the server's start-of-day math. */
export function utcMidnight(offsetDays = 0): Date {
	const now = new Date();
	const base = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
	return new Date(base + offsetDays * MS_PER_DAY);
}

/** 'YYYY-MM-DD' for a date input, in UTC. */
export function isoDate(d: Date): string {
	return d.toISOString().slice(0, 10);
}
