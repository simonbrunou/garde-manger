<script lang="ts">
	import { browser } from '$app/environment';
	import { startRegistration } from '@simplewebauthn/browser';
	import { isPasskeyCancellation } from '$lib/passkeyError';
	import type { Messages } from '$lib/i18n';

	let { t }: { t: Messages } = $props();

	let successMessage = $state('');
	let errorMessage = $state('');
	let loading = $state(false);

	const supportsPasskeys = browser && typeof PublicKeyCredential !== 'undefined';

	async function handleEnroll() {
		successMessage = '';
		errorMessage = '';
		loading = true;
		try {
			const optRes = await fetch('/api/webauthn/register/options', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: '{}'
			});
			if (!optRes.ok) throw new Error('Could not fetch WebAuthn options');
			const optionsJSON = await optRes.json();

			const regResponse = await startRegistration({ optionsJSON });

			const verRes = await fetch('/api/webauthn/register/verify', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(regResponse)
			});
			const verData = await verRes.json();

			if (verData.verified) {
				successMessage = '✓ ' + t.account_passkey_add_success;
				// Refresh the page to update the credential list
				location.reload();
			} else {
				errorMessage = t.account_passkey_add_failed;
			}
		} catch (err: unknown) {
			// User cancellation/abort is normal — stay silent; only real failures show a message.
			if (!isPasskeyCancellation(err)) {
				errorMessage = t.account_passkey_add_failed;
			}
		} finally {
			loading = false;
		}
	}
</script>

{#if supportsPasskeys}
	<div class="passkey-enroll">
		<button type="button" onclick={handleEnroll} disabled={loading}>{t.account_passkey_add}</button>
		{#if successMessage}
			<p class="success" role="status">{successMessage}</p>
		{/if}
		{#if errorMessage}
			<p class="error" role="alert">{errorMessage}</p>
		{/if}
	</div>
{/if}
