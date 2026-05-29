<script lang="ts">
	import Icon, { type IconName } from './Icon.svelte';
	let {
		icon,
		title,
		body = undefined,
		children
	}: {
		icon: IconName;
		title: string;
		body?: string;
		children?: import('svelte').Snippet;
	} = $props();
</script>

<div class="empty">
	<div class="empty-icon"><Icon name={icon} size={40} /></div>
	<h2>{title}</h2>
	{#if body}<p class="muted">{body}</p>{/if}
	{@render children?.()}
</div>

<style>
	.empty {
		text-align: center;
		padding: 3rem 1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}
	.empty-icon {
		width: 76px;
		height: 76px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		background: var(--green-tint);
		color: var(--green);
		margin-bottom: 0.5rem;
	}
</style>
