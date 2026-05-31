<script lang="ts">
	import Icon, { type IconName } from './Icon.svelte';
	let {
		variant = 'primary',
		href = undefined,
		type = 'button',
		icon = undefined,
		full = false,
		children,
		...rest
	}: {
		variant?: 'filled' | 'tinted' | 'gray' | 'plain' | 'primary' | 'secondary' | 'ghost' | 'danger';
		href?: string;
		type?: 'button' | 'submit';
		icon?: IconName;
		full?: boolean;
		children?: import('svelte').Snippet;
		[key: string]: unknown;
	} = $props();
</script>

{#if href}
	<a {href} class="btn btn-{variant}" class:full {...rest}>
		{#if icon}<Icon name={icon} size={18} />{/if}{@render children?.()}
	</a>
{:else}
	<button {type} class="btn btn-{variant}" class:full {...rest}>
		{#if icon}<Icon name={icon} size={18} />{/if}{@render children?.()}
	</button>
{/if}

<style>
	.full {
		width: 100%;
	}
</style>
