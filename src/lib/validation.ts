import * as v from 'valibot';

/**
 * Guard against open-redirect attacks.
 * Returns `p` only if it is a root-relative local path. Rejects:
 *  - protocol-relative URLs (`//evil.com`)
 *  - backslash variants (`/\evil.com`) — browsers normalise `\` to `/`
 *  - paths with control characters, which browsers strip and can re-expose the above
 */
export function safeLocalPath(p: string | null | undefined, fallback = '/'): string {
	const isLocal = (s: string) =>
		s.startsWith('/') && // must be root-relative
		s[1] !== '/' && // not protocol-relative //evil.com
		s[1] !== '\\' && // not backslash trick /\evil.com
		// eslint-disable-next-line no-control-regex
		!/[\u0000-\u001f]/.test(s); // no control chars (\t \n \r … get stripped by browsers)
	if (typeof p === 'string' && isLocal(p)) return p;
	return isLocal(fallback) ? fallback : '/';
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
