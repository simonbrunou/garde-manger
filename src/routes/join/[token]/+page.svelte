<script lang="ts">
	import type { PageData } from './$types';
	import { m } from '$lib/i18n';

	let { data }: { data: PageData } = $props();
	const t = $derived(m(data.locale ?? 'fr'));
</script>

<main>
	{#if data.error}
		<h1>{t.join_invalid_title}</h1>
		<p class="error" role="alert">{data.error}</p>
		<p><a href="/">{t.join_back_home}</a></p>
	{:else}
		<h1>{t.join_joining_title}</h1>
		<p>{t.join_redirecting}</p>
	{/if}
</main>
