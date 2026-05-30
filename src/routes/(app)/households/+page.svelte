<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { m } from '$lib/i18n';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const t = $derived(m(data.locale));
</script>

<h1>{t.households_title}</h1>

{#if form?.message}
	<p class="error" role="alert">{form.message}</p>
{/if}

{#if data.households.length > 0}
	<ul class="household-list">
		{#each data.households as h (h.id)}
			<li>
				<a href="/households/{h.id}" class="household-name">{h.name}</a>
				<span class="role-badge">{h.role}</span>
			</li>
		{/each}
	</ul>
{:else}
	<p class="muted">{t.households_no_household}</p>
{/if}

<section class="card create-section">
	<h2>{t.households_create_section}</h2>
	<form method="POST" action="?/create" class="create-form">
		<div class="field">
			<label for="name">{t.households_name_label}</label>
			<input
				type="text"
				id="name"
				name="name"
				required
				minlength="1"
				maxlength="80"
				placeholder={t.households_name_placeholder}
			/>
		</div>
		<button type="submit" class="btn btn-primary">{t.households_create_submit}</button>
	</form>
</section>

<style>
	.household-list {
		list-style: none;
		padding: 0;
		margin: 0 0 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.household-list li {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.7rem 0.85rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		box-shadow: var(--shadow-sm);
	}

	.household-name {
		font-weight: 700;
		flex: 1;
		min-width: 0;
	}

	.role-badge {
		flex-shrink: 0;
		padding: 0.22rem 0.6rem;
		border-radius: var(--radius-pill);
		background: var(--surface-2);
		color: var(--text-muted);
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.create-section {
		margin-top: 0.5rem;
	}

	.create-form {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
		align-items: flex-start;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		width: 100%;
	}
</style>
