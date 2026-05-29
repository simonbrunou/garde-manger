<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { m } from '$lib/i18n';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const t = $derived(m(data.locale));
</script>

<svelte:head>
	<title>{t.add_title}</title>
</svelte:head>

<h1>{t.add_title}</h1>

{#if form?.message}
	<p class="error" role="alert">{form.message}</p>
{/if}

{#if data.noHousehold}
	<p>{t.add_no_household}</p>
	<a href="/households">{t.nav_create_household}</a>
{:else}
	<!-- ── Method choice ── -->
	<section class="add-methods">
		<!-- Scanner → /scan -->
		<a href="/scan" class="method-card method-link">
			<span class="method-icon">📷</span>
			<span class="method-label">{t.add_method_scanner}</span>
		</a>

		<!-- Fresh produce from catalogue -->
		<details class="method-card" open={!!data.selectedFood || data.q !== ''}>
			<summary>
				<span class="method-icon">🥕</span>
				<span class="method-label">{t.add_method_fresh}</span>
			</summary>

			<!-- Search form (GET) -->
			<form method="GET" action="/add" class="search-form">
				<label for="q">{t.add_search_label}</label>
				<div class="search-row">
					<input
						type="search"
						id="q"
						name="q"
						value={data.q}
						placeholder={t.add_search_placeholder}
						autocomplete="off"
					/>
					<button type="submit" class="btn btn-secondary">{t.add_search_submit}</button>
				</div>
			</form>

			<!-- Results list -->
			{#if data.results && data.results.length > 0}
				<ul class="food-results">
					{#each data.results as { food } (food.id)}
						<li class:selected={data.selectedFood?.id === food.id}>
							<a href="/add?food={food.id}&q={encodeURIComponent(data.q)}">
								{data.locale === 'fr' ? food.nameFr : food.nameEn}
								{#if food.subtitleFr && data.locale === 'fr'}
									<span class="subtitle">{food.subtitleFr}</span>
								{:else if food.subtitleEn && data.locale === 'en'}
									<span class="subtitle">{food.subtitleEn}</span>
								{/if}
							</a>
						</li>
					{/each}
				</ul>
			{:else if data.q !== ''}
				<p class="no-results">{t.add_no_results}</p>
			{/if}

			<!-- Fresh add form (shown when food is selected) -->
			{#if data.selectedFood}
				{@const food = data.selectedFood}
				{@const defaultEst = data.defaultEstimate}
				{@const foodName = data.locale === 'fr' ? food.nameFr : food.nameEn}

				<form method="POST" action="?/addFresh" class="add-form">
					<input type="hidden" name="foodId" value={food.id} />

					<h3>{t.add_fresh_form_title}: {foodName}</h3>

					<!-- Location select -->
					<div class="field">
						<label for="fresh-location">{t.add_location_label}</label>
						<select id="fresh-location" name="location" required>
							{#each ['pantry', 'fridge', 'freezer'] as loc (loc)}
								{@const est = data.locationEstimates?.find((e) => e.location === loc)}
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
						<input
							type="date"
							id="fresh-bestByDate"
							name="bestByDate"
							value={defaultEst?.date ?? ''}
						/>
					</div>

					<!-- Quantity -->
					<div class="field">
						<label for="fresh-quantity">{t.add_quantity_label}</label>
						<input type="number" id="fresh-quantity" name="quantity" min="1" max="99" value="1" />
					</div>

					<button type="submit" class="btn btn-primary">{t.add_fresh_submit}</button>
					<a href="/add?q={encodeURIComponent(data.q)}" class="btn btn-secondary">{t.add_cancel}</a>
				</form>
			{/if}
		</details>

		<!-- Custom entry -->
		<details class="method-card">
			<summary>
				<span class="method-icon">✏️</span>
				<span class="method-label">{t.add_method_custom}</span>
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

				<button type="submit" class="btn btn-primary">{t.add_custom_submit}</button>
			</form>
		</details>
	</section>
{/if}

<style>
	.add-methods {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		max-width: 540px;
		margin: 1.5rem 0;
	}

	.method-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		box-shadow: var(--shadow-sm);
		padding: 1rem;
	}

	.method-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		text-decoration: none;
		color: inherit;
	}

	.method-link:hover {
		background: var(--surface-2);
		border-color: var(--green);
		text-decoration: none;
	}

	.method-icon {
		font-size: 1.4rem;
	}

	.method-label {
		font-weight: 600;
	}

	details > summary {
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		list-style: none;
		font-weight: 600;
		user-select: none;
	}

	details > summary::-webkit-details-marker {
		display: none;
	}

	details[open] > summary {
		margin-bottom: 1rem;
	}

	.search-form {
		margin-bottom: 0.75rem;
	}

	.search-row {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}

	.search-row input {
		flex: 1;
	}

	.food-results {
		list-style: none;
		padding: 0;
		margin: 0.5rem 0 1rem;
	}

	.food-results li {
		border-bottom: 1px solid var(--border);
	}

	.food-results li a {
		display: block;
		padding: 0.4rem 0.25rem;
		text-decoration: none;
		color: inherit;
		border-radius: var(--radius-sm);
	}

	.food-results li a:hover {
		background: var(--surface-2);
		text-decoration: none;
	}

	.food-results li.selected a {
		background: var(--green-tint);
		font-weight: 600;
	}

	.subtitle {
		display: block;
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	.no-results {
		font-size: 0.9rem;
		color: var(--text-muted);
		font-style: italic;
	}

	.add-form {
		margin-top: 1rem;
		border-top: 1px solid var(--border);
		padding-top: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.add-form h3 {
		margin: 0 0 0.5rem;
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
</style>
