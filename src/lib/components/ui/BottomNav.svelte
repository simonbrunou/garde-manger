<script lang="ts">
	import { page } from '$app/state';
	import Icon from './Icon.svelte';
	import type { Messages } from '$lib/i18n';
	let { t }: { t: Messages } = $props();
	const path = $derived(page.url.pathname);
</script>

<nav class="bottom-nav" aria-label={t.nav_primary}>
	<a href="/" class="tab" aria-current={path === '/' ? 'page' : undefined}>
		<Icon name="home" size={22} /><span>{t.nav_home}</span>
	</a>
	<a href="/add" class="fab" aria-label={t.nav_add}>
		<Icon name="plus" size={26} />
	</a>
	<a href="/bilan" class="tab" aria-current={path.startsWith('/bilan') ? 'page' : undefined}>
		<Icon name="stats" size={22} /><span>{t.nav_bilan}</span>
	</a>
	<a href="/account" class="tab" aria-current={path.startsWith('/account') ? 'page' : undefined}>
		<Icon name="user" size={22} /><span>{t.nav_settings}</span>
	</a>
</nav>

<style>
	.bottom-nav {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 20;
		display: flex;
		justify-content: space-around;
		align-items: center;
		height: var(--bottom-nav-h);
		padding-bottom: env(safe-area-inset-bottom);
		background: var(--surface);
		border-top: 1px solid var(--border);
	}
	.tab {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3px;
		font-size: 0.68rem;
		font-weight: 700;
		color: var(--text-muted);
		min-width: 4rem;
	}
	.tab:hover {
		text-decoration: none;
	}
	.tab[aria-current='page'] {
		color: var(--green);
	}
	.fab {
		width: 54px;
		height: 54px;
		margin-top: -1.5rem;
		border-radius: 50%;
		display: grid;
		place-items: center;
		background: var(--green);
		color: var(--on-accent);
		border: 4px solid var(--bg);
		box-shadow: 0 8px 18px color-mix(in srgb, var(--green) 38%, transparent);
	}
	.fab:hover {
		text-decoration: none;
		background: var(--green-dark);
	}
</style>
