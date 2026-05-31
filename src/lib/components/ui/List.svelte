<script lang="ts">
	import type { Snippet } from 'svelte';
	let {
		header,
		footer,
		children
	}: {
		header?: string;
		footer?: string;
		children: Snippet;
	} = $props();
</script>

{#if header}<p class="list-header">{header}</p>{/if}
<div class="list">
	{@render children()}
</div>
{#if footer}<p class="list-footer">{footer}</p>{/if}

<style>
	.list-header {
		margin: 0 0 0.4rem;
		padding: 0 var(--layout-margin);
		font-size: var(--text-footnote);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-muted);
	}
	.list {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-grouped);
		overflow: hidden;
	}
	/* Text-aligned hairline separators between consecutive rows. Lives here (the
	   parent) with :global so it spans the ListRow component boundary; the inset
	   matches the row's leading text padding. */
	.list :global(.row + .row) {
		box-shadow: inset 0 1px 0 var(--separator);
	}
	.list-footer {
		margin: 0.4rem 0 0;
		padding: 0 var(--layout-margin);
		font-size: var(--text-footnote);
		color: var(--text-muted);
	}
</style>
