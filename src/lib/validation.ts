import * as v from 'valibot';

/**
 * Guard against open-redirect attacks.
 * Returns `p` only if it is a local path (starts with '/' but not '//').
 */
export function safeLocalPath(p: string | null | undefined): string {
	if (typeof p === 'string' && p.startsWith('/') && !p.startsWith('//')) {
		return p;
	}
	return '/';
}

export const signupSchema = v.object({
	email: v.pipe(v.string(), v.trim(), v.email('Email invalide')),
	displayName: v.pipe(v.string(), v.trim(), v.minLength(1, 'Nom requis'), v.maxLength(80)),
	password: v.pipe(v.string(), v.minLength(8, 'Au moins 8 caractères')),
	locale: v.optional(v.picklist(['fr', 'en']), 'fr')
});
export const loginSchema = v.object({
	email: v.pipe(v.string(), v.trim(), v.email('Email invalide')),
	password: v.pipe(v.string(), v.minLength(1, 'Mot de passe requis'))
});
