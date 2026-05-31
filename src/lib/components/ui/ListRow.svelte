<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';
	let {
		href,
		title,
		subtitle,
		value,
		chevron,
		leading,
		trailing,
		onClick
	}: {
		href?: string;
		title?: string;
		subtitle?: string;
		value?: string;
		chevron?: boolean;
		leading?: Snippet;
		trailing?: Snippet;
		onClick?: () => void;
	} = $props();
</script>

{#snippet body()}
	{#if leading}<span class="lead">{@render leading()}</span>{/if}
	<span class="text">
		{#if title}<span class="title">{title}</span>{/if}
		{#if subtitle}<span class="subtitle">{subtitle}</span>{/if}
	</span>
	{#if value}<span class="value">{value}</span>{/if}
	{#if trailing}<span class="trail">{@render trailing()}</span>{/if}
	{#if chevron}<Icon name="chevron-right" size={16} class="chev" />{/if}
{/snippet}

{#if href}
	<a class="row" {href}>{@render body()}</a>
{:else if onClick}
	<button type="button" class="row" onclick={onClick}>{@render body()}</button>
{:else}
	<div class="row">{@render body()}</div>
{/if}

<style>
	.row {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		width: 100%;
		min-height: var(--row-min-h);
		padding: 0.6rem var(--layout-margin);
		background: transparent;
		border: none;
		font: inherit;
		color: var(--text);
		text-align: left;
		cursor: default;
	}
	a.row,
	button.row {
		cursor: pointer;
	}
	a.row:hover,
	button.row:hover {
		background: var(--fill-quaternary);
		text-decoration: none;
	}
	.lead {
		display: flex;
		align-items: center;
		flex-shrink: 0;
		color: var(--text-muted);
	}
	.text {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}
	.title {
		font-size: var(--text-body);
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.subtitle {
		font-size: var(--text-footnote);
		color: var(--text-muted);
	}
	.value {
		font-size: var(--text-callout);
		color: var(--text-muted);
		white-space: nowrap;
	}
	.trail {
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}
</style>
