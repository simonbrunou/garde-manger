<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';
	import { m, type Locale } from '$lib/i18n';
	import { normalizeBarcode } from '$lib/barcode';
	// Self-hosted, same-origin WASM URL (hashed asset emitted by Vite).
	import zxingWasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';

	interface Props {
		locale: Locale;
	}

	let { locale }: Props = $props();
	const t = $derived(m(locale));

	type Phase = 'starting' | 'searching' | 'detected' | 'denied' | 'unsupported';
	let phase = $state<Phase>('starting');

	let videoEl = $state<HTMLVideoElement | null>(null);

	// Non-reactive runtime handles (no need to be $state).
	let stream: MediaStream | null = null;
	let timer: ReturnType<typeof setTimeout> | null = null;
	let canvas: HTMLCanvasElement | null = null;
	let stopped = false;
	let lastCode: string | null = null;

	// Secure-context + getUserMedia support detection.
	const supported =
		browser &&
		typeof navigator !== 'undefined' &&
		!!navigator.mediaDevices?.getUserMedia &&
		typeof window !== 'undefined' &&
		window.isSecureContext;

	const statusText = $derived(
		phase === 'starting'
			? t.scan_starting
			: phase === 'searching'
				? t.scan_searching
				: phase === 'detected'
					? t.scan_detected
					: phase === 'denied'
						? t.scan_camera_denied
						: t.scan_camera_unsupported
	);

	function teardown() {
		stopped = true;
		if (timer !== null) {
			clearTimeout(timer);
			timer = null;
		}
		if (stream) {
			for (const track of stream.getTracks()) track.stop();
			stream = null;
		}
	}

	onMount(() => {
		if (!supported) {
			phase = 'unsupported';
			return;
		}

		(async () => {
			// Dynamic import keeps the ~1 MB WASM + decoder out of the SSR/main bundle.
			const { BarcodeDetector, prepareZXingModule } = await import('barcode-detector/ponyfill');

			// Point the ZXing fallback at our self-hosted, same-origin .wasm.
			prepareZXingModule({
				overrides: {
					locateFile: (path: string, prefix: string) =>
						path.endsWith('.wasm') ? zxingWasmUrl : prefix + path
				}
			});

			if (stopped) return;

			try {
				stream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: 'environment' },
					audio: false
				});
			} catch {
				phase = 'denied';
				return;
			}

			if (stopped) {
				for (const track of stream.getTracks()) track.stop();
				stream = null;
				return;
			}

			if (videoEl) {
				videoEl.srcObject = stream;
				try {
					await videoEl.play();
				} catch {
					// Autoplay can reject on some browsers; the loop still reads frames.
				}
			}

			phase = 'searching';

			const detector = new BarcodeDetector({
				formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e']
			});
			canvas = document.createElement('canvas');

			const tick = async () => {
				if (stopped) return;

				const video = videoEl;
				if (video && video.videoWidth > 0 && video.videoHeight > 0 && canvas) {
					const maxW = 640;
					const scale = Math.min(1, maxW / video.videoWidth);
					const w = Math.round(video.videoWidth * scale);
					const h = Math.round(video.videoHeight * scale);
					if (canvas.width !== w) canvas.width = w;
					if (canvas.height !== h) canvas.height = h;

					const ctx = canvas.getContext('2d');
					if (ctx) {
						ctx.drawImage(video, 0, 0, w, h);
						try {
							const results = await detector.detect(canvas);
							if (stopped) return;

							let frameCode: string | null = null;
							for (const r of results) {
								const norm = normalizeBarcode(r.rawValue);
								if (norm) {
									frameCode = norm;
									break;
								}
							}

							if (frameCode && frameCode === lastCode) {
								// Confirmed on two consecutive frames.
								phase = 'detected';
								teardown();
								window.location.href = '/scan/' + frameCode;
								return;
							}
							lastCode = frameCode;
						} catch {
							// ZXing throws on frames with no decodable code — normal, ignore.
						}
					}
				}

				if (stopped) return;
				timer = setTimeout(tick, 100);
			};

			timer = setTimeout(tick, 100);
		})();
	});

	onDestroy(() => {
		teardown();
	});
</script>

{#if supported && phase !== 'unsupported'}
	<div class="scanner">
		<div class="frame">
			<video bind:this={videoEl} autoplay playsinline muted aria-label={t.scan_instructions}
			></video>
			<div class="reticle" aria-hidden="true"></div>
		</div>
		<p class="status" role="status">{statusText}</p>
	</div>
{:else if phase === 'unsupported'}
	<p class="status notice" role="status">{t.scan_camera_unsupported}</p>
{/if}

<style>
	.scanner {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-width: 540px;
	}

	.frame {
		position: relative;
		width: 100%;
		aspect-ratio: 4 / 3;
		background: #000;
		border-radius: 8px;
		overflow: hidden;
	}

	video {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.reticle {
		position: absolute;
		inset: 18% 12%;
		border: 2px solid rgba(255, 255, 255, 0.85);
		border-radius: 8px;
		box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.25);
		pointer-events: none;
	}

	.status {
		font-size: 0.9rem;
		color: #555;
		margin: 0;
	}

	.notice {
		background: #fffbeb;
		border: 1px solid #f6ad55;
		border-radius: 6px;
		padding: 0.6rem 0.8rem;
		color: #92400e;
	}
</style>
