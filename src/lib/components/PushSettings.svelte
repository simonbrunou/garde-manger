<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { m, type Locale } from '$lib/i18n';

	interface Props {
		locale: Locale;
		vapidPublicKey: string;
	}

	let { locale, vapidPublicKey }: Props = $props();
	const t = $derived(m(locale));

	type Status =
		| 'loading'
		| 'unsupported'
		| 'ios-needs-install'
		| 'denied'
		| 'subscribed'
		| 'subscribable'
		| 'reconnect'
		| 'working';

	let status = $state<Status>('loading');
	let errorMessage = $state('');

	function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
		const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
		const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
		const raw = atob(base64);
		const out = new Uint8Array(new ArrayBuffer(raw.length));
		for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
		return out;
	}

	function isStandalone(): boolean {
		return (
			window.matchMedia('(display-mode: standalone)').matches ||
			(navigator as unknown as { standalone?: boolean }).standalone === true
		);
	}

	function isIos(): boolean {
		return /iphone|ipad|ipod/i.test(navigator.userAgent);
	}

	function deviceLabel(): string {
		const platform =
			(navigator as unknown as { platform?: string }).platform || navigator.userAgent;
		return platform.slice(0, 80);
	}

	async function computeStatus(): Promise<Status> {
		// iOS without Home Screen install: push only works once installed.
		if (isIos() && !isStandalone()) return 'ios-needs-install';

		if (
			!('serviceWorker' in navigator) ||
			!('PushManager' in window) ||
			!('Notification' in window)
		) {
			return 'unsupported';
		}

		if (Notification.permission === 'denied') return 'denied';

		const reg = await navigator.serviceWorker.ready;
		const sub = await reg.pushManager.getSubscription();
		if (sub) return 'subscribed';

		// Granted but no active subscription (dropped sub / iOS pushsubscriptionchange).
		if (Notification.permission === 'granted') return 'reconnect';

		return 'subscribable';
	}

	onMount(() => {
		if (!browser) {
			status = 'unsupported';
			return;
		}
		void (async () => {
			try {
				status = await computeStatus();
			} catch {
				status = 'unsupported';
			}
		})();
	});

	async function enable() {
		errorMessage = '';
		status = 'working';
		try {
			const reg = await navigator.serviceWorker.ready;
			// Permission priming: only ask on the click, after the explainer.
			const permission = await Notification.requestPermission();
			if (permission !== 'granted') {
				// User dismissed or blocked — not an error to shout about.
				status = permission === 'denied' ? 'denied' : 'subscribable';
				return;
			}
			const subscription = await reg.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
			});
			const res = await fetch('/api/push/subscribe', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ ...subscription.toJSON(), deviceLabel: deviceLabel() })
			});
			if (!res.ok) throw new Error('subscribe failed');
			status = 'subscribed';
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			if (msg.includes('NotAllowedError')) {
				// User cancelled the permission prompt — stay quiet.
				status = await computeStatus().catch(() => 'subscribable' as Status);
				return;
			}
			errorMessage = t.notif_error;
			status = await computeStatus().catch(() => 'subscribable' as Status);
		}
	}

	async function disable() {
		errorMessage = '';
		status = 'working';
		try {
			const reg = await navigator.serviceWorker.ready;
			const sub = await reg.pushManager.getSubscription();
			if (sub) {
				await fetch('/api/push/unsubscribe', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ endpoint: sub.endpoint })
				});
				await sub.unsubscribe();
			}
			status = 'subscribable';
		} catch {
			errorMessage = t.notif_error;
			status = await computeStatus().catch(() => 'subscribed' as Status);
		}
	}
</script>

<section class="push-settings">
	<h2>{t.notif_section_title}</h2>

	{#if status === 'loading'}
		<p class="muted" role="status">{t.notif_working}</p>
	{:else if status === 'ios-needs-install'}
		<p>{t.notif_ios_install_title}</p>
		<p class="muted">{t.notif_ios_install_steps}</p>
	{:else if status === 'unsupported'}
		<p class="muted" role="status">{t.notif_unsupported}</p>
	{:else if status === 'denied'}
		<p class="muted" role="status">{t.notif_denied}</p>
	{:else if status === 'subscribed'}
		<p role="status">{t.notif_enabled}</p>
		<button type="button" class="btn btn-secondary" onclick={disable}>{t.notif_disable}</button>
	{:else if status === 'reconnect'}
		<p class="muted">{t.notif_explainer}</p>
		<button type="button" class="btn btn-primary" onclick={enable}>{t.notif_reconnect}</button>
	{:else if status === 'working'}
		<p class="muted" role="status">{t.notif_working}</p>
	{:else}
		<p class="muted">{t.notif_explainer}</p>
		<button type="button" class="btn btn-primary" onclick={enable}>{t.notif_enable}</button>
	{/if}

	{#if errorMessage}
		<p class="error" role="alert">{errorMessage}</p>
	{/if}
</section>

<style>
	.push-settings {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		box-shadow: var(--shadow-sm);
		padding: 1rem;
	}

	.push-settings p {
		margin: 0 0 0.75rem;
	}
</style>
