<script lang="ts">
	import type { PageData } from './$types';
	import { m } from '$lib/i18n';

	let { data }: { data: PageData } = $props();
	const t = $derived(m(data.locale));

	const activeHousehold = $derived(
		data.households.find((h) => h.id === data.activeHouseholdId) ?? null
	);
</script>

<svelte:head><title>Garde-Manger</title></svelte:head>

<h1>{t.home_greeting(data.user.displayName)}</h1>

{#if activeHousehold}
	<p class="household-name">{t.home_active_household} <strong>{activeHousehold.name}</strong></p>

	<div class="card inventory-placeholder">
		<p>{t.home_inventory_placeholder}</p>
	</div>
{:else}
	<p>{t.home_no_household}</p>
	<p><a href="/households">{t.home_create_or_join}</a></p>
{/if}
