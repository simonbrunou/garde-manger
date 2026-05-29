<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import PasskeyLogin from '$lib/components/PasskeyLogin.svelte';
	let { form, data }: { form: ActionData; data: PageData } = $props();
</script>

<main>
	<h1>Se connecter</h1>

	{#if form?.message}
		<p class="error" role="alert">{form.message}</p>
	{/if}

	<form method="POST">
		<input type="hidden" name="redirectTo" value={data.redirectTo} />

		<div>
			<label for="email">Adresse e-mail</label>
			<input type="email" id="email" name="email" autocomplete="email" required />
		</div>

		<div>
			<label for="password">Mot de passe</label>
			<input
				type="password"
				id="password"
				name="password"
				autocomplete="current-password"
				required
			/>
		</div>

		<button type="submit">Se connecter</button>
	</form>

	<PasskeyLogin redirectTo={data.redirectTo} />

	<p><a href="/signup">Pas encore de compte ? S'inscrire</a></p>
</main>
