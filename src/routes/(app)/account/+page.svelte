<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import PasskeyEnroll from '$lib/components/PasskeyEnroll.svelte';

	let { form, data }: { form: ActionData; data: PageData } = $props();
</script>

<main>
	<h1>Mon compte</h1>

	{#if form?.message}
		<p class="error" role="alert">{form.message}</p>
	{/if}
	{#if form?.success}
		<p class="success" role="status">Profil mis à jour.</p>
	{/if}

	<section>
		<h2>Profil</h2>
		<form method="POST" action="?/updateProfile">
			<div>
				<label for="displayName">Nom affiché</label>
				<input
					type="text"
					id="displayName"
					name="displayName"
					value={data.user.displayName}
					required
					maxlength="80"
				/>
			</div>
			<div>
				<label for="locale">Langue</label>
				<select id="locale" name="locale">
					<option value="fr" selected={data.user.locale === 'fr'}>Français</option>
					<option value="en" selected={data.user.locale === 'en'}>English</option>
				</select>
			</div>
			<button type="submit">Enregistrer</button>
		</form>
	</section>

	<section>
		<h2>Passkeys</h2>

		{#if data.credentials.length === 0}
			<p>Aucune passkey enregistrée.</p>
		{:else}
			<ul>
				{#each data.credentials as cred (cred.id)}
					<li>
						<span>{cred.deviceLabel ?? 'Passkey'}</span>
						{#if cred.createdAt}
							<span> — ajoutée le {new Date(cred.createdAt).toLocaleDateString('fr-FR')}</span>
						{/if}
						{#if cred.lastUsedAt}
							<span
								>, dernière utilisation le {new Date(cred.lastUsedAt).toLocaleDateString(
									'fr-FR'
								)}</span
							>
						{/if}
						<form method="POST" action="?/removePasskey" style="display:inline">
							<input type="hidden" name="id" value={cred.id} />
							<button type="submit">Supprimer</button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}

		<PasskeyEnroll />
	</section>
</main>
