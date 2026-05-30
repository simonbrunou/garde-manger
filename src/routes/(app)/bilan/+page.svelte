<script lang="ts">
	import { m } from '$lib/i18n';
	import StatTile from '$lib/components/ui/StatTile.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	let { data } = $props();
	const t = $derived(m(data.locale));
	const s = $derived(data.noHousehold ? null : data.stats);
	const empty = $derived(!!s && s.eaten === 0 && s.wasted === 0 && s.streakDays === null);
</script>

<svelte:head><title>{t.bilan_title}</title></svelte:head>

{#if data.noHousehold}
	<EmptyState icon="households" title={t.add_no_household}>
		<Button href="/households" variant="primary">{t.nav_create_household}</Button>
	</EmptyState>
{:else if empty}
	<EmptyState icon="stats" title={t.bilan_empty_title} body={t.bilan_empty_body} />
{:else if s}
	<header class="head">
		<h1>{t.bilan_title}</h1>
		<p class="sub">{t.bilan_month_subtitle}</p>
	</header>
	<div class="tiles">
		<StatTile value={s.eaten} label={t.bilan_eaten} tone="eaten" />
		<StatTile value={s.wasted} label={t.bilan_wasted} tone="wasted" />
	</div>
	<p class="streak">{s.streakDays === null ? t.bilan_streak_none : t.bilan_streak(s.streakDays)}</p>
{/if}

<style>
	.head {
		margin-bottom: 1rem;
	}
	.head h1 {
		margin: 0;
	}
	.sub {
		margin: 0.1rem 0 0;
		color: var(--text-muted);
		font-weight: 600;
		font-size: 0.9rem;
	}
	.tiles {
		display: flex;
		gap: 0.8rem;
	}
	.streak {
		margin-top: 1rem;
		text-align: center;
		font-weight: 700;
		background: var(--green-tint);
		color: var(--green-dark);
		border-radius: var(--radius);
		padding: 0.9rem;
	}
</style>
