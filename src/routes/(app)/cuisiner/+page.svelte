<script lang="ts">
	import { m } from '$lib/i18n';
	import List from '$lib/components/ui/List.svelte';
	import ListRow from '$lib/components/ui/ListRow.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	let { data } = $props();
	const t = $derived(m(data.locale));
</script>

<svelte:head><title>{t.cuisiner_title}</title></svelte:head>

{#if data.noHousehold}
	<EmptyState icon="households" title={t.add_no_household}>
		<Button href="/households" variant="primary">{t.nav_create_household}</Button>
	</EmptyState>
{:else if data.items.length === 0}
	<EmptyState icon="cook" title={t.cuisiner_empty_title} body={t.cuisiner_empty_body} />
{:else}
	<p class="sub">{t.cuisiner_subtitle}</p>
	<div class="groups">
		{#each data.items as item (item.id)}
			<!-- Each food is a grouped list: the food name (a navigable row with a
			     disclosure chevron) followed by its recipe ideas as plain rows. -->
			<List header={item.name}>
				<ListRow href={`/item/${item.id}`} title={t.cuisiner_view_item} chevron />
				{#each item.ideas as idea (idea)}
					<ListRow title={idea} />
				{/each}
			</List>
		{/each}
	</div>
{/if}

<style>
	.sub {
		margin: 0 0 1rem;
		color: var(--text-muted);
		font-weight: 600;
		font-size: 0.9rem;
	}
	.groups {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}
</style>
