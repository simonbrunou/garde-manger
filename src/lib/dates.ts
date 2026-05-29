const MS_PER_DAY = 86_400_000;

/** Whole days from `now` (UTC start-of-day) until the ISO date. null date → {∞, null}. */
export function dayBadge(iso: string | null, now: Date): { label: string; days: number | null } {
	if (!iso) return { label: '∞', days: null };
	const d = new Date(iso);
	const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
	const target = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
	const days = Math.round((target - today) / MS_PER_DAY);
	return { label: String(days), days };
}
