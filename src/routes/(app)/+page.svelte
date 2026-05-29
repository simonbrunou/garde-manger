<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const activeHousehold = $derived(
		data.households.find((h) => h.id === data.activeHouseholdId) ?? null
	);
</script>

<svelte:head><title>Garde-Manger</title></svelte:head>

<h1>Bonjour, {data.user.displayName} 👋</h1>

{#if activeHousehold}
	<p class="household-name">Foyer actif : <strong>{activeHousehold.name}</strong></p>

	<div class="card inventory-placeholder">
		<p>🧺 Ton inventaire arrive bientôt (M2)</p>
	</div>
{:else}
	<p>Vous n'avez pas encore de foyer.</p>
	<p><a href="/households">Créer ou rejoindre un foyer →</a></p>
{/if}
