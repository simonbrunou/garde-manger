<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { m } from '$lib/i18n';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const t = $derived(m(data.locale));
</script>

<svelte:head>
	<title>{t.add_title}</title>
</svelte:head>

{#if form?.message}
	<p class="error" role="alert">{form.message}</p>
{/if}

{#if data.noHousehold}
	<EmptyState icon="households" title={t.add_no_household}>
		<Button href="/households" variant="primary">{t.nav_create_household}</Button>
	</EmptyState>
{:else if data.selectedFood}
	<!-- ── FOCUSED CONFIRM (scroll-trap fix: form is the whole view) ── -->
	{@const food = data.selectedFood}
	{@const defaultEst = data.defaultEstimate}
	{@const foodName = data.locale === 'fr' ? food.nameFr : food.nameEn}

	<a class="back" href={`/add?q=${encodeURIComponent(data.q)}`}>{t.add_change_food}</a>
	<h1>{t.add_fresh_form_title}: {foodName}</h1>

	<Card>
		<form method="POST" action="?/addFresh" class="add-form">
			<input type="hidden" name="foodId" value={food.id} />

			<!-- Location select -->
			<div class="field">
				<label for="fresh-location">{t.add_location_label}</label>
				<select id="fresh-location" name="location" required>
					{#each ['pantry', 'fridge', 'freezer'] as loc (loc)}
						{@const est = data.locationEstimates?.find(
							(e: { location: string }) => e.location === loc
						)}
						<option value={loc} selected={loc === food.defaultLocation}>
							{loc === 'pantry'
								? t.add_location_pantry
								: loc === 'fridge'
									? t.add_location_fridge
									: t.add_location_freezer}
							{#if est && est.date}
								({t.add_estimate_prefix} {est.date})
							{/if}
						</option>
					{/each}
				</select>
			</div>

			<!-- Estimate display (amber info box) -->
			{#if defaultEst && defaultEst.date}
				<div class="estimate-box" role="note">
					<p>
						<strong>{t.add_estimate_prefix} {defaultEst.date}</strong>
					</p>
					<p class="estimate-note">{t.add_estimate_note}</p>
				</div>
			{:else if defaultEst && defaultEst.guidance}
				<div class="estimate-box estimate-guidance" role="note">
					<p>{t.add_estimate_guidance}</p>
				</div>
			{/if}

			<!-- Editable best-by date -->
			<div class="field">
				<label for="fresh-bestByDate">{t.add_bestby_label}</label>
				<input type="date" id="fresh-bestByDate" name="bestByDate" value={defaultEst?.date ?? ''} />
			</div>

			<!-- Quantity -->
			<div class="field">
				<label for="fresh-quantity">{t.add_quantity_label}</label>
				<input type="number" id="fresh-quantity" name="quantity" min="1" max="99" value="1" />
			</div>

			<Button type="submit" variant="primary" full>{t.add_fresh_submit}</Button>
		</form>
	</Card>
{:else}
	<!-- ── CHOOSER ── -->
	<h1>{t.add_title}</h1>
	<div class="methods">
		<a class="method" href="/scan">
			<span class="m-icon"><Icon name="scan" size={22} /></span>
			<span class="m-label">{t.add_method_scanner}</span>
			<Icon name="chevron-right" size={18} class="m-chev" />
		</a>

		<details class="method-d" open={data.q !== ''}>
			<summary>
				<span class="m-icon"><Icon name="cat-veg" size={22} /></span>
				<span class="m-label">{t.add_method_fresh}</span>
			</summary>
			<form method="GET" action="/add" class="search">
				<input
					type="search"
					name="q"
					value={data.q}
					placeholder={t.add_search_placeholder}
					autocomplete="off"
					aria-label={t.add_search_label}
				/>
				<Button type="submit" variant="secondary">{t.add_search_submit}</Button>
			</form>
			{#if data.results && data.results.length > 0}
				<ul class="results">
					{#each data.results as { food } (food.id)}
						<li>
							<a href={`/add?food=${food.id}&q=${encodeURIComponent(data.q)}`}>
								<span>{data.locale === 'fr' ? food.nameFr : food.nameEn}</span>
								{#if data.locale === 'fr' ? food.subtitleFr : food.subtitleEn}
									<span class="sub">{data.locale === 'fr' ? food.subtitleFr : food.subtitleEn}</span
									>
								{/if}
							</a>
						</li>
					{/each}
				</ul>
			{:else if data.q !== ''}
				<p class="muted">{t.add_no_results}</p>
			{/if}
		</details>

		<details class="method-d">
			<summary>
				<span class="m-icon"><Icon name="edit" size={22} /></span>
				<span class="m-label">{t.add_method_custom}</span>
			</summary>
			<form method="POST" action="?/addCustom" class="add-form">
				<!-- Custom name -->
				<div class="field">
					<label for="custom-name">{t.add_custom_name_label}</label>
					<input
						type="text"
						id="custom-name"
						name="customName"
						required
						maxlength="120"
						placeholder={t.add_custom_name_placeholder}
					/>
				</div>

				<!-- Location -->
				<div class="field">
					<label for="custom-location">{t.add_location_label}</label>
					<select id="custom-location" name="location" required>
						<option value="pantry">{t.add_location_pantry}</option>
						<option value="fridge" selected>{t.add_location_fridge}</option>
						<option value="freezer">{t.add_location_freezer}</option>
					</select>
				</div>

				<!-- Best-by date (optional) -->
				<div class="field">
					<label for="custom-bestByDate">{t.add_bestby_label} ({t.add_optional})</label>
					<input type="date" id="custom-bestByDate" name="bestByDate" />
				</div>

				<!-- Use-by date (optional) -->
				<div class="field">
					<label for="custom-useByDate">{t.add_useby_label} ({t.add_optional})</label>
					<input type="date" id="custom-useByDate" name="useByDate" />
				</div>

				<!-- Quantity -->
				<div class="field">
					<label for="custom-quantity">{t.add_quantity_label}</label>
					<input type="number" id="custom-quantity" name="quantity" min="1" max="99" value="1" />
				</div>

				<Button type="submit" variant="primary" full>{t.add_custom_submit}</Button>
			</form>
		</details>
	</div>
{/if}

<style>
	.back {
		display: inline-block;
		margin-bottom: 0.6rem;
		font-weight: 700;
		color: var(--text-muted);
	}
	.methods {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
		margin-top: 1rem;
	}
	.method,
	.method-d {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		box-shadow: var(--shadow-sm);
		padding: 0.9rem 1rem;
	}
	.method {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		color: inherit;
	}
	.method:hover {
		text-decoration: none;
		background: var(--surface-2);
	}
	.m-icon {
		width: 40px;
		height: 40px;
		border-radius: 12px;
		flex: none;
		display: grid;
		place-items: center;
		background: var(--green-tint);
		color: var(--green-dark);
	}
	.m-label {
		font-weight: 700;
	}
	.method :global(.m-chev) {
		margin-left: auto;
		color: var(--text-muted);
	}
	.method-d > summary {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		cursor: pointer;
		list-style: none;
		font-weight: 700;
	}
	.method-d > summary::-webkit-details-marker {
		display: none;
	}
	.method-d[open] > summary {
		margin-bottom: 0.9rem;
	}
	.search {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.8rem;
	}
	.search input {
		flex: 1;
	}
	.results {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.results li {
		border-bottom: 1px solid var(--border);
	}
	.results li a {
		display: block;
		padding: 0.7rem 0.2rem;
		color: inherit;
	}
	.results li a:hover {
		text-decoration: none;
		background: var(--surface-2);
	}
	.results .sub {
		display: block;
		font-size: 0.8rem;
		color: var(--text-muted);
	}
	.add-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.estimate-box {
		background: var(--amber-tint);
		border: 1px solid var(--amber);
		border-radius: var(--radius-sm);
		padding: 0.6rem 0.8rem;
		font-size: 0.9rem;
	}
	.estimate-box p {
		margin: 0.2rem 0;
	}
	.estimate-note {
		color: var(--amber-dark);
		font-size: 0.8rem;
	}
	.estimate-guidance {
		background: var(--amber-tint);
		border-color: var(--amber-dark);
	}
	.muted {
		color: var(--text-muted);
	}
</style>
