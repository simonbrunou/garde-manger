<script lang="ts">
	import Icon from './Icon.svelte';
	import { categoryIcon } from '$lib/icons';
	let {
		imagePath = null,
		barcode = null,
		category = null,
		size = 46,
		alt = ''
	}: {
		imagePath?: string | null;
		barcode?: string | null;
		category?: string | null;
		size?: number;
		alt?: string;
	} = $props();
	const icon = $derived(categoryIcon(category));
</script>

<div class="thumb" style="--s:{size}px">
	{#if imagePath && barcode}
		<img src={`/products/${barcode}/image`} {alt} loading="lazy" />
	{:else}
		<Icon name={icon} size={Math.round(size * 0.55)} />
	{/if}
</div>

<style>
	.thumb {
		width: var(--s);
		height: var(--s);
		flex: none;
		border-radius: 14px;
		overflow: hidden;
		display: grid;
		place-items: center;
		background: var(--surface-2);
		color: var(--text-muted);
	}
	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
</style>
