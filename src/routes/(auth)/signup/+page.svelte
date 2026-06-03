<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { m } from '$lib/i18n';

	let { form, data }: { form: ActionData; data: PageData } = $props();
	const t = $derived(m(data.locale));
</script>

<svelte:head>
	<title>{t.auth_signup_title} · Garde-Manger</title>
	<meta name="description" content={t.meta_signup_description} />
	<meta name="robots" content="noindex, follow" />
</svelte:head>

<main class="auth-page">
	<div class="auth-card card">
		<h1 class="auth-title">🥕 {t.auth_signup_title}</h1>

		{#if form?.message}
			<p class="error" role="alert">{form.message}</p>
		{/if}

		<form method="POST" class="auth-form">
			<input type="hidden" name="redirectTo" value={data.redirectTo} />

			<div class="field">
				<label for="email">{t.auth_email_label}</label>
				<input
					type="email"
					id="email"
					name="email"
					value={form?.email ?? ''}
					autocomplete="email"
					required
				/>
			</div>

			<div class="field">
				<label for="displayName">{t.auth_display_name_label}</label>
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

			<div class="field">
				<label for="password">{t.auth_new_password_label}</label>
				<input
					type="password"
					id="password"
					name="password"
					autocomplete="new-password"
					minlength="8"
					required
				/>
			</div>

			<button type="submit" class="btn btn-primary">{t.auth_signup_submit}</button>
		</form>

		<p class="auth-alt"><a href="/login">{t.auth_signup_have_account}</a></p>
	</div>
</main>

<style>
	.auth-page {
		display: flex;
		justify-content: center;
		padding-top: 3rem;
	}

	.auth-card {
		width: 100%;
		max-width: 26rem;
		padding: 1.75rem 1.5rem;
	}

	.auth-title {
		text-align: center;
		margin-bottom: 1.25rem;
	}

	.auth-form {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.auth-form .btn-primary {
		margin-top: 0.25rem;
		width: 100%;
	}

	.auth-alt {
		text-align: center;
		margin: 1.1rem 0 0;
		font-size: 0.92rem;
	}
</style>
