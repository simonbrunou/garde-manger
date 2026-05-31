<script lang="ts">
	import type { LayoutServerData } from './$types';
	import { page } from '$app/state';
	import { m } from '$lib/i18n';
	import OfflineBanner from '$lib/components/OfflineBanner.svelte';
	import NavigationBar from '$lib/components/ui/NavigationBar.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import BottomNav from '$lib/components/ui/BottomNav.svelte';

	let { data, children }: { data: LayoutServerData; children: import('svelte').Snippet } = $props();
	const t = $derived(m(data.locale));

	const path = $derived(page.url.pathname);
	// Home renders its own large-title NavigationBar (with the household switcher);
	// every other (app) route gets this shared inline title bar from the layout.
	const isHome = $derived(path === '/garde-manger');
	const isAccount = $derived(path.startsWith('/account'));
	// Top-level tab roots get no back button; deeper "pushed" views do.
	const tabRoots = ['/garde-manger', '/cuisiner', '/bilan', '/account'];
	const isDeep = $derived(!isHome && !tabRoots.includes(path));
	const routeTitle = $derived.by(() => {
		if (path.startsWith('/cuisiner')) return t.nav_cuisiner;
		if (path.startsWith('/bilan')) return t.nav_bilan;
		if (path.startsWith('/account')) return t.account_title;
		if (path.startsWith('/scan')) return t.nav_add;
		if (path.startsWith('/add')) return t.nav_add;
		if (path.startsWith('/households')) return t.account_manage_households;
		if (path.startsWith('/item')) return '';
		return '';
	});
	// Logical parent for the back button (also a valid no-JS href).
	const backHref = $derived.by(() => {
		if (path.startsWith('/item')) return '/garde-manger';
		if (path.startsWith('/households')) return '/account';
		if (path.startsWith('/scan')) return '/add';
		if (path.startsWith('/add')) return '/garde-manger';
		return '/garde-manger';
	});
</script>

<svelte:head>
	<title>Garde-Manger</title>
</svelte:head>

<OfflineBanner locale={data.locale} />

{#if !isHome}
	<NavigationBar title={routeTitle} large={false}>
		{#snippet leading()}
			{#if isDeep}
				<a class="back" href={backHref} aria-label={t.nav_back}>
					<Icon name="chevron-left" size={22} /><span>{t.nav_back}</span>
				</a>
			{/if}
		{/snippet}
		{#snippet trailing()}
			{#if !isAccount}
				<a class="settings" href="/account" aria-label={t.nav_settings}>
					<Icon name="settings" size={22} />
				</a>
			{/if}
		{/snippet}
	</NavigationBar>
{/if}

<main>
	{@render children()}
</main>

<BottomNav {t} />

<style>
	.back {
		display: inline-flex;
		align-items: center;
		gap: 0.1rem;
		margin-left: -0.35rem;
		color: var(--tint);
		font-size: var(--text-body);
		font-weight: 500;
	}
	.back:hover {
		text-decoration: none;
	}
	.settings {
		display: inline-flex;
		align-items: center;
		color: var(--text-muted);
	}
	.settings:hover {
		color: var(--text);
		text-decoration: none;
	}
</style>
