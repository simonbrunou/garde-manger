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
	userLocale?: string | null;
	cookie?: string | null;
	acceptLanguage?: string | null;
}): Locale {
	for (const c of [o.userLocale, o.cookie]) {
		if (c === 'fr' || c === 'en') return c;
	}
	const al = (o.acceptLanguage ?? '').toLowerCase();
	if (al.startsWith('en')) return 'en';
	return 'fr';
}
