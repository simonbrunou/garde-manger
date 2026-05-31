<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { IconName } from './Icon.svelte';

	type SwipeAction = {
		label: string;
		icon?: IconName;
		variant?: 'default' | 'destructive';
		onTrigger: () => void;
	};

	let {
		actions,
		children
	}: {
		actions: SwipeAction[];
		children: Snippet;
	} = $props();

	// Reveal distance per action button (px). The row content translates left by
	// up to `actions.length * BTN` to expose the trailing action drawer.
	const BTN = 88;
	const maxReveal = $derived(actions.length * BTN);

	let offset = $state(0); // translateX of the content (0..-maxReveal)
	let dragging = $state(false);
	let startX = 0;
	let startOffset = 0;

	function onpointerdown(e: PointerEvent) {
		if (e.button !== 0) return;
		dragging = true;
		startX = e.clientX;
		startOffset = offset;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function onpointermove(e: PointerEvent) {
		if (!dragging) return;
		const dx = e.clientX - startX;
		let next = startOffset + dx;
		if (next > 0) next = 0;
		// rubber-band past the fully-open position
		if (next < -maxReveal) next = -maxReveal + (next + maxReveal) * 0.4;
		offset = next;
	}

	function onpointerup(e: PointerEvent) {
		if (!dragging) return;
		dragging = false;
		const el = e.currentTarget as HTMLElement;
		if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
		// Snap open if dragged past the halfway point of the first button.
		offset = offset < -BTN / 2 ? -maxReveal : 0;
	}

	function trigger(action: SwipeAction) {
		action.onTrigger();
		offset = 0;
	}
</script>

<div class="swipe">
	<div class="actions" aria-hidden={offset === 0}>
		{#each actions as action (action.label)}
			<button
				type="button"
				class="action"
				class:destructive={action.variant === 'destructive'}
				style="width:{BTN}px"
				onclick={() => trigger(action)}
				tabindex={offset === 0 ? -1 : 0}
			>
				{action.label}
			</button>
		{/each}
	</div>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="content"
		class:dragging
		style="transform: translateX({offset}px)"
		{onpointerdown}
		{onpointermove}
		{onpointerup}
		onpointercancel={onpointerup}
	>
		{@render children()}
	</div>
</div>

<style>
	.swipe {
		position: relative;
		overflow: hidden;
		border-radius: var(--radius);
	}
	.actions {
		position: absolute;
		inset: 0 0 0 auto;
		display: flex;
		height: 100%;
	}
	.action {
		border: none;
		color: var(--on-accent);
		background: var(--green-strong);
		font: inherit;
		font-weight: 700;
		font-size: var(--text-footnote);
		cursor: pointer;
	}
	.action.destructive {
		background: var(--red-strong);
	}
	.content {
		position: relative;
		background: var(--bg);
		touch-action: pan-y;
	}
	.content:not(.dragging) {
		transition: transform var(--dur-fast) var(--ease-ios);
	}
</style>
