<script lang="ts">
	import { m } from '$lib/i18n';
	import Thumb from '$lib/components/ui/Thumb.svelte';
	import DayBadge from '$lib/components/ui/DayBadge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	let { data } = $props();
	const t = $derived(m(data.locale));
	const it = $derived(data.item);
</script>

<svelte:head><title>{t.item_detail_title}</title></svelte:head>

<header class="head">
	<Thumb
		imagePath={it.imagePath}
		barcode={it.barcode}
		category={it.category}
		size={64}
		alt={it.name}
	/>
	<div class="ht">
		<h1>{it.name}</h1>
	</div>
	<DayBadge band={it.band} effectiveDate={it.effectiveDate} {t} />
</header>
{#if it.addedAt}<p class="added">
		{t.item_added_on}
		{new Intl.DateTimeFormat(data.locale, { dateStyle: 'long' }).format(new Date(it.addedAt))}
	</p>{/if}

<Card>
	<form method="POST" action="?/update" class="edit">
		<label
			>{t.add_location_label}
			<select name="location" value={it.location}>
				<option value="pantry">{t.add_location_pantry}</option>
				<option value="fridge">{t.add_location_fridge}</option>
				<option value="freezer">{t.add_location_freezer}</option>
			</select>
		</label>
		{#if it.dateKind}
			<input type="hidden" name="dateKind" value={it.dateKind} />
			<label
				>{it.dateKind === 'DLC' ? t.dlc_label : t.ddm_label}
				<input type="date" name="date" value={it.dateValue} />
			</label>
		{/if}
		<label
			>{t.add_quantity_label}
			<input type="number" name="quantity" min="1" value={it.quantity} />
		</label>
		<label
			>{t.item_notes_label}
			<textarea name="notes" rows="2" placeholder={t.item_notes_placeholder}>{it.notes}</textarea>
		</label>
		<Button type="submit" full>{t.item_save}</Button>
	</form>
</Card>

<div class="lifecycle">
	<form method="POST" action="?/consume">
		<Button type="submit" variant="secondary" icon="check" full>{t.lifecycle_ate}</Button>
	</form>
	<form method="POST" action="?/discard">
		<Button type="submit" variant="secondary" icon="trash" full>{t.lifecycle_tossed}</Button>
	</form>
</div>

<details class="danger">
	<summary>{t.item_delete}</summary>
	<form method="POST" action="?/remove">
		<Button type="submit" variant="danger" icon="trash" full>{t.item_delete_confirm}</Button>
	</form>
</details>

<style>
	.head {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		margin-bottom: 1.2rem;
	}
	.head h1 {
		margin: 0;
		font-size: 1.3rem;
		overflow-wrap: anywhere;
	}
	.ht {
		flex: 1;
		min-width: 0;
	}
	.edit {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
	}
	.edit label {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.lifecycle {
		display: flex;
		gap: 0.6rem;
		margin: 1rem 0;
	}
	.lifecycle form {
		flex: 1;
		display: flex;
	}
	.danger {
		margin-top: 0.5rem;
	}
	.danger summary {
		color: var(--red-dark);
		font-weight: 700;
		cursor: pointer;
		padding: 0.5rem 0;
	}
	.danger form {
		margin-top: 0.5rem;
	}
	.added {
		color: var(--text-muted);
		font-size: 0.85rem;
		margin: 0 0 1rem;
	}
</style>
