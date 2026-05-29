<script lang="ts">
	import type { LayoutServerData } from './$types';

	let { data, children }: { data: LayoutServerData; children: import('svelte').Snippet } = $props();
</script>

<header>
	<nav>
		<span class="user-name">{data.user.displayName}</span>

		{#if data.households.length > 0}
			<form method="POST" action="/households?/switch">
				<label for="householdId">Foyer :</label>
				<select id="householdId" name="householdId">
					{#each data.households as h}
						<option value={h.id} selected={h.id === data.activeHouseholdId}>{h.name}</option>
					{/each}
				</select>
				<button type="submit">Changer</button>
			</form>
		{:else}
			<a href="/households">Créer un foyer</a>
		{/if}

		<a href="/households">Foyers</a>
		<a href="/account">Compte</a>

		<form method="POST" action="/logout">
			<button type="submit">Se déconnecter</button>
		</form>
	</nav>
</header>

<main>
	{@render children()}
</main>
