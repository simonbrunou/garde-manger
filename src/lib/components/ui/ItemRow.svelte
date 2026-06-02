<script lang="ts">
	import Thumb from './Thumb.svelte';
	import DayBadge from './DayBadge.svelte';
	import Icon from './Icon.svelte';
	import SwipeActions from './SwipeActions.svelte';
	import type { Messages } from '$lib/i18n';
	import type { Band } from '$lib/server/inventory';

	export interface RowItem {
		id: string;
		name: string;
		location: 'pantry' | 'fridge' | 'freezer';
		dateKind: 'DLC' | 'DDM' | null;
		effectiveDate: string | null;
		band: Band;
		quantity: number;
		barcode: string | null;
		imagePath: string | null;
		category: string | null;
	}

	let { item, locale, t }: { item: RowItem; locale: 'fr' | 'en'; t: Messages } = $props();

	const locLabel = $derived(
		item.location === 'fridge'
			? t.add_location_fridge
			: item.location === 'freezer'
				? t.add_location_freezer
				: t.add_location_pantry
	);
	const dateLabel = $derived(
		item.dateKind && item.effectiveDate
			? `${item.dateKind === 'DLC' ? t.dlc_label : t.ddm_label} ${new Intl.DateTimeFormat(locale, { dateStyle: 'short' }).format(new Date(item.effectiveDate))}`
			: ''
	);

	// Real lifecycle forms (work with NO JS). The inline urgent buttons submit
	// them via the HTML `form=` attribute; the optional swipe enhancement submits
	// the same forms via requestSubmit() when JS is available. Ids track the prop.
	const consumeId = $derived(`consume-${item.id}`);
	const discardId = $derived(`discard-${item.id}`);
	let consumeForm: HTMLFormElement | null = $state(null);
	let discardForm: HTMLFormElement | null = $state(null);

	const swipeActions = $derived([
		{ label: t.lifecycle_ate, onTrigger: () => consumeForm?.requestSubmit() },
		{
			label: t.lifecycle_tossed,
			variant: 'destructive' as const,
			onTrigger: () => discardForm?.requestSubmit()
		}
	]);
</script>

<!-- Lifecycle forms with ids so buttons can submit them via `form=` with no JS. -->
<form id={consumeId} method="POST" action="/?/consume" bind:this={consumeForm} hidden>
	<input type="hidden" name="id" value={item.id} />
</form>
<form id={discardId} method="POST" action="/?/discard" bind:this={discardForm} hidden>
	<input type="hidden" name="id" value={item.id} />
</form>

<SwipeActions actions={swipeActions}>
	<div class="row card">
		<a class="main" href={`/item/${item.id}`}>
			<Thumb
				imagePath={item.imagePath}
				barcode={item.barcode}
				category={item.category}
				alt={item.name}
			/>
			<span class="info">
				<span class="name">{item.name}</span>
				<span class="meta">
					{locLabel}{#if item.quantity > 1}&nbsp;· ×{item.quantity}{/if}{#if dateLabel}&nbsp;· {dateLabel}{/if}
				</span>
			</span>
			<DayBadge band={item.band} effectiveDate={item.effectiveDate} {t} />
		</a>
		<!-- No-JS lifecycle actions: submit the forms above via the `form=` attribute.
		     Urgent rows show them inline; other rows keep them keyboard- and
		     screen-reader-reachable (revealed on focus) so the pointer-only swipe
		     gesture is never the sole path to these actions. -->
		<div class="actions" class:reveal-on-focus={item.band !== 'urgent'}>
			<button type="submit" form={consumeId} class="act eat">
				<Icon name="check" size={15} />{t.lifecycle_ate}
			</button>
			<button type="submit" form={discardId} class="act toss">
				<Icon name="trash" size={15} />{t.lifecycle_tossed}
			</button>
		</div>
	</div>
</SwipeActions>

<style>
	.row {
		padding: 0.7rem 0.8rem;
		position: relative;
	}
	/* Keep non-urgent actions in the DOM (keyboard/SR reachable) but visually
	   hidden until a child is focused — pointer users use the swipe gesture. */
	.actions.reveal-on-focus {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		padding: 0;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
	.actions.reveal-on-focus:focus-within {
		position: static;
		width: auto;
		height: auto;
		margin: 0.6rem 0 0;
		overflow: visible;
		clip-path: none;
		white-space: normal;
	}
	.main {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		color: inherit;
	}
	.main:hover {
		text-decoration: none;
	}
	.info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.name {
		font-weight: 800;
		font-size: 0.95rem;
		line-height: 1.15;
		overflow-wrap: anywhere;
	}
	.meta {
		font-size: 0.78rem;
		color: var(--text-muted);
	}
	.actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.6rem;
	}
	.act {
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		min-height: 44px;
		padding: 0.5rem;
		border-radius: 11px;
		border: none;
		font: inherit;
		font-weight: 800;
		font-size: 0.8rem;
		cursor: pointer;
	}
	.eat {
		background: var(--green-tint);
		color: var(--green-dark);
	}
	.toss {
		background: var(--surface-2);
		color: var(--text-muted);
	}
</style>
