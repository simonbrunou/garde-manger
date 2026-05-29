import * as v from 'valibot';

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
