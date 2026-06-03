<script lang="ts">
	import { dayBadge, formatDayBadge } from '$lib/dates';
	import type { Messages } from '$lib/i18n';
	import type { Band } from '$lib/server/inventory';
	let {
		band,
		effectiveDate,
		now = new Date(),
		t
	}: { band: Band; effectiveDate: string | null; now?: Date; t: Messages } = $props();
	const badge = $derived(formatDayBadge(dayBadge(effectiveDate, now).days, t));
	const text = $derived(badge.text);
	const aria = $derived(badge.aria);
</script>

<span class="badge badge-{band}" aria-label={aria}>{text}</span>

<style>
	.badge {
		flex: none;
		min-width: 2.9rem;
		height: 2.9rem;
		padding: 0 0.4rem;
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-size: 0.8rem;
		font-weight: 800;
		line-height: 1;
		text-align: center;
	}
	.badge-urgent {
		background: var(--red-strong);
		color: var(--on-accent);
		box-shadow: 0 4px 10px color-mix(in srgb, var(--red) 32%, transparent);
	}
	.badge-soon {
		background: var(--amber-tint);
		color: var(--amber-dark);
		border: 2px solid color-mix(in srgb, var(--amber) 45%, transparent);
	}
	.badge-ok {
		background: var(--green-tint);
		color: var(--green-dark);
		border: 2px solid color-mix(in srgb, var(--green) 35%, transparent);
	}
</style>
