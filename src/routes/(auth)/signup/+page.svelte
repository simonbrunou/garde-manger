<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { m } from '$lib/i18n';

	let { form, data }: { form: ActionData; data: PageData } = $props();
	const t = $derived(m(data.locale));
</script>

<main>
	<h1>{t.auth_signup_title}</h1>

	{#if form?.message}
		<p class="error" role="alert">{form.message}</p>
	{/if}

	<form method="POST">
		<input type="hidden" name="redirectTo" value={data.redirectTo} />

		<div>
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

		<div>
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

		<div>
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

		<button type="submit">{t.auth_signup_submit}</button>
	</form>

	<p><a href="/login">{t.auth_signup_have_account}</a></p>
</main>
