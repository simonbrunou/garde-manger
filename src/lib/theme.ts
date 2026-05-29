export type ThemeChoice = 'auto' | 'light' | 'dark';

/** The value to put on <html data-theme="…">. '' means auto (let CSS media decide). */
export function resolveTheme(cookie: string | null | undefined): '' | 'light' | 'dark' {
	return cookie === 'light' || cookie === 'dark' ? cookie : '';
}

/** Clamp an arbitrary string to a valid ThemeChoice (defaults to 'auto'). */
export function normalizeChoice(value: string | null | undefined): ThemeChoice {
	return value === 'light' || value === 'dark' ? value : 'auto';
}

export const THEME_COOKIE = 'gm_theme';
