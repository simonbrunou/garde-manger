<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import PasskeyEnroll from '$lib/components/PasskeyEnroll.svelte';
	import PushSettings from '$lib/components/PushSettings.svelte';
	import { m } from '$lib/i18n';

	let { form, data }: { form: ActionData; data: PageData } = $props();
	const t = $derived(m(data.locale));
	const dateLocale = $derived(data.locale === 'en' ? 'en-GB' : 'fr-FR');
</script>

<main>
	<h1>{t.account_title}</h1>

	{#if form?.message}
		<p class="error" role="alert">{form.message}</p>
	{/if}
	{#if form?.success}
		<p class="success" role="status">{t.account_profile_updated}</p>
	{/if}

	<section>
		<h2>{t.account_profile_section}</h2>
		<form method="POST" action="?/updateProfile">
			<div>
				<label for="displayName">{t.account_display_name_label}</label>
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
				<label for="locale">{t.account_locale_label}</label>
				<select id="locale" name="locale">
					<option value="fr" selected={data.user.locale === 'fr'}>{t.account_locale_fr}</option>
					<option value="en" selected={data.user.locale === 'en'}>{t.account_locale_en}</option>
				</select>
			</div>
			<button type="submit">{t.account_save}</button>
		</form>
	</section>

	<section>
		<h2>{t.account_passkeys_section}</h2>

		{#if data.credentials.length === 0}
			<p>{t.account_no_passkeys}</p>
		{:else}
			<ul>
				{#each data.credentials as cred (cred.id)}
					<li>
						<span>{cred.deviceLabel ?? 'Passkey'}</span>
						{#if cred.createdAt}
							<span>
								— {t.account_passkey_added}
								{new Date(cred.createdAt).toLocaleDateString(dateLocale)}</span
							>
						{/if}
						{#if cred.lastUsedAt}
							<span
								>, {t.account_passkey_last_used}
								{new Date(cred.lastUsedAt).toLocaleDateString(dateLocale)}</span
							>
						{/if}
						<form method="POST" action="?/removePasskey" style="display:inline">
							<input type="hidden" name="id" value={cred.id} />
							<button type="submit">{t.account_passkey_delete}</button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}

		<PasskeyEnroll />
	</section>

	<PushSettings locale={data.locale} vapidPublicKey={data.vapidPublicKey} />
</main>
