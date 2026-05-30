<script lang="ts">
	import { m } from '$lib/i18n';
	import Chip from '$lib/components/ui/Chip.svelte';
	import ItemRow from '$lib/components/ui/ItemRow.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	let { data } = $props();
	const t = $derived(m(data.locale));
	const bands = $derived(
		[
			{
				key: 'urgent',
				label: t.home_band_urgent,
				color: 'var(--red)',
				rows: data.groups?.urgent ?? []
			},
			{
				key: 'soon',
				label: t.home_band_soon,
				color: 'var(--amber)',
				rows: data.groups?.soon ?? []
			},
			{
				key: 'ok',
				label: t.home_band_ok,
				color: 'var(--green)',
				rows: data.expiringOnly ? [] : (data.groups?.ok ?? [])
			}
		].filter((b) => b.rows.length > 0)
	);
	const empty = $derived(bands.length === 0);
</script>

<svelte:head><title>Garde-Manger</title></svelte:head>

{#if data.noHousehold}
	<h1>Garde-Manger</h1>
	<p>{t.home_no_household}</p>
	<p><a href="/households">{t.home_create_or_join}</a></p>
{:else}
	<header class="head">
		<h1>{data.activeHouseholdName}</h1>
		<p class="sub">{t.home_subtitle(data.totalCount, data.urgentCount)}</p>
	</header>

	<div class="filters">
		<Chip href="/" active={!data.locationFilter}>{t.home_filter_all}</Chip>
		<Chip href="/?location=fridge" active={data.locationFilter === 'fridge'}
			>{t.add_location_fridge}</Chip
		>
		<Chip href="/?location=pantry" active={data.locationFilter === 'pantry'}
			>{t.add_location_pantry}</Chip
		>
		<Chip href="/?location=freezer" active={data.locationFilter === 'freezer'}
			>{t.add_location_freezer}</Chip
		>
	</div>

	{#if empty}
		<EmptyState icon="home" title={t.home_empty_title} body={t.home_empty_body} />
	{:else}
		{#each bands as b (b.key)}
			<section class="band">
				<h2 class="band-title"><span class="dot" style="background:{b.color}"></span>{b.label}</h2>
				<div class="list">
					{#each b.rows as item (item.id)}
						<ItemRow {item} locale={data.locale} {t} />
					{/each}
				</div>
			</section>
		{/each}
	{/if}
{/if}

<style>
	.head {
		margin-bottom: 0.8rem;
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
	.filters {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-bottom: 1.2rem;
	}
	.band {
		margin-bottom: 1.5rem;
	}
	.band-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin: 0 0 0.6rem;
	}
	.dot {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		display: inline-block;
	}
	.list {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
</style>
