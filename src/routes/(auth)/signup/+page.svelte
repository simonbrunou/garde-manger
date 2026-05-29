<script lang="ts">
	import type { ActionData } from './$types';
	let { form }: { form: ActionData } = $props();
</script>

<main>
	<h1>Créer un compte</h1>

	{#if form?.message}
		<p class="error" role="alert">{form.message}</p>
	{/if}

	<form method="POST">
		<div>
			<label for="email">Adresse e-mail</label>
			<input
				type="email"
				id="email"
				name="email"
				value={form?.email ?? ''}
				autocomplete="email"
				required
			/>
		</div>

		<div>
			<label for="displayName">Nom affiché</label>
			<input
				type="text"
				id="displayName"
				name="displayName"
				value={form?.displayName ?? ''}
				autocomplete="name"
				maxlength="80"
				required
			/>
		</div>

		<div>
			<label for="password">Mot de passe</label>
			<input
				type="password"
				id="password"
				name="password"
				autocomplete="new-password"
				minlength="8"
				required
			/>
		</div>

		<button type="submit">Créer mon compte</button>
	</form>

	<p><a href="/login">Déjà un compte ? Se connecter</a></p>
</main>
