<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';
	import { m, type Locale } from '$lib/i18n';

	interface Props {
		locale: Locale;
	}

	let { locale }: Props = $props();
	const t = $derived(m(locale));

	let offline = $state(false);

	function update() {
		offline = !navigator.onLine;
	}

	onMount(() => {
		if (!browser) return;
		update();
		window.addEventListener('online', update);
		window.addEventListener('offline', update);
	});

	onDestroy(() => {
		if (!browser) return;
		window.removeEventListener('online', update);
		window.removeEventListener('offline', update);
	});
</script>

{#if offline}
	<div class="offline-banner" role="status" aria-live="polite">
		{t.offline_banner}
	</div>
{/if}

<style>
	.offline-banner {
		position: sticky;
		top: 0;
		z-index: 50;
		/* When shown it's the topmost element, so it carries the notch inset too. */
		padding: calc(0.4rem + env(safe-area-inset-top)) 0.75rem 0.4rem;
		font-size: 0.85rem;
		text-align: center;
		color: var(--amber-dark);
		background: var(--amber-tint);
		border-bottom: 1px solid var(--amber);
	}
</style>
