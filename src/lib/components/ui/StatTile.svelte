<script lang="ts">
	let {
		value,
		label,
		tone = 'neutral'
	}: { value: string | number; label: string; tone?: 'eaten' | 'wasted' | 'neutral' } = $props();
</script>

<div class="tile tone-{tone}">
	<div class="value">{value}</div>
	<div class="label">{label}</div>
</div>

<style>
	.tile {
		flex: 1;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		box-shadow: var(--shadow-sm);
		padding: 1.1rem 1rem;
		text-align: center;
	}
	.value {
		font-size: 2rem;
		font-weight: 800;
		line-height: 1;
	}
	.label {
		margin-top: 0.35rem;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text-muted);
	}
	.tone-eaten .value {
		color: var(--green);
	}
	.tone-wasted .value {
		color: var(--red);
	}
	.tone-neutral .value {
		color: var(--text);
	}
</style>
