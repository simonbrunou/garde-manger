<script lang="ts">
	import Icon from './Icon.svelte';
	import type { Messages } from '$lib/i18n';
	import type { ThemeChoice } from '$lib/theme';
	let { value, t }: { value: ThemeChoice; t: Messages } = $props();
	const opts = $derived<{ v: ThemeChoice; label: string; icon: 'monitor' | 'sun' | 'moon' }[]>([
		{ v: 'auto', label: t.theme_auto, icon: 'monitor' },
		{ v: 'light', label: t.theme_light, icon: 'sun' },
		{ v: 'dark', label: t.theme_dark, icon: 'moon' }
	]);
</script>

<form method="POST" action="?/setTheme" class="seg">
	{#each opts as o (o.v)}
		<button
			name="theme"
			value={o.v}
			class="seg-btn"
			class:on={value === o.v}
			aria-pressed={value === o.v}
		>
			<Icon name={o.icon} size={18} />{o.label}
		</button>
	{/each}
</form>

<style>
	.seg {
		display: flex;
		gap: 0.4rem;
	}
	.seg-btn {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		padding: 0.7rem 0.4rem;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-sm);
		background: var(--surface);
		color: var(--text-muted);
		font-weight: 700;
		font-size: 0.85rem;
		cursor: pointer;
	}
	.seg-btn.on {
		border-color: var(--green);
		background: var(--green-tint);
		color: var(--green-dark);
	}
</style>
