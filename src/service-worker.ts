/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

// Give `self` the correct ServiceWorkerGlobalScope typing inside the worker.
const sw = self as unknown as ServiceWorkerGlobalScope;

// Per-deployment cache names so a new version invalidates the old caches.
const CACHE = 'gm-cache-' + version;
const DYNAMIC = 'gm-dynamic-' + version;

// Precache the app shell AND the scanner WASM: `build` includes every Vite-emitted
// hashed asset (the zxing .wasm is imported with `?url`, so it lands here), and
// `files` is everything in `static/` (manifest + icons).
const ASSETS = [...build, ...files];
const ASSET_SET = new Set(ASSETS);

// Authenticated / dynamic / sensitive route prefixes: NEVER touch the cache for
// these — always go to the network so we never persist another user's data or a
// stale authenticated response.
const NETWORK_ONLY_PREFIXES = ['/api', '/internal', '/logout', '/login'];

function isNetworkOnly(pathname: string): boolean {
	return NETWORK_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

/** Delete every key in the dynamic cache (session-boundary / logout purge). */
async function clearDynamic(): Promise<void> {
	try {
		await caches.delete(DYNAMIC);
	} catch {
		// Ignore: clearing the cache is best-effort and must never break a response.
	}
}

// ── install: precache the app shell + WASM, then take over immediately ──────────
sw.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE);
			await cache.addAll(ASSETS);
			await sw.skipWaiting();
		})()
	);
});

// ── activate: drop caches from previous deployments, claim open clients ─────────
sw.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) {
				if (key !== CACHE && key !== DYNAMIC) await caches.delete(key);
			}
			await sw.clients.claim();
		})()
	);
});

// ── fetch ───────────────────────────────────────────────────────────────────────
sw.addEventListener('fetch', (event) => {
	const { request } = event;

	// Only ever handle GET. POST/PUT/DELETE etc. must hit the network untouched —
	// caching a mutation would be both wrong and a security hole.
	if (request.method !== 'GET') return;

	const url = new URL(request.url);

	// Leave cross-origin requests (push services, third parties) to the network.
	if (url.origin !== location.origin) return;

	const isNavigation = request.mode === 'navigate';

	// SECURITY: never cache authenticated/dynamic/sensitive routes.
	if (isNetworkOnly(url.pathname)) {
		// At the session boundary (navigating to /login or /logout) purge the
		// dynamic cache so a different user on this device cannot read the previous
		// user's cached pages while offline.
		if (isNavigation && (url.pathname === '/login' || url.pathname === '/logout')) {
			event.waitUntil(clearDynamic());
		}
		return; // network-only: don't call respondWith, let it pass through.
	}

	// Content-hashed build assets + static files are immutable → cache-first.
	if (ASSET_SET.has(url.pathname)) {
		event.respondWith(cacheFirst(url.pathname, request));
		return;
	}

	// Navigations and other same-origin GETs (inventory pages, view-only offline)
	// → network-first with a cached fallback.
	event.respondWith(networkFirst(request, isNavigation));
});

/** Immutable assets: serve from cache, fall back to the network on a miss. */
async function cacheFirst(key: string, request: Request): Promise<Response> {
	try {
		const cache = await caches.open(CACHE);
		const cached = await cache.match(key);
		if (cached) return cached;
	} catch {
		// fall through to the network
	}
	return fetch(request);
}

/**
 * Network-first: try the network, store a fresh good copy in the dynamic cache,
 * and on failure fall back to the cached copy. For navigations with nothing
 * cached, return a tiny inline offline page rather than erroring.
 */
async function networkFirst(request: Request, isNavigation: boolean): Promise<Response> {
	try {
		const response = await fetch(request);

		// Offline, `fetch` may resolve to a non-Response — guard before using it.
		if (!(response instanceof Response)) throw new Error('invalid fetch response');

		// Only cache safe, complete responses. Never cache opaque (cross-origin,
		// unreadable) responses or non-2xx errors.
		if (response.ok && response.type !== 'opaque') {
			const clone = response.clone();
			try {
				const cache = await caches.open(DYNAMIC);
				await cache.put(request, clone);
			} catch {
				// Caching is best-effort; never let it break the live response.
			}
		}

		return response;
	} catch (err) {
		try {
			const cache = await caches.open(DYNAMIC);
			const cached = await cache.match(request);
			if (cached) return cached;
		} catch {
			// fall through to the offline fallback
		}

		if (isNavigation) return offlineFallback();
		throw err;
	}
}

/** Minimal inline offline page (no network needed) for uncached navigations. */
function offlineFallback(): Response {
	const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Hors-ligne</title></head>
<body style="font-family:system-ui,sans-serif;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:1.5rem;color:#1e293b;background:#ffffff">
<main><p style="font-size:1.1rem;margin:0 0 .5rem">Hors-ligne — lecture seule</p>
<p style="color:#64748b;margin:0">Offline — view only</p></main>
</body></html>`;
	return new Response(html, {
		status: 200,
		headers: { 'content-type': 'text/html; charset=utf-8' }
	});
}

// ── push ──────────────────────────────────────────────────────────────────────
// Payload: the declarative shape `{ web_push: 8030, notification: { title, body,
// navigate, lang } }` (also tolerate a bare `{ title, body, navigate }`). We must
// ALWAYS show exactly one visible notification — iOS revokes silent pushes — so we
// fall back to sensible copy if parsing fails.
sw.addEventListener('push', (event) => {
	let title = 'Garde-Manger';
	let body = 'Vous avez une nouvelle notification.';
	let navigate: string | undefined;
	let lang: string | undefined;

	try {
		const data = event.data?.json() as
			| { notification?: { title?: string; body?: string; navigate?: string; lang?: string } }
			| { title?: string; body?: string; navigate?: string; lang?: string }
			| undefined;

		if (data) {
			const n = 'notification' in data && data.notification ? data.notification : data;
			if (typeof n.title === 'string' && n.title) title = n.title;
			if (typeof n.body === 'string' && n.body) body = n.body;
			if (typeof n.navigate === 'string') navigate = n.navigate;
			if (typeof n.lang === 'string') lang = n.lang;
		}
	} catch {
		// Keep the fallback title/body — never show nothing.
	}

	event.waitUntil(
		sw.registration.showNotification(title, {
			body,
			lang,
			data: { navigate },
			badge: '/icons/badge-72.png',
			icon: '/icons/icon-192.png'
		})
	);
});

// ── notificationclick: focus an existing matching client, else open a window ────
sw.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const navigate =
		(event.notification.data && (event.notification.data as { navigate?: string }).navigate) || '/';

	event.waitUntil(
		(async () => {
			const target = new URL(navigate, location.origin).href;
			const clientList = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true });
			for (const client of clientList) {
				if (client.url === target && 'focus' in client) return client.focus();
			}
			return sw.clients.openWindow(navigate);
		})()
	);
});

// ── message: belt-and-suspenders cache clear (e.g. on logout from the page) ─────
sw.addEventListener('message', (event) => {
	const data = event.data as { type?: string } | undefined;
	if (data && data.type === 'clear-cache') {
		event.waitUntil(clearDynamic());
	}
});

export {};
