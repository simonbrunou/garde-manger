import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

// adapter-node 6 dropped its runtime ORIGIN variable. Without paths.origin it
// derives the origin per request from the Host header, or PROTOCOL_HEADER /
// HOST_HEADER behind the production proxy (DEPLOY.md §3), and assumes https
// when no protocol header arrives. Production therefore leaves ORIGIN unset at
// build time; plain-http runs with no proxy in front (the e2e server) pin it,
// or every form POST fails SvelteKit's CSRF origin check.
const BUILD_ORIGIN = process.env.ORIGIN || undefined;

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			preprocess: vitePreprocess(),
			adapter: adapter(),
			paths: { origin: BUILD_ORIGIN },
			// Content-Security-Policy. `mode: 'auto'` hashes SvelteKit's own inline
			// bootstrap. 'wasm-unsafe-eval' is required for the ZXing WebAssembly the
			// scanner instantiates; everything else is same-origin (OFF is fetched
			// server-side; the push-service connection is the browser's, not the page).
			// CSRF stays ON separately (origin check) — this is defence in depth.
			csp: {
				mode: 'auto',
				directives: {
					'default-src': ['self'],
					'script-src': ['self', 'wasm-unsafe-eval'],
					'style-src': ['self', 'unsafe-inline'],
					'img-src': ['self', 'data:'],
					'connect-src': ['self'],
					'worker-src': ['self'],
					'manifest-src': ['self'],
					'frame-ancestors': ['none'],
					'base-uri': ['self'],
					'form-action': ['self'],
					'object-src': ['none']
				}
			}
		})
	]
});
