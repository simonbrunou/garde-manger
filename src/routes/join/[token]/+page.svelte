<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<main>
	{#if data.error}
		<h1>Lien d'invitation invalide</h1>
		<p class="error" role="alert">{data.error}</p>
		<p><a href="/">← Retour à l'accueil</a></p>
	{:else}
		<h1>Rejoindre le foyer…</h1>
		<p>Redirection en cours.</p>
	{/if}
</main>
