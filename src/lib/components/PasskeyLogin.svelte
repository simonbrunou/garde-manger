<script lang="ts">
	import { browser } from '$app/environment';
	import { startAuthentication } from '@simplewebauthn/browser';
	import { isPasskeyCancellation } from '$lib/passkeyError';
	import type { Messages } from '$lib/i18n';

	interface Props {
		redirectTo?: string;
		t: Messages;
	}

	let { redirectTo = '/garde-manger', t }: Props = $props();

	let errorMessage = $state('');
	let loading = $state(false);

	const supportsPasskeys = browser && typeof PublicKeyCredential !== 'undefined';

	async function handleLogin() {
		errorMessage = '';
		loading = true;
		try {
			const optRes = await fetch('/api/webauthn/authenticate/options', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: '{}'
			});
			if (!optRes.ok) throw new Error("Impossible d'obtenir les options");
			const optionsJSON = await optRes.json();

			const authResponse = await startAuthentication({ optionsJSON });

			const verRes = await fetch('/api/webauthn/authenticate/verify', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(authResponse)
			});
			const verData = await verRes.json();

			if (verData.verified) {
				window.location.href = redirectTo;
			} else {
				errorMessage = t.auth_passkey_login_failed;
			}
		} catch (err: unknown) {
			// User cancellation/abort is normal — stay silent; only real failures show a message.
			if (!isPasskeyCancellation(err)) {
				errorMessage = t.auth_passkey_login_cancelled;
			}
		} finally {
			loading = false;
		}
	}
</script>

{#if supportsPasskeys}
	<div class="passkey-login">
		<button type="button" class="btn btn-secondary" onclick={handleLogin} disabled={loading}>
			🔑 {t.auth_passkey_login}
		</button>
		{#if errorMessage}
			<p class="error" role="alert">{errorMessage}</p>
		{/if}
	</div>
{/if}

<style>
	.passkey-login {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.passkey-login .btn {
		width: 100%;
	}
</style>
