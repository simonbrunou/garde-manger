<script lang="ts">
	import { page } from '$app/state';
	import Icon from './Icon.svelte';
	import type { Messages } from '$lib/i18n';
	let { t }: { t: Messages } = $props();
	const path = $derived(page.url.pathname);
</script>

<!-- HIG tab bar: four equal flat tabs, translucent material, brand tint on the
	 active tab. The group is width-capped and centered so the tabs stay
	 comfortably grouped on wide screens instead of stretching too sparse.
	 Settings/account is reached via the top-bar gear, not a tab (HIG: tabs are
	 for frequent peer destinations). -->
<nav class="tab-bar" aria-label={t.nav_primary}>
	<a href="/garde-manger" class="tab" aria-current={path === '/garde-manger' ? 'page' : undefined}>
		<Icon name="home" size={26} /><span>{t.nav_home}</span>
	</a>
	<a href="/add" class="tab" aria-current={path.startsWith('/add') ? 'page' : undefined}>
		<Icon name="plus" size={26} /><span>{t.nav_add}</span>
	</a>
	<a href="/bilan" class="tab" aria-current={path.startsWith('/bilan') ? 'page' : undefined}>
		<Icon name="stats" size={26} /><span>{t.nav_bilan}</span>
	</a>
	<a
		href="/encore-bon"
		class="tab"
		aria-current={path.startsWith('/encore-bon') ? 'page' : undefined}
	>
		<Icon name="search" size={26} /><span>{t.nav_encore_bon}</span>
	</a>
</nav>

<style>
	.tab-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 20;
		display: flex;
		justify-content: center;
		align-items: stretch;
		/* Height includes the home-indicator inset so the tab content keeps its
		   full --tab-bar-h (border-box would otherwise eat into it). */
		height: calc(var(--tab-bar-h) + env(safe-area-inset-bottom));
		padding-bottom: env(safe-area-inset-bottom);
		padding-left: env(safe-area-inset-left);
		padding-right: env(safe-area-inset-right);
		/* Translucent material; @supports fallback in app.css makes this opaque
		   where backdrop-filter is unsupported. */
		background: var(--material-bar);
		backdrop-filter: saturate(140%) blur(12px);
		-webkit-backdrop-filter: saturate(140%) blur(12px);
		border-top: 1px solid var(--separator);
	}
	.tab {
		/* Grow to share the bar, but cap width so three tabs stay grouped near
		   the center on wide screens instead of stretching too sparse. */
		flex: 1 1 0;
		max-width: 6.5rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		min-width: 0;
		/* 44pt minimum interactive height (HIG). */
		min-height: 44px;
		font-size: var(--text-caption-2);
		font-weight: 600;
		color: var(--text-muted);
		transition: color var(--dur-fast);
	}
	.tab:hover {
		text-decoration: none;
	}
	.tab[aria-current='page'] {
		color: var(--tint);
	}
	.tab span {
		line-height: 1;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
