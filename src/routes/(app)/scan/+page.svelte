<script lang="ts">
	import { browser } from '$app/environment';
	import { m } from '$lib/i18n';
	import BarcodeScanner from '$lib/components/BarcodeScanner.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const t = $derived(m(data.locale));
</script>

<svelte:head>
	<title>{t.scan_title}</title>
</svelte:head>

{#if data.noHousehold}
	<EmptyState icon="households" title={t.add_no_household}>
		<Button href="/households" variant="primary">{t.nav_create_household}</Button>
	</EmptyState>
{:else}
	<h1>{t.scan_title}</h1>
	<p class="muted">{t.scan_instructions}</p>

	{#if browser}
		<!-- Camera island: hydrates client-side only; heavy WASM stays off SSR. -->
		<BarcodeScanner locale={data.locale} />
	{/if}

	<Card>
		<h2>{t.scan_manual_title}</h2>
		<form method="GET" action="/scan" class="manual">
			<label for="manual-code">{t.scan_manual_label}</label>
			<input
				id="manual-code"
				name="code"
				inputmode="numeric"
				autocomplete="off"
				placeholder={t.scan_manual_placeholder}
			/>
			{#if data.invalidCode}<p class="error" role="alert">{t.scan_manual_invalid}</p>{/if}
			<Button type="submit" variant="primary" full>{t.scan_manual_submit}</Button>
		</form>
	</Card>

	<p class="freetext"><a href="/add">{t.scan_or_freetext}</a></p>
{/if}

<style>
	.muted {
		color: var(--text-muted);
	}

	.manual {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.freetext {
		margin-top: 1rem;
		text-align: center;
	}
</style>
