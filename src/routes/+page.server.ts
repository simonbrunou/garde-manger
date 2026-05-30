import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Logged-in visitors skip the marketing page and go straight to the app.
	if (locals.user) redirect(303, '/garde-manger');
	return { locale: locals.locale };
};
