import type { Messages } from './i18n';

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

/**
 * Visible text + accessible label for a day badge, given whole days remaining
 * (from dayBadge). Negative = overdue: shows the signed count, spells out the
 * magnitude for screen readers.
 */
export function formatDayBadge(
	days: number | null,
	t: Pick<Messages, 'day_today' | 'day_unit' | 'day_overdue'>
): { text: string; aria: string } {
	if (days === null) return { text: '∞', aria: '∞' };
	if (days < 0) {
		return { text: String(days), aria: `${Math.abs(days)} ${t.day_unit} · ${t.day_overdue}` };
	}
	if (days === 0) return { text: t.day_today, aria: t.day_today };
	const label = `${days} ${t.day_unit}`;
	return { text: label, aria: label };
}
