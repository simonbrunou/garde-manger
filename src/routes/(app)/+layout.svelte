<script lang="ts">
	import type { LayoutServerData } from './$types';
	import { m } from '$lib/i18n';

	let { data, children }: { data: LayoutServerData; children: import('svelte').Snippet } = $props();
	const t = $derived(m(data.locale));
</script>

<header>
	<nav>
		<span class="user-name">{data.user.displayName}</span>

		{#if data.households.length > 0}
			<form method="POST" action="/households?/switch">
				<label for="householdId">{t.nav_household_label}</label>
				<select id="householdId" name="householdId">
					{#each data.households as h (h.id)}
						<option value={h.id} selected={h.id === data.activeHouseholdId}>{h.name}</option>
					{/each}
				</select>
				<button type="submit">{t.nav_switch_household}</button>
			</form>
		{:else}
			<a href="/households">{t.nav_create_household}</a>
		{/if}

		<a href="/households">{t.nav_households}</a>
		<a href="/account">{t.nav_account}</a>

		<form method="POST" action="/logout">
			<button type="submit">{t.nav_logout}</button>
		</form>
	</nav>
</header>

<main>
	{@render children()}
</main>
