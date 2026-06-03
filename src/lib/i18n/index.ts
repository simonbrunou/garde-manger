import { fr } from './messages/fr';
import { en } from './messages/en';
import type { Messages } from './messages/fr';

export type { Messages };
export type Locale = 'fr' | 'en';

export { fr, en };

export const messages: Record<Locale, Messages> = { fr, en };

export function m(locale: Locale): Messages {
	return messages[locale];
}

export function resolveLocale(o: {
	query?: string | null;
	userLocale?: string | null;
	cookie?: string | null;
	acceptLanguage?: string | null;
}): Locale {
	// `query` (an explicit ?lang=fr|en) wins so each language has a stable,
	// crawlable URL for hreflang. Then the signed-in preference, then the cookie.
	for (const c of [o.query, o.userLocale, o.cookie]) {
		if (c === 'fr' || c === 'en') return c;
	}
	const al = (o.acceptLanguage ?? '').toLowerCase();
	if (al.startsWith('en')) return 'en';
	return 'fr';
}
