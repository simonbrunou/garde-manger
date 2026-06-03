import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	// Logged-in visitors skip the marketing page and go straight to the app.
	if (locals.user) redirect(303, '/garde-manger');
	// `origin` lets the page build absolute canonical/OG/hreflang URLs that work
	// behind the reverse proxy (SvelteKit derives it from ORIGIN/PROTOCOL_HEADER).
	const langParam = url.searchParams.get('lang');
	return {
		locale: locals.locale,
		origin: url.origin,
		langParam: langParam === 'fr' || langParam === 'en' ? langParam : null
	};
};
