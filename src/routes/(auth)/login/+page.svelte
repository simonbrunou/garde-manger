<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import PasskeyLogin from '$lib/components/PasskeyLogin.svelte';
	import { m } from '$lib/i18n';

	let { form, data }: { form: ActionData; data: PageData } = $props();
	const t = $derived(m(data.locale));
</script>

<main>
	<h1>{t.auth_login_title}</h1>

	{#if form?.message}
		<p class="error" role="alert">{form.message}</p>
	{/if}

	<form method="POST">
		<input type="hidden" name="redirectTo" value={data.redirectTo} />

		<div>
			<label for="email">{t.auth_email_label}</label>
			<input type="email" id="email" name="email" autocomplete="email" required />
		</div>

		<div>
			<label for="password">{t.auth_password_label}</label>
			<input
				type="password"
				id="password"
				name="password"
				autocomplete="current-password"
				required
			/>
		</div>

		<button type="submit">{t.auth_login_submit}</button>
	</form>

	<PasskeyLogin redirectTo={data.redirectTo} />

	<p><a href="/signup">{t.auth_login_no_account}</a></p>
</main>
