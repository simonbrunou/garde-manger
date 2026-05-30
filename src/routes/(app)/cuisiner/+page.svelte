<script lang="ts">
	import { m } from '$lib/i18n';
	import Card from '$lib/components/ui/Card.svelte';
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
	<header class="head">
		<h1>{t.cuisiner_title}</h1>
		<p class="sub">{t.cuisiner_subtitle}</p>
	</header>
	<div class="list">
		{#each data.items as item (item.id)}
			<Card>
				<a class="name" href={`/item/${item.id}`}>{item.name}</a>
				<ul class="ideas">
					{#each item.ideas as idea (idea)}
						<li>{idea}</li>
					{/each}
				</ul>
			</Card>
		{/each}
	</div>
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
	.list {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
	}
	.name {
		display: inline-block;
		font-weight: 800;
		font-size: 1rem;
		color: inherit;
		margin-bottom: 0.5rem;
	}
	.name:hover {
		text-decoration: none;
		color: var(--green-dark);
	}
	.ideas {
		margin: 0;
		padding-left: 1.1rem;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.ideas li {
		color: var(--text);
	}
</style>
