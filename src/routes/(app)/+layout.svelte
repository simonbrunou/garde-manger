<script lang="ts">
	import type { LayoutServerData } from './$types';
	import { m } from '$lib/i18n';
	import OfflineBanner from '$lib/components/OfflineBanner.svelte';
	import AppHeader from '$lib/components/ui/AppHeader.svelte';
	import BottomNav from '$lib/components/ui/BottomNav.svelte';

	let { data, children }: { data: LayoutServerData; children: import('svelte').Snippet } = $props();
	const t = $derived(m(data.locale));
</script>

<OfflineBanner locale={data.locale} />
<AppHeader households={data.households} activeHouseholdId={data.activeHouseholdId} {t} />

<main>
	{@render children()}
</main>

<BottomNav {t} />
