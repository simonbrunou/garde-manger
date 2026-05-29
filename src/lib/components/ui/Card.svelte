<script lang="ts">
	let { children, ...rest }: { children?: import('svelte').Snippet; [key: string]: unknown } =
		$props();
</script>

<section class="card" {...rest}>{@render children?.()}</section>

<style>
	.card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		box-shadow: var(--shadow-sm);
		padding: 1rem;
	}
</style>
