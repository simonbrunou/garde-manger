<script lang="ts">
	let {
		href,
		active = false,
		children
	}: { href: string; active?: boolean; children?: import('svelte').Snippet } = $props();
</script>

<a {href} class="chip" class:active aria-current={active ? 'page' : undefined}>
	{@render children?.()}
</a>

<style>
	.chip {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		padding: 0.35rem 0.9rem;
		border-radius: var(--radius-pill);
		background: var(--surface-2);
		color: var(--text-muted);
		font-weight: 700;
		font-size: 0.85rem;
		white-space: nowrap;
	}
	.chip:hover {
		text-decoration: none;
		color: var(--text);
	}
	.chip.active {
		background: var(--green-strong);
		color: var(--on-accent);
	}
</style>
