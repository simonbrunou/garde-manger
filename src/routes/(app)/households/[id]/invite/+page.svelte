<script lang="ts">
	import type { ActionData, PageData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<main>
	<h1>Inviter un membre</h1>

	{#if form?.message}
		<p class="error" role="alert">{form.message}</p>
	{/if}

	<form method="POST" action="?/create">
		<div>
			<label for="role">Rôle</label>
			<select id="role" name="role">
				<option value="member">Membre</option>
				<option value="admin">Administrateur</option>
			</select>
		</div>

		<button type="submit">Générer un lien d'invitation</button>
	</form>

	{#if form?.link}
		<section class="invite-link">
			<h2>Lien d'invitation généré</h2>
			<p>Partage ce lien avec la personne à inviter :</p>
			<input type="text" readonly value={form.link} />
			<!-- Future enhancement: generate a QR code for the link (e.g. with qrcode.js or server-rendered SVG) -->
		</section>
	{/if}

	<p><a href="/households/{data.householdId}/members">← Retour aux membres</a></p>
</main>
