<script lang="ts">
	import type { LayoutServerData } from './$types';
	import { m } from '$lib/i18n';
	import OfflineBanner from '$lib/components/OfflineBanner.svelte';

	let { data, children }: { data: LayoutServerData; children: import('svelte').Snippet } = $props();
	const t = $derived(m(data.locale));
</script>

<OfflineBanner locale={data.locale} />

<header class="app-bar">
	<div class="bar-row brand-row">
		<a class="brand" href="/">🥕 Garde-Manger</a>
		<nav class="bar-links">
			<a href="/households">{t.nav_households}</a>
			<a href="/account">{t.nav_account}</a>
			<form method="POST" action="/logout">
				<button type="submit" class="btn-ghost logout">{t.nav_logout}</button>
			</form>
		</nav>
	</div>

	{#if data.households.length > 0}
		<form method="POST" action="/households?/switch" class="bar-row household-row">
			<span class="household-label">{t.nav_household_label}</span>
			<select id="householdId" name="householdId" aria-label={t.nav_household_label}>
				{#each data.households as h (h.id)}
					<option value={h.id} selected={h.id === data.activeHouseholdId}>{h.name}</option>
				{/each}
			</select>
			<button type="submit" class="btn-secondary switch-btn">{t.nav_switch_household}</button>
		</form>
	{:else}
		<div class="bar-row household-row">
			<a href="/households" class="btn-secondary switch-btn">{t.nav_create_household}</a>
		</div>
	{/if}
</header>

<main>
	{@render children()}
</main>

<style>
	.app-bar {
		position: sticky;
		top: 0;
		z-index: 10;
		background: color-mix(in srgb, var(--surface) 88%, transparent);
		backdrop-filter: saturate(140%) blur(8px);
		border-bottom: 1px solid var(--border);
	}

	.bar-row {
		width: 100%;
		max-width: var(--container);
		margin: 0 auto;
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.55rem 1.1rem;
	}

	.brand-row {
		justify-content: space-between;
	}

	.brand {
		font-weight: 800;
		font-size: 1.05rem;
		color: var(--text);
		letter-spacing: -0.01em;
		text-decoration: none;
	}
	.brand:hover {
		text-decoration: none;
	}

	.bar-links {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}
	.bar-links a {
		color: var(--text-muted);
		font-weight: 600;
		font-size: 0.9rem;
		padding: 0.35rem 0.5rem;
		border-radius: var(--radius-sm);
	}
	.bar-links a:hover {
		color: var(--text);
		background: var(--surface-2);
		text-decoration: none;
	}
	.bar-links form {
		margin: 0;
	}
	.logout {
		font-size: 0.9rem;
	}

	.household-row {
		padding-top: 0;
		padding-bottom: 0.6rem;
	}
	.household-label {
		font-size: 0.85rem;
		color: var(--text-muted);
		flex-shrink: 0;
	}
	.household-row select {
		flex: 1;
		min-width: 0;
		padding: 0.4rem 1.8rem 0.4rem 0.6rem;
		font-weight: 600;
		font-size: 0.95rem;
	}
	.switch-btn {
		flex-shrink: 0;
		padding: 0.4rem 0.9rem;
		font-size: 0.9rem;
	}
</style>
