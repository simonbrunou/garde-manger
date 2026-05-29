<script lang="ts">
	import { browser } from '$app/environment';
	import { m } from '$lib/i18n';
	import BarcodeScanner from '$lib/components/BarcodeScanner.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const t = $derived(m(data.locale));
</script>

<svelte:head>
	<title>{t.scan_title}</title>
</svelte:head>

{#if data.noHousehold}
	<p>{t.add_no_household}</p>
	<a href="/households">{t.nav_create_household}</a>
{:else}
	<h1>{t.scan_title}</h1>
	<p>{t.scan_instructions}</p>

	<section class="scan-methods">
		{#if browser}
			<!-- Camera island: hydrates client-side only; heavy WASM stays off SSR. -->
			<BarcodeScanner locale={data.locale} />
		{/if}

		<!-- Manual entry — ALWAYS visible, works with NO JavaScript (GET → server redirect). -->
		<div class="method-card">
			<h2>{t.scan_manual_title}</h2>
			<form method="GET" action="/scan">
				<div class="field">
					<label for="manual-code">{t.scan_manual_label}</label>
					<input
						type="text"
						id="manual-code"
						name="code"
						inputmode="numeric"
						autocomplete="off"
						placeholder={t.scan_manual_placeholder}
					/>
				</div>
				{#if data.invalidCode}
					<p class="error" role="alert">{t.scan_manual_invalid}</p>
				{/if}
				<button type="submit" class="btn btn-primary">{t.scan_manual_submit}</button>
			</form>
		</div>

		<p class="freetext">
			<a href="/add">{t.scan_or_freetext}</a>
		</p>
	</section>
{/if}

<style>
	.scan-methods {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		max-width: 540px;
		margin: 1.5rem 0;
	}

	.method-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		box-shadow: var(--shadow-sm);
		padding: 1rem;
	}

	.method-card h2 {
		margin: 0 0 0.75rem;
		font-size: 1.1rem;
	}

	.method-card form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.method-card .btn {
		align-self: flex-start;
	}

	.freetext {
		margin: 0;
		font-size: 0.95rem;
	}
</style>
