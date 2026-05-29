<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { m } from '$lib/i18n';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const t = $derived(m(data.locale));

	const product = $derived(data.noHousehold ? null : data.product);
	const isFound = $derived(product?.status === 'found');
	const productName = $derived(product?.name ?? '');
</script>

<svelte:head>
	<title>{t.scan_confirm_title}</title>
</svelte:head>

<h1>{t.scan_confirm_title}</h1>

{#if form?.message}
	<p class="error" role="alert">{form.message}</p>
{/if}

{#if data.noHousehold}
	<p>{t.add_no_household}</p>
	<a href="/households">{t.nav_create_household}</a>
{:else}
	{#if data.offUnavailable}
		<p class="notice" role="status">{t.scan_off_unavailable}</p>
	{:else if !isFound}
		<p class="notice" role="status">{t.scan_product_unknown}</p>
	{/if}

	<form method="POST" action="?/add" class="confirm-form">
		<input type="hidden" name="barcode" value={data.barcode} />

		{#if isFound && product?.imagePath}
			<img
				src="/products/{data.barcode}/image"
				alt={productName}
				class="product-thumb"
				loading="lazy"
				width="96"
				height="96"
			/>
		{/if}

		<!-- Barcode (read-only) -->
		<div class="field">
			<label for="barcode-display">{t.scan_barcode_label}</label>
			<input type="text" id="barcode-display" value={data.barcode} readonly />
		</div>

		<!-- Product name -->
		<div class="field">
			<label for="name">{t.scan_name_label}</label>
			<input
				type="text"
				id="name"
				name="name"
				value={productName}
				maxlength="200"
				required={!productName}
			/>
		</div>

		<!-- Brand (read-only, when OFF knows it) -->
		{#if isFound && product?.brand}
			<div class="field">
				<label for="brand-display">{t.scan_brand_label}</label>
				<input type="text" id="brand-display" value={product.brand} readonly />
			</div>
		{/if}

		<!-- Use-by date (DLC) — the red hard date is the point of the packaged flow -->
		<div class="field dlc-field">
			<label for="useByDate">{t.scan_dlc_label}</label>
			<input type="date" id="useByDate" name="useByDate" required />
			<span class="dlc-hint">{t.scan_dlc_hint}</span>
		</div>

		<!-- Location -->
		<div class="field">
			<label for="location">{t.add_location_label}</label>
			<select id="location" name="location" required>
				<option value="pantry">{t.add_location_pantry}</option>
				<option value="fridge" selected>{t.add_location_fridge}</option>
				<option value="freezer">{t.add_location_freezer}</option>
			</select>
		</div>

		<!-- Quantity -->
		<div class="field">
			<label for="quantity">{t.add_quantity_label}</label>
			<input type="number" id="quantity" name="quantity" min="1" max="99" value="1" />
		</div>

		<button type="submit" class="btn btn-primary">{t.scan_add_submit}</button>
	</form>

	{#if isFound}
		<p class="attribution">{t.scan_attribution}</p>
	{/if}

	<p><a href="/scan">{t.scan_back}</a></p>
{/if}

<style>
	.confirm-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		max-width: 540px;
		margin: 1.5rem 0;
	}

	.notice {
		background: var(--amber-tint);
		border: 1px solid var(--amber);
		border-radius: var(--radius-sm);
		padding: 0.6rem 0.8rem;
		font-size: 0.9rem;
		color: var(--amber-dark);
		max-width: 540px;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	/* DLC (use-by) is the core idea of the packaged flow — keep it red. */
	.dlc-field label {
		color: var(--red-dark);
		font-weight: 600;
	}

	.dlc-field input {
		border-color: var(--red);
	}

	.dlc-field input:focus-visible {
		outline-color: var(--red);
	}

	.dlc-hint {
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	.product-thumb {
		border-radius: var(--radius-sm);
		object-fit: cover;
	}

	.attribution {
		font-size: 0.8rem;
		color: var(--text-muted);
		max-width: 540px;
	}
</style>
