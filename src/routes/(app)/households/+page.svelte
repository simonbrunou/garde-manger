<script lang="ts">
	import type { PageServerData, ActionData } from './$types';

	let { data, form }: { data: PageServerData; form: ActionData } = $props();
</script>

<h1>Mes foyers</h1>

{#if form?.message}
	<p class="error" role="alert">{form.message}</p>
{/if}

{#if data.households.length > 0}
	<ul>
		{#each data.households as h}
			<li>
				<a href="/households/{h.id}/members">{h.name}</a>
				<span class="role-badge">{h.role}</span>
			</li>
		{/each}
	</ul>
{:else}
	<p>Vous n'appartenez à aucun foyer. Créez-en un ci-dessous.</p>
{/if}

<section>
	<h2>Créer un foyer</h2>
	<form method="POST" action="?/create">
		<div>
			<label for="name">Nom du foyer</label>
			<input
				type="text"
				id="name"
				name="name"
				required
				minlength="1"
				maxlength="80"
				placeholder="Mon foyer"
			/>
		</div>
		<button type="submit">Créer</button>
	</form>
</section>
