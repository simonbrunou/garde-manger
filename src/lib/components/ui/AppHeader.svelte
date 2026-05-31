<script lang="ts">
	import Icon from './Icon.svelte';
	import type { Messages } from '$lib/i18n';
	type Household = { id: string; name: string };
	let {
		households,
		activeHouseholdId,
		t
	}: { households: Household[]; activeHouseholdId: string | null; t: Messages } = $props();
	const active = $derived(households.find((h) => h.id === activeHouseholdId) ?? null);
</script>

<header class="app-header">
	{#if households.length > 0}
		<details class="switcher">
			<summary aria-label={t.nav_household_switcher}>
				<span class="hh-name">{active?.name ?? households[0].name}</span>
				<Icon name="chevron-right" size={16} class="chev" />
			</summary>
			<div class="menu">
				<form method="POST" action="/households?/switch">
					{#each households as h (h.id)}
						<button
							class="menu-item"
							name="householdId"
							value={h.id}
							aria-current={h.id === activeHouseholdId ? 'true' : undefined}
						>
							{h.name}
							{#if h.id === activeHouseholdId}<Icon name="check" size={16} />{/if}
						</button>
					{/each}
				</form>
				<a class="menu-link" href="/households">
					<Icon name="households" size={16} />{t.account_manage_households}
				</a>
			</div>
		</details>
	{:else}
		<a class="switcher-empty" href="/households">
			<Icon name="households" size={16} />{t.nav_create_household}
		</a>
	{/if}

	<a class="settings" href="/account" aria-label={t.nav_settings}>
		<Icon name="settings" size={22} />
	</a>
</header>

<style>
	.app-header {
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.6rem;
		/* Top inset clears the notch / Dynamic Island; the blurred background
		   bleeds up into it so the status-bar area stays on-brand. */
		padding: calc(0.55rem + env(safe-area-inset-top)) 1.1rem 0.55rem;
		max-width: var(--container);
		margin: 0 auto;
		background: color-mix(in srgb, var(--bg) 85%, transparent);
		backdrop-filter: saturate(140%) blur(8px);
	}
	.switcher {
		position: relative;
	}
	.switcher summary {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.35rem 0.7rem;
		border-radius: var(--radius-pill);
		background: var(--surface-2);
		font-weight: 800;
		cursor: pointer;
		list-style: none;
	}
	.switcher summary::-webkit-details-marker {
		display: none;
	}
	.switcher[open] summary :global(.chev) {
		transform: rotate(90deg);
	}
	.menu {
		position: absolute;
		top: calc(100% + 6px);
		left: 0;
		min-width: 12rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		box-shadow: var(--shadow);
		padding: 0.4rem;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.menu-item,
	.menu-link {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem 0.6rem;
		border-radius: var(--radius-sm);
		background: none;
		border: none;
		font: inherit;
		font-weight: 600;
		color: var(--text);
		text-align: left;
		cursor: pointer;
	}
	.menu-item:hover,
	.menu-link:hover {
		background: var(--surface-2);
		text-decoration: none;
	}
	.menu-link {
		color: var(--text-muted);
		border-top: 1px solid var(--border);
		margin-top: 2px;
	}
	.switcher-empty,
	.settings {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--text-muted);
		font-weight: 600;
	}
	.settings:hover,
	.switcher-empty:hover {
		color: var(--text);
		text-decoration: none;
	}
</style>
