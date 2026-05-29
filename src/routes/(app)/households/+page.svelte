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
	<ul>
		{#each data.households as h (h.id)}
			<li>
				<a href="/households/{h.id}/members">{h.name}</a>
				<span class="role-badge">{h.role}</span>
			</li>
		{/each}
	</ul>
{:else}
	<p>{t.households_no_household}</p>
{/if}

<section>
	<h2>{t.households_create_section}</h2>
	<form method="POST" action="?/create">
		<div>
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
		<button type="submit">{t.households_create_submit}</button>
	</form>
</section>
