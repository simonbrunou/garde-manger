<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import PasskeyEnroll from '$lib/components/PasskeyEnroll.svelte';
	import PushSettings from '$lib/components/PushSettings.svelte';
	import ThemeToggle from '$lib/components/ui/ThemeToggle.svelte';
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

	<section class="card account-section">
		<h2>{t.account_profile_section}</h2>
		<form method="POST" action="?/updateProfile" class="account-form">
			<div class="field">
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
			<div class="field">
				<label for="locale">{t.account_locale_label}</label>
				<select id="locale" name="locale">
					<option value="fr" selected={data.user.locale === 'fr'}>{t.account_locale_fr}</option>
					<option value="en" selected={data.user.locale === 'en'}>{t.account_locale_en}</option>
				</select>
			</div>
			<button type="submit" class="btn btn-primary">{t.account_save}</button>
		</form>
	</section>

	<section class="card account-section">
		<h2>{t.account_theme_section}</h2>
		<ThemeToggle value={data.theme} {t} />
	</section>

	<section class="card account-section">
		<h2>{t.account_households_section}</h2>
		<a class="btn btn-secondary" href="/households">{t.account_manage_households}</a>
	</section>

	<form method="POST" action="/logout" class="logout-form">
		<button type="submit" class="btn btn-ghost">{t.account_logout}</button>
	</form>

	<section class="card account-section">
		<h2>{t.account_passkeys_section}</h2>

		{#if data.credentials.length === 0}
			<p class="muted">{t.account_no_passkeys}</p>
		{:else}
			<ul class="passkey-list">
				{#each data.credentials as cred (cred.id)}
					<li>
						<span class="passkey-name">{cred.deviceLabel ?? 'Passkey'}</span>
						{#if cred.createdAt}
							<span class="passkey-meta">
								— {t.account_passkey_added}
								{new Date(cred.createdAt).toLocaleDateString(dateLocale)}</span
							>
						{/if}
						{#if cred.lastUsedAt}
							<span class="passkey-meta"
								>, {t.account_passkey_last_used}
								{new Date(cred.lastUsedAt).toLocaleDateString(dateLocale)}</span
							>
						{/if}
						<form method="POST" action="?/removePasskey" class="passkey-remove">
							<input type="hidden" name="id" value={cred.id} />
							<button type="submit" class="btn btn-ghost">{t.account_passkey_delete}</button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}

		<PasskeyEnroll />
	</section>

	<PushSettings locale={data.locale} vapidPublicKey={data.vapidPublicKey} />
</main>

<style>
	.account-section {
		margin-bottom: 1rem;
	}

	.account-form {
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

	.passkey-list {
		list-style: none;
		padding: 0;
		margin: 0 0 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.passkey-list li {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
		padding: 0.6rem 0.75rem;
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}

	.passkey-name {
		font-weight: 600;
	}

	.passkey-meta {
		font-size: 0.85rem;
		color: var(--text-muted);
	}

	.passkey-remove {
		margin-left: auto;
	}

	.logout-form {
		margin-top: 1rem;
	}
</style>
