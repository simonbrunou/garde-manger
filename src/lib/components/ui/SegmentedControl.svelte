<script lang="ts">
	type Option = { value: string; label: string; href?: string };
	let {
		options,
		value,
		onChange,
		ariaLabel
	}: {
		options: Option[];
		value: string;
		onChange?: (value: string) => void;
		ariaLabel?: string;
	} = $props();
</script>

<div class="segmented" role="tablist" aria-label={ariaLabel}>
	{#each options as opt (opt.value)}
		{#if opt.href}
			<a
				class="segment"
				href={opt.href}
				role="tab"
				aria-selected={opt.value === value}
				class:active={opt.value === value}
			>
				{opt.label}
			</a>
		{:else}
			<button
				type="button"
				class="segment"
				role="tab"
				aria-selected={opt.value === value}
				class:active={opt.value === value}
				onclick={() => onChange?.(opt.value)}
			>
				{opt.label}
			</button>
		{/if}
	{/each}
</div>

<style>
	.segmented {
		display: inline-flex;
		gap: 2px;
		padding: 2px;
		background: var(--fill-tertiary);
		border-radius: var(--radius-sm);
		width: 100%;
	}
	.segment {
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 36px;
		padding: 0.35rem 0.6rem;
		border: none;
		border-radius: calc(var(--radius-sm) - 2px);
		background: transparent;
		color: var(--text-muted);
		font: inherit;
		font-size: var(--text-subhead);
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
		transition:
			background var(--dur-fast),
			color var(--dur-fast);
	}
	.segment:hover {
		text-decoration: none;
	}
	.segment.active {
		background: var(--surface);
		color: var(--text);
		box-shadow: var(--shadow-sm);
	}
</style>
