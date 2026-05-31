<script lang="ts">
	let {
		grouped = false,
		children,
		...rest
	}: { grouped?: boolean; children?: import('svelte').Snippet; [key: string]: unknown } = $props();
</script>

<section class="card" class:grouped {...rest}>{@render children?.()}</section>

<style>
	.card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		box-shadow: var(--shadow-sm);
		padding: 1rem;
	}
	/* HIG inset-grouped surface: tighter corner, hairline separator colour, no
	   drop shadow (grouped lists sit flat on the grouped background). */
	.card.grouped {
		border-color: var(--separator);
		border-radius: var(--radius-grouped);
		box-shadow: none;
	}
</style>
