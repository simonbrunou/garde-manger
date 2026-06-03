import type { RequestHandler } from './$types';

// Only the public, indexable landing page is listed (login/signup/join are
// noindex). The landing page is bilingual, so we advertise both language URLs
// with reciprocal hreflang alternates.
export const prerender = false;

export const GET: RequestHandler = ({ url }) => {
	const origin = url.origin;
	const alternates = `
			<xhtml:link rel="alternate" hreflang="fr" href="${origin}/?lang=fr" />
			<xhtml:link rel="alternate" hreflang="en" href="${origin}/?lang=en" />
			<xhtml:link rel="alternate" hreflang="x-default" href="${origin}/" />`;

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
	<url>
		<loc>${origin}/</loc>${alternates}
		<changefreq>monthly</changefreq>
		<priority>1.0</priority>
	</url>
	<url>
		<loc>${origin}/?lang=fr</loc>${alternates}
	</url>
	<url>
		<loc>${origin}/?lang=en</loc>${alternates}
	</url>
</urlset>
`;

	return new Response(body, {
		headers: {
			'content-type': 'application/xml; charset=utf-8',
			'cache-control': 'public, max-age=3600'
		}
	});
};
