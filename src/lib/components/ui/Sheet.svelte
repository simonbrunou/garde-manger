<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		open = $bindable(false),
		title,
		onClose,
		children
	}: {
		open?: boolean;
		title?: string;
		onClose?: () => void;
		children: Snippet;
	} = $props();

	function close() {
		open = false;
		onClose?.();
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}
</script>

<svelte:window onkeydown={open ? onKeydown : undefined} />

{#if open}
	<div class="scrim" onclick={close} role="presentation"></div>
	<div class="sheet" role="dialog" aria-modal="true" aria-label={title}>
		<div class="grabber" aria-hidden="true"></div>
		{#if title}<h2 class="sheet-title">{title}</h2>{/if}
		<div class="sheet-body">
			{@render children()}
		</div>
	</div>
{/if}

<style>
	.scrim {
		position: fixed;
		inset: 0;
		z-index: 40;
		background: var(--material-overlay);
		animation: fade var(--dur-fast) ease;
	}
	.sheet {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 41;
		max-width: var(--container);
		margin: 0 auto;
		max-height: 92dvh;
		display: flex;
		flex-direction: column;
		background: var(--surface);
		border-radius: var(--radius-lg) var(--radius-lg) 0 0;
		padding: 0.5rem var(--layout-margin) calc(1rem + env(safe-area-inset-bottom));
		box-shadow: var(--shadow);
		animation: rise var(--dur-sheet) var(--ease-ios);
	}
	.grabber {
		width: 36px;
		height: 5px;
		border-radius: var(--radius-pill);
		background: var(--fill-secondary);
		margin: 0.3rem auto 0.6rem;
	}
	.sheet-title {
		text-align: center;
		font-size: var(--text-headline);
		font-weight: 600;
		margin: 0 0 0.6rem;
	}
	.sheet-body {
		overflow-y: auto;
	}
	@keyframes rise {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}
	@keyframes fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
