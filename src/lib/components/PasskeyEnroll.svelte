<script lang="ts">
	import { browser } from '$app/environment';
	import { startRegistration } from '@simplewebauthn/browser';

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
			if (!optRes.ok) throw new Error("Impossible d'obtenir les options");
			const optionsJSON = await optRes.json();

			const regResponse = await startRegistration({ optionsJSON });

			const verRes = await fetch('/api/webauthn/register/verify', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(regResponse)
			});
			const verData = await verRes.json();

			if (verData.verified) {
				successMessage = '✓ Passkey ajoutée';
				// Refresh the page to update the credential list
				location.reload();
			} else {
				errorMessage = 'Enregistrement échoué. Veuillez réessayer.';
			}
		} catch (err: unknown) {
			// User cancellation is normal — show nothing or a gentle message
			const msg = err instanceof Error ? err.message : String(err);
			if (msg.includes('NotAllowedError') || msg.includes('cancelled') || msg.includes('aborted')) {
				// User cancelled — stay silent
			} else {
				errorMessage = 'Enregistrement annulé ou non supporté.';
			}
		} finally {
			loading = false;
		}
	}
</script>

{#if supportsPasskeys}
	<div class="passkey-enroll">
		<button type="button" onclick={handleEnroll} disabled={loading}> Ajouter une passkey </button>
		{#if successMessage}
			<p class="success" role="status">{successMessage}</p>
		{/if}
		{#if errorMessage}
			<p class="error" role="alert">{errorMessage}</p>
		{/if}
	</div>
{/if}
