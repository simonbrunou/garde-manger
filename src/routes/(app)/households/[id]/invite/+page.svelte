<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { m } from '$lib/i18n';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const t = $derived(m(data.locale));
</script>

<main>
	<h1>{t.invite_title}</h1>

	{#if form?.message}
		<p class="error" role="alert">{form.message}</p>
	{/if}

	<form method="POST" action="?/create" class="invite-form">
		<div class="field">
			<label for="role">{t.invite_role_label}</label>
			<select id="role" name="role">
				<option value="member">{t.invite_role_member}</option>
				<option value="admin">{t.invite_role_admin}</option>
			</select>
		</div>

		<button type="submit" class="btn btn-primary">{t.invite_submit}</button>
	</form>

	{#if form?.link}
		<section class="invite-link card">
			<h2>{t.invite_link_section_title}</h2>
			<p>{t.invite_link_instructions}</p>
			<input type="text" readonly value={form.link} />
			<!-- Future enhancement: generate a QR code for the link (e.g. with qrcode.js or server-rendered SVG) -->
		</section>
	{/if}

	<p><a href="/households/{data.householdId}/members">{t.invite_back}</a></p>
</main>

<style>
	.invite-form {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
		align-items: flex-start;
		max-width: 540px;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		width: 100%;
	}

	.invite-link {
		margin-top: 1.5rem;
		max-width: 540px;
	}

	.invite-link input {
		background: var(--surface-2);
	}
</style>
