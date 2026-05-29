<script lang="ts">
	import type { PageData } from './$types';
	import { m } from '$lib/i18n';

	let { data }: { data: PageData } = $props();
	const t = $derived(m(data.locale ?? 'fr'));
</script>

<main class="join-page">
	<div class="join-card card">
		{#if data.error}
			<h1 class="join-title">{t.join_invalid_title}</h1>
			<p class="error" role="alert">{data.error}</p>
			<p class="join-alt"><a href="/">{t.join_back_home}</a></p>
		{:else}
			<h1 class="join-title">🥕 {t.join_joining_title}</h1>
			<p class="muted">{t.join_redirecting}</p>
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
</style>
