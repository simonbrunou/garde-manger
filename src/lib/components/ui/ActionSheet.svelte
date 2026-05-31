<script lang="ts">
	type Action = {
		label: string;
		onSelect: () => void;
		destructive?: boolean;
	};

	let {
		open = $bindable(false),
		title,
		actions,
		cancelLabel = 'Annuler',
		onClose
	}: {
		open?: boolean;
		title?: string;
		actions: Action[];
		cancelLabel?: string;
		onClose?: () => void;
	} = $props();

	function close() {
		open = false;
		onClose?.();
	}

	function pick(action: Action) {
		action.onSelect();
		close();
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}
</script>

<svelte:window onkeydown={open ? onKeydown : undefined} />

{#if open}
	<div class="scrim" onclick={close} role="presentation"></div>
	<div class="action-sheet" role="dialog" aria-modal="true" aria-label={title}>
		<div class="group">
			{#if title}<p class="as-title">{title}</p>{/if}
			{#each actions as action (action.label)}
				<button
					type="button"
					class="as-item"
					class:destructive={action.destructive}
					onclick={() => pick(action)}
				>
					{action.label}
				</button>
			{/each}
		</div>
		<div class="group">
			<button type="button" class="as-item cancel" onclick={close}>{cancelLabel}</button>
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
	.action-sheet {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 41;
		max-width: var(--container);
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0 0.5rem calc(0.5rem + env(safe-area-inset-bottom));
		animation: rise var(--dur-sheet) var(--ease-ios);
	}
	.group {
		background: var(--surface);
		border-radius: var(--radius);
		overflow: hidden;
	}
	.as-title {
		margin: 0;
		padding: 0.7rem 1rem;
		text-align: center;
		font-size: var(--text-footnote);
		color: var(--text-muted);
		border-bottom: 1px solid var(--separator);
	}
	.as-item {
		display: block;
		width: 100%;
		min-height: 56px;
		padding: 0.9rem 1rem;
		border: none;
		background: transparent;
		font: inherit;
		font-size: var(--text-title-3);
		color: var(--tint);
		cursor: pointer;
	}
	.as-item + .as-item {
		box-shadow: inset 0 1px 0 var(--separator);
	}
	.as-item:hover {
		background: var(--fill-quaternary);
	}
	.as-item.destructive {
		color: var(--red-strong);
	}
	.as-item.cancel {
		font-weight: 600;
		color: var(--tint);
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
