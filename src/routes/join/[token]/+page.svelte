<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { m } from '$lib/i18n';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const t = $derived(m(data.locale ?? 'fr'));
	const errorMessage = $derived(data.error ?? form?.error);
</script>

<svelte:head>
	<title>Garde-Manger</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<main class="join-page">
	<div class="join-card card">
		{#if errorMessage}
			<h1 class="join-title">{t.join_invalid_title}</h1>
			<p class="error" role="alert">{errorMessage}</p>
			<p class="join-alt"><a href="/">{t.join_back_home}</a></p>
		{:else}
			<h1 class="join-title">🥕 {t.join_confirm_title}</h1>
			<p class="muted">{t.join_confirm_prompt} <strong>{data.householdName}</strong></p>
			<form method="POST">
				<button type="submit" class="join-button">{t.join_confirm_button}</button>
			</form>
			<p class="join-alt"><a href="/">{t.join_back_home}</a></p>
		{/if}
	</div>
</main>

<style>
	.join-page {
		display: flex;
		justify-content: center;
		padding-top: 3rem;
	}

	.join-card {
		width: 100%;
		max-width: 26rem;
		padding: 1.75rem 1.5rem;
		text-align: center;
	}

	.join-title {
		margin-bottom: 1rem;
	}

	.join-alt {
		margin: 1.1rem 0 0;
	}

	.join-button {
		margin-top: 1.25rem;
		width: 100%;
		padding: 0.75rem 1rem;
		font-size: 1rem;
		font-weight: 600;
		color: #fff;
		background: #16a34a;
		border: none;
		border-radius: 0.75rem;
		cursor: pointer;
	}

	.join-button:hover {
		background: #15803d;
	}
</style>
