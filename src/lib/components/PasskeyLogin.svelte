<script lang="ts">
	import { browser } from '$app/environment';
	import { startAuthentication } from '@simplewebauthn/browser';

	interface Props {
		redirectTo?: string;
	}

	let { redirectTo = '/' }: Props = $props();

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
				errorMessage = 'Authentification échouée. Veuillez réessayer.';
			}
		} catch (err: unknown) {
			// User cancellation is normal — show nothing or a gentle message
			const msg = err instanceof Error ? err.message : String(err);
			if (msg.includes('NotAllowedError') || msg.includes('cancelled') || msg.includes('aborted')) {
				// User cancelled — stay silent
			} else {
				errorMessage = 'Passkey non reconnue ou annulée.';
			}
		} finally {
			loading = false;
		}
	}
</script>

{#if supportsPasskeys}
	<div class="passkey-login">
		<button type="button" onclick={handleLogin} disabled={loading}>
			🔑 Se connecter avec une passkey
		</button>
		{#if errorMessage}
			<p class="error" role="alert">{errorMessage}</p>
		{/if}
	</div>
{/if}
