<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import PasskeyLogin from '$lib/components/PasskeyLogin.svelte';
	import { m } from '$lib/i18n';

	let { form, data }: { form: ActionData; data: PageData } = $props();
	const t = $derived(m(data.locale));
</script>

<svelte:head>
	<title>{t.auth_login_title} · Garde-Manger</title>
	<meta name="description" content={t.meta_login_description} />
	<meta name="robots" content="noindex, follow" />
</svelte:head>

<main class="auth-page">
	<div class="auth-card card">
		<h1 class="auth-title">🥕 {t.auth_login_title}</h1>

		{#if form?.message}
			<p class="error" role="alert">{form.message}</p>
		{/if}

		<form method="POST" class="auth-form">
			<input type="hidden" name="redirectTo" value={data.redirectTo} />

			<div class="field">
				<label for="email">{t.auth_email_label}</label>
				<input type="email" id="email" name="email" autocomplete="email" required />
			</div>

			<div class="field">
				<label for="password">{t.auth_password_label}</label>
				<input
					type="password"
					id="password"
					name="password"
					autocomplete="current-password"
					required
				/>
			</div>

			<button type="submit" class="btn btn-primary">{t.auth_login_submit}</button>
		</form>

		<div class="auth-divider" aria-hidden="true"></div>

		<PasskeyLogin redirectTo={data.redirectTo} {t} />

		<p class="auth-alt"><a href="/signup">{t.auth_login_no_account}</a></p>
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

	.auth-divider {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin: 1.1rem 0;
		color: var(--text-muted);
		font-size: 0.8rem;
	}

	.auth-divider::before,
	.auth-divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--border);
	}

	.auth-alt {
		text-align: center;
		margin: 1.1rem 0 0;
		font-size: 0.92rem;
	}
</style>
