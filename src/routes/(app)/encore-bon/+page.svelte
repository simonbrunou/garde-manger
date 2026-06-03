<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import { m } from '$lib/i18n';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const t = $derived(m(data.locale));

	const locationLabel = $derived({
		pantry: t.add_location_pantry,
		fridge: t.add_location_fridge,
		freezer: t.add_location_freezer
	});

	const basisLabel = $derived({
		purchase: t.encore_basis_purchase,
		opened: t.encore_basis_opened,
		unspecified: t.encore_basis_unspecified
	});

	const unitLabel = $derived({
		hours: t.dur_hours,
		days: t.dur_days,
		weeks: t.dur_weeks,
		months: t.dur_months,
		years: t.dur_years
	});

	// Group guide entries by location, preserving sort order from server.
	const guideByLocation = $derived.by(() => {
		const map = new SvelteMap<string, typeof data.guide>();
		for (const entry of data.guide) {
			const group = map.get(entry.location) ?? [];
			group.push(entry);
			map.set(entry.location, group);
		}
		return map;
	});
</script>

<svelte:head>
	<title>{t.encore_title}</title>
</svelte:head>

<h1>{t.encore_title}</h1>
<p class="intro">{t.encore_intro}</p>

<form method="GET" action="/encore-bon" class="search">
	<label for="eb-search" class="sr-only">{t.add_search_label}</label>
	<input
		id="eb-search"
		type="search"
		name="q"
		value={data.q}
		placeholder={t.add_search_placeholder}
		autocomplete="off"
		aria-label={t.add_search_label}
	/>
	<Button type="submit" variant="secondary">{t.add_search_submit}</Button>
</form>

{#if data.results.length > 0}
	<ul class="results">
		{#each data.results as { food } (food.id)}
			<li>
				<a href={`/encore-bon?q=${encodeURIComponent(data.q)}&food=${encodeURIComponent(food.id)}`}>
					{data.locale === 'fr' ? food.nameFr : food.nameEn}
				</a>
			</li>
		{/each}
	</ul>
{:else if data.q !== ''}
	<p class="muted">{t.add_no_results}</p>
{/if}

{#if data.selected}
	<Card>
		<h2>{data.selected.name}</h2>
		{#each [...guideByLocation.entries()] as [loc, entries] (loc)}
			<div class="location-group">
				<h3 class="loc-heading">{locationLabel[loc as 'pantry' | 'fridge' | 'freezer']}</h3>
				{#each entries as entry (`${entry.location}-${entry.basis}`)}
					<div class="entry">
						<span class="basis">{basisLabel[entry.basis]}</span>
						{#if entry.notRecommended}
							<span class="not-recommended">{t.encore_not_recommended}</span>
						{:else}
							{@const unit = unitLabel[entry.unit]}
							{@const range =
								entry.min === entry.max
									? `${entry.max} ${unit}`
									: `${entry.min}–${entry.max} ${unit}`}
							<span>{t.encore_keeps(range)}</span>
						{/if}
						{#if entry.tips}
							<p class="tip">{entry.tips}</p>
						{/if}
					</div>
				{/each}
			</div>
		{/each}
		<p class="muted disclaimer">{t.est_disclaimer}</p>
	</Card>
{/if}

<style>
	.intro {
		color: var(--text-muted);
		margin-bottom: 1rem;
	}
	.search {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.8rem;
	}
	.search input {
		flex: 1;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
	.results {
		list-style: none;
		margin: 0 0 1rem;
		padding: 0;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}
	.results li {
		border-bottom: 1px solid var(--border);
	}
	.results li:last-child {
		border-bottom: none;
	}
	.results li a {
		display: block;
		padding: 0.7rem 1rem;
		color: inherit;
	}
	.results li a:hover {
		text-decoration: none;
		background: var(--surface-2);
	}
	.muted {
		color: var(--text-muted);
	}
	h2 {
		margin: 0 0 0.75rem;
	}
	.location-group {
		margin-bottom: 0.75rem;
	}
	.location-group:last-of-type {
		margin-bottom: 0;
	}
	.loc-heading {
		font-size: 0.85rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-muted);
		margin: 0 0 0.35rem;
	}
	.entry {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.4rem;
		padding: 0.35rem 0;
		border-bottom: 1px solid var(--separator);
		font-size: 0.9rem;
	}
	.entry:last-child {
		border-bottom: none;
	}
	.basis {
		font-weight: 600;
		min-width: 6rem;
		color: var(--text-secondary, var(--text));
	}
	.not-recommended {
		color: var(--text-muted);
		font-style: italic;
	}
	.tip {
		width: 100%;
		margin: 0.1rem 0 0;
		font-size: 0.8rem;
		color: var(--text-muted);
	}
	.disclaimer {
		margin-top: 0.75rem;
		font-size: 0.8rem;
	}
</style>
