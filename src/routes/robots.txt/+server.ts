import type { RequestHandler } from './$types';

// Served dynamically so the Sitemap directive can carry the absolute origin
// (SvelteKit derives `url.origin` from ORIGIN/PROTOCOL_HEADER behind the proxy).
export const prerender = false;

export const GET: RequestHandler = ({ url }) => {
	const body = `# Public marketing pages are crawlable; everything else is private.
User-agent: *
Disallow: /api/
Disallow: /internal/
Disallow: /join/
Disallow: /logout
Disallow: /healthz
Disallow: /account
Allow: /

Sitemap: ${url.origin}/sitemap.xml
`;

	return new Response(body, {
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'cache-control': 'public, max-age=3600'
		}
	});
};
