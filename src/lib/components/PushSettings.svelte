<script lang="ts">
	import { onMount } from 'svelte';
	import { m } from '$lib/i18n';
	import Toggle from '$lib/components/ui/Toggle.svelte';

	let { locale, vapidPublicKey }: { locale: 'fr' | 'en'; vapidPublicKey: string } = $props();
	const t = $derived(m(locale));

	let supported = $state(false);
	let subscribed = $state(false);
	let busy = $state(false);
	let error = $state('');

	onMount(() => {
		supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
		if (supported) void refresh();
	});

	async function refresh() {
		const reg = await navigator.serviceWorker.getRegistration();
		const sub = await reg?.pushManager.getSubscription();
		subscribed = !!sub;
	}

	async function subscribe() {
		busy = true;
		error = '';
		try {
			const perm = await Notification.requestPermission();
			if (perm !== 'granted') {
				error = t.push_permission_denied;
				busy = false;
				return;
			}
			const reg = await navigator.serviceWorker.ready;
			const sub = await reg.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: vapidPublicKey
			});
			const res = await fetch('/api/push/subscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(sub)
			});
			if (!res.ok) throw new Error('subscribe failed');
			subscribed = true;
		} catch (e) {
			error = t.push_error;
			console.error(e);
		} finally {
			busy = false;
		}
	}

	async function unsubscribe() {
		busy = true;
		error = '';
		try {
			const reg = await navigator.serviceWorker.getRegistration();
			const sub = await reg?.pushManager.getSubscription();
			if (sub) {
				await fetch('/api/push/unsubscribe', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ endpoint: sub.endpoint })
				});
				await sub.unsubscribe();
			}
			subscribed = false;
		} catch (e) {
			error = t.push_error;
			console.error(e);
		} finally {
			busy = false;
		}
	}

	function toggle() {
		if (busy) return;
		void (subscribed ? unsubscribe() : subscribe());
	}
</script>

<section class="card account-section">
	<h2>{t.push_title}</h2>
	<p class="muted">{t.push_description}</p>
	{#if !supported}
		<p class="muted">{t.push_unsupported}</p>
	{:else}
		<div class="row">
			<span>{t.push_enable}</span>
			<Toggle checked={subscribed} disabled={busy} onChange={toggle} ariaLabel={t.push_enable} />
		</div>
	{/if}
	{#if error}<p class="error" role="alert">{error}</p>{/if}
</section>

<style>
	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}
</style>
