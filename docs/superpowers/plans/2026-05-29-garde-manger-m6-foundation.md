# Garde-Manger M6 · Design-System Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the "Warm & Friendly" design-system foundation — light + warm-dark theming, an icon system, core UI components, and a bottom-nav app shell — with **no feature/behaviour change** to existing screens.

**Architecture:** Theming uses the native CSS `light-dark()` function driven by `color-scheme`, so a single token set serves both themes (DRY, no JS, no FOUC). A `gm_theme` cookie (`auto|light|dark`) is read in `hooks.server.ts` and stamped onto `<html data-theme>` via `transformPageChunk`. The crowded two-row header is replaced by a minimal `AppHeader` (household `<details>` switcher + settings) plus a fixed `BottomNav` with a center **+**. All work is server-rendered (the `(app)` layout sets `csr = false`), so every piece functions without client JavaScript.

**Tech Stack:** SvelteKit 2.57 + Svelte 5 (runes), Bun, `bun:test`, CSS custom properties + `light-dark()`, inline-SVG sprite icons.

---

## Conventions (read once)

- **Run tests:** `bun test` (all) or `bun test <file>` (one). There is no `test` npm script — Bun's native runner picks up `*.test.ts`.
- **Type/lint gate every task:** `bun run format` then `bun run check` then `bun run lint`. (Lint = `prettier --check` + `eslint`; `format` first avoids prettier failures. `bun:sqlite` is synchronous — no `await` on `.get()/.run()/.all()`.)
- **Commit style:** `feat(m6): …` / `refactor(m6): …` / `test(m6): …`, ending with the repo's `Co-Authored-By` trailer.
- **New UI components** live in `src/lib/components/ui/`. **Pure logic** lives in `src/lib/` as `.ts` (so it is `bun:test`-able; `.svelte` files are not unit-tested — no component runner is installed).
- Work happens on the existing branch **`redesign/uiux`**.

## File map

| File | Responsibility | Action |
|---|---|---|
| `src/app.css` | Token set via `light-dark()` + `color-scheme` overrides | modify |
| `src/lib/theme.ts` | `resolveTheme(cookie)` → `''|'light'|'dark'` (pure) | create |
| `src/lib/theme.test.ts` | unit tests for `resolveTheme` | create |
| `src/hooks.server.ts` | read `gm_theme`, stamp `data-theme` + `lang` via `transformPageChunk` | modify |
| `src/app.html` | `%gm.lang%` / `%gm.theme%` placeholders; per-scheme `theme-color` metas | modify |
| `src/lib/i18n/messages/fr.ts`, `en.ts` | nav/theme/account keys | modify |
| `src/lib/i18n/i18n.test.ts` | FR/EN key-parity test | modify |
| `src/routes/+layout.svelte` | inline SVG icon sprite (once per page) | modify |
| `src/lib/components/ui/Icon.svelte` | `<svg><use href="#gm-…"></svg>` | create |
| `src/lib/components/ui/Button.svelte` | primary/secondary/ghost/danger button or link | create |
| `src/lib/components/ui/Card.svelte` | surface container | create |
| `src/lib/components/ui/Chip.svelte` | filter pill link | create |
| `src/lib/components/ui/EmptyState.svelte` | icon + title + body + CTA | create |
| `src/lib/components/ui/BottomNav.svelte` | tab bar + center FAB | create |
| `src/lib/components/ui/AppHeader.svelte` | household `<details>` switcher + settings link | create |
| `src/lib/components/ui/ThemeToggle.svelte` | Auto/Light/Dark form | create |
| `src/routes/(app)/account/+page.server.ts` | `setTheme` action; return current theme | modify |
| `src/routes/(app)/account/+page.svelte` | Thème + Foyers + Déconnexion sections | modify |
| `src/routes/(app)/+layout.svelte` | adopt `AppHeader` + `BottomNav` shell | modify |

---

### Task 1: Theme tokens via `light-dark()`

**Files:**
- Modify: `src/app.css:5-44` (the `:root` block) and add override selectors.

- [ ] **Step 1: Replace the `:root` token block** so every color token resolves through `light-dark(<light>, <dark>)` and `color-scheme` defaults to auto.

Replace the current `:root { … }` (lines 5-44) with:

```css
:root {
	--font:
		ui-rounded, 'SF Pro Rounded', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui,
		'Helvetica Neue', Arial, sans-serif;

	/* Auto by default: light-dark() resolves against this. Forced themes below
	   narrow color-scheme to a single value. */
	color-scheme: light dark;

	/* Surfaces */
	--bg: light-dark(#faf6ee, #1d1811);
	--surface: light-dark(#fffdf9, #2a241b);
	--surface-2: light-dark(#f3ece0, #352e21);
	--border: light-dark(#e9e0d1, #3a3326);
	--border-strong: light-dark(#d9cdb8, #4a412f);

	/* Text */
	--text: light-dark(#322c22, #f1eadd);
	--text-muted: light-dark(#8a7e6b, #a89e8b);

	/* Accents (produce palette, brightened for dark) */
	--green: light-dark(#2f9e44, #43b15a);
	--green-dark: light-dark(#2b8a3e, #54b366);
	--green-tint: light-dark(#e9f6ec, rgba(84, 179, 102, 0.15));
	--amber: light-dark(#e08a1e, #e8b257);
	--amber-dark: light-dark(#c2740f, #f0c070);
	--amber-tint: light-dark(#fdf1de, rgba(224, 162, 58, 0.16));
	--red: light-dark(#d6492f, #ef6a4f);
	--red-dark: light-dark(#b93c25, #ff8064);
	--red-tint: light-dark(#fbeae6, rgba(239, 106, 79, 0.16));

	/* Text drawn on a filled accent (green/red) button or badge */
	--on-accent: #ffffff;

	/* Shape & depth */
	--radius: 16px;
	--radius-sm: 10px;
	--radius-lg: 22px;
	--radius-pill: 999px;
	--shadow-sm: light-dark(0 1px 2px rgba(80, 60, 30, 0.06), 0 1px 2px rgba(0, 0, 0, 0.3));
	--shadow: light-dark(
		(0 1px 2px rgba(80, 60, 30, 0.06), 0 6px 16px rgba(80, 60, 30, 0.07)),
		(0 1px 2px rgba(0, 0, 0, 0.3), 0 6px 16px rgba(0, 0, 0, 0.28))
	);

	--container: 640px;
	--bottom-nav-h: 4.25rem;

	font-family: var(--font);
}

/* Forced themes: narrow color-scheme so light-dark() resolves to one side,
   regardless of the OS setting. data-theme="" (auto) keeps the :root default. */
:root[data-theme='light'] {
	color-scheme: light;
}
:root[data-theme='dark'] {
	color-scheme: dark;
}
```

- [ ] **Step 2: Reserve space for the fixed bottom nav.** Change the `main` rule (currently `padding: 1rem 1.1rem 4rem;`) to:

```css
main {
	width: 100%;
	max-width: var(--container);
	margin: 0 auto;
	padding: 1rem 1.1rem calc(var(--bottom-nav-h) + 1.5rem + env(safe-area-inset-bottom));
}
```

- [ ] **Step 3: Verify build + types.** Run: `bun run check`
Expected: 0 errors. (No visual check yet — that happens in Task 10.)

- [ ] **Step 4: Commit.**

```bash
git add src/app.css
git commit -m "feat(m6): light+dark tokens via CSS light-dark()

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `resolveTheme` pure helper (TDD)

Maps the `gm_theme` cookie to the `data-theme` attribute value: explicit `light`/`dark` pass through; anything else (incl. `auto`, `null`, junk) → `''` (auto, media-query governed).

**Files:**
- Create: `src/lib/theme.ts`
- Test: `src/lib/theme.test.ts`

- [ ] **Step 1: Write the failing test.**

```ts
// src/lib/theme.test.ts
import { describe, it, expect } from 'bun:test';
import { resolveTheme, normalizeChoice, type ThemeChoice } from './theme';

describe('resolveTheme', () => {
	it('passes through explicit light and dark', () => {
		expect(resolveTheme('light')).toBe('light');
		expect(resolveTheme('dark')).toBe('dark');
	});

	it('maps auto / null / unknown to empty (auto)', () => {
		expect(resolveTheme('auto')).toBe('');
		expect(resolveTheme(null)).toBe('');
		expect(resolveTheme(undefined)).toBe('');
		expect(resolveTheme('purple')).toBe('');
	});

	it('normalizeChoice clamps to a valid ThemeChoice', () => {
		const valid: ThemeChoice[] = ['auto', 'light', 'dark'];
		for (const c of valid) expect(normalizeChoice(c)).toBe(c);
		expect(normalizeChoice('nonsense')).toBe('auto');
		expect(normalizeChoice(null)).toBe('auto');
	});
});
```

- [ ] **Step 2: Run it, expect failure.** Run: `bun test src/lib/theme.test.ts`
Expected: FAIL (module `./theme` not found).

- [ ] **Step 3: Implement.**

```ts
// src/lib/theme.ts
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
```

- [ ] **Step 4: Run tests, expect pass.** Run: `bun test src/lib/theme.test.ts`
Expected: PASS (all assertions).

- [ ] **Step 5: Lint + commit.**

```bash
bun run format && bun run lint
git add src/lib/theme.ts src/lib/theme.test.ts
git commit -m "feat(m6): resolveTheme cookie→data-theme helper (tested)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Stamp `data-theme` + `lang` server-side (no FOUC)

**Files:**
- Modify: `src/app.html` (the `<html>` tag + `theme-color`)
- Modify: `src/hooks.server.ts` (compute theme, `transformPageChunk`)

- [ ] **Step 1: Add placeholders + per-scheme theme-color to `src/app.html`.** Change `<html lang="fr">` to:

```html
<html lang="%gm.lang%" data-theme="%gm.theme%"></html>
```

(keep it as the opening tag — shown self-closed here only for brevity). Then replace the single theme-color line:

```html
<meta name="theme-color" content="#2f9e44" />
```

with two scheme-aware tags (match the `--bg` of each theme):

```html
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#faf6ee" />
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#1d1811" />
```

- [ ] **Step 2: Compute and inject in `src/hooks.server.ts`.** Add the import at the top:

```ts
import { resolveTheme } from '$lib/theme';
```

Then replace the line `const response = await resolve(event);` with:

```ts
	const themeAttr = resolveTheme(event.cookies.get('gm_theme'));
	const lang = event.locals.locale ?? 'fr';

	const response = await resolve(event, {
		transformPageChunk: ({ html }) =>
			html.replace('%gm.theme%', themeAttr).replace('%gm.lang%', lang)
	});
```

(`event.locals.locale` is already set just above by `resolveLocale`.)

- [ ] **Step 3: Verify nothing leaks the placeholder.** Run: `bun run build` then start it and curl the login page:

```bash
bun run build
ORIGIN=http://localhost:3000 PORT=3000 bun ./build/index.js &
sleep 2
curl -s http://localhost:3000/login | grep -o '<html[^>]*>'
kill %1
```

Expected: `<html lang="fr" data-theme="">` (auto, no leftover `%gm.…%`).

- [ ] **Step 4: Type-check + commit.**

```bash
bun run check && bun run format && bun run lint
git add src/app.html src/hooks.server.ts
git commit -m "feat(m6): SSR-stamp data-theme + lang via transformPageChunk

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: i18n keys for nav, theme & account (FR/EN parity)

**Files:**
- Modify: `src/lib/i18n/messages/fr.ts`, `src/lib/i18n/messages/en.ts`
- Modify: `src/lib/i18n/i18n.test.ts`

- [ ] **Step 1: Add a key-parity test** to `src/lib/i18n/i18n.test.ts` (append inside the file):

```ts
describe('fr/en parity', () => {
	test('both locales define the same keys', () => {
		expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort());
	});
});
```

- [ ] **Step 2: Add the new keys to `fr.ts`** (place after the existing `// --- Navigation ---` group and add a Theme group near the account keys):

```ts
	// --- Navigation (bottom nav) ---
	nav_home: 'Garde-manger',
	nav_add: 'Ajouter',
	nav_settings: 'Réglages',
	nav_household_switcher: 'Changer de foyer',
	// --- Theme ---
	account_theme_section: 'Thème',
	theme_auto: 'Auto',
	theme_light: 'Clair',
	theme_dark: 'Sombre',
	// --- Account extras ---
	account_households_section: 'Mes foyers',
	account_manage_households: 'Gérer les foyers',
	account_logout: 'Se déconnecter',
```

- [ ] **Step 3: Mirror the exact same keys in `en.ts`:**

```ts
	// --- Navigation (bottom nav) ---
	nav_home: 'Pantry',
	nav_add: 'Add',
	nav_settings: 'Settings',
	nav_household_switcher: 'Switch household',
	// --- Theme ---
	account_theme_section: 'Theme',
	theme_auto: 'Auto',
	theme_light: 'Light',
	theme_dark: 'Dark',
	// --- Account extras ---
	account_households_section: 'My households',
	account_manage_households: 'Manage households',
	account_logout: 'Log out',
```

- [ ] **Step 4: Run tests + type-check** (the `Messages` type, defined by `fr.ts`, forces `en.ts` to match). Run: `bun test src/lib/i18n/i18n.test.ts && bun run check`
Expected: PASS; 0 type errors.

- [ ] **Step 5: Commit.**

```bash
bun run format && bun run lint
git add src/lib/i18n/
git commit -m "feat(m6): i18n keys for bottom nav, theme & account (FR/EN)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Icon sprite + `Icon.svelte`

A single inline `<symbol>` sprite rendered once per page (in the root layout), referenced by `<use>`. No `{@html}`, no extra request, works server-side. Stroke styling inherits `currentColor`.

**Files:**
- Modify: `src/routes/+layout.svelte`
- Create: `src/lib/components/ui/Icon.svelte`

- [ ] **Step 1: Add the sprite to `src/routes/+layout.svelte`.** After the `<svelte:head>…</svelte:head>` block and before `{@render children()}`, insert:

```svelte
<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">
	<defs>
		<symbol id="gm-home" viewBox="0 0 24 24"><path d="M3 11l9-8 9 8M5 10v10h14V10" /></symbol>
		<symbol id="gm-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></symbol>
		<symbol id="gm-user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></symbol>
		<symbol id="gm-settings" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.4 13a7.5 7.5 0 0 0 0-2l2-1.5-2-3.4-2.4 1a7.5 7.5 0 0 0-1.7-1L15 3h-4l-.3 2.6a7.5 7.5 0 0 0-1.7 1l-2.4-1-2 3.4L6.6 11a7.5 7.5 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7.5 7.5 0 0 0 1.7 1L11 21h4l.3-2.6a7.5 7.5 0 0 0 1.7-1l2.4 1 2-3.4z" /></symbol>
		<symbol id="gm-households" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5M16 11a3 3 0 0 0 0-6M17.5 20c0-2.6-1-4-2.5-4.7" /></symbol>
		<symbol id="gm-scan" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 9v6M11 9v6M15 9v6" /></symbol>
		<symbol id="gm-bell" viewBox="0 0 24 24"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></symbol>
		<symbol id="gm-key" viewBox="0 0 24 24"><circle cx="8" cy="8" r="4" /><path d="M11 11l9 9M17 17l2-2M14 14l2-2" /></symbol>
		<symbol id="gm-edit" viewBox="0 0 24 24"><path d="M4 20h4L18 10l-4-4L4 16zM14 6l4 4" /></symbol>
		<symbol id="gm-trash" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></symbol>
		<symbol id="gm-check" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></symbol>
		<symbol id="gm-x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></symbol>
		<symbol id="gm-logout" viewBox="0 0 24 24"><path d="M9 21H5V3h4M16 17l5-5-5-5M21 12H9" /></symbol>
		<symbol id="gm-chevron-right" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></symbol>
		<symbol id="gm-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></symbol>
		<symbol id="gm-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" /></symbol>
		<symbol id="gm-moon" viewBox="0 0 24 24"><path d="M21 12.8A8 8 0 1 1 11.2 3a6 6 0 0 0 9.8 9.8z" /></symbol>
		<symbol id="gm-monitor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></symbol>
	</defs>
</svg>
```

- [ ] **Step 2: Create `src/lib/components/ui/Icon.svelte`.**

```svelte
<script lang="ts">
	export type IconName =
		| 'home' | 'plus' | 'user' | 'settings' | 'households' | 'scan' | 'bell'
		| 'key' | 'edit' | 'trash' | 'check' | 'x' | 'logout' | 'chevron-right'
		| 'search' | 'sun' | 'moon' | 'monitor';

	let { name, size = 24, class: klass = '' }: { name: IconName; size?: number; class?: string } =
		$props();
</script>

<svg
	class="icon {klass}"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	aria-hidden="true"
	focusable="false"
>
	<use href={`#gm-${name}`} />
</svg>

<style>
	.icon {
		display: inline-block;
		flex: none;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
		vertical-align: middle;
	}
</style>
```

- [ ] **Step 3: Type-check + lint.** Run: `bun run check && bun run format && bun run lint`
Expected: 0 errors. (If eslint flags the long union type, keep it — it is valid; do not split.)

- [ ] **Step 4: Commit.**

```bash
git add src/routes/+layout.svelte src/lib/components/ui/Icon.svelte
git commit -m "feat(m6): inline SVG icon sprite + Icon component

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: UI primitives — Button, Card, Chip, EmptyState

Presentational, token-driven. No unit tests (no component runner); verified by `check`/`lint` and used in later tasks.

**Files:**
- Create: `src/lib/components/ui/Button.svelte`, `Card.svelte`, `Chip.svelte`, `EmptyState.svelte`

- [ ] **Step 1: `Button.svelte`** — renders an `<a>` when `href` is set, else a `<button>`. Reuses the existing `.btn*` classes from `app.css`.

```svelte
<script lang="ts">
	import Icon, { type IconName } from './Icon.svelte';
	let {
		variant = 'primary',
		href = undefined,
		type = 'button',
		icon = undefined,
		full = false,
		children,
		...rest
	}: {
		variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
		href?: string;
		type?: 'button' | 'submit';
		icon?: IconName;
		full?: boolean;
		children?: import('svelte').Snippet;
		[key: string]: unknown;
	} = $props();
</script>

{#if href}
	<a {href} class="btn btn-{variant}" class:full {...rest}>
		{#if icon}<Icon name={icon} size={18} />{/if}{@render children?.()}
	</a>
{:else}
	<button {type} class="btn btn-{variant}" class:full {...rest}>
		{#if icon}<Icon name={icon} size={18} />{/if}{@render children?.()}
	</button>
{/if}

<style>
	.full {
		width: 100%;
	}
	.btn-danger {
		background: var(--red);
		color: var(--on-accent);
	}
	.btn-danger:hover {
		background: var(--red-dark);
		text-decoration: none;
	}
</style>
```

- [ ] **Step 2: `Card.svelte`.**

```svelte
<script lang="ts">
	let { children, ...rest }: { children?: import('svelte').Snippet; [key: string]: unknown } =
		$props();
</script>

<section class="card" {...rest}>{@render children?.()}</section>

<style>
	.card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		box-shadow: var(--shadow-sm);
		padding: 1rem;
	}
</style>
```

- [ ] **Step 3: `Chip.svelte`** — a filter pill link.

```svelte
<script lang="ts">
	let {
		href,
		active = false,
		children
	}: { href: string; active?: boolean; children?: import('svelte').Snippet } = $props();
</script>

<a {href} class="chip" class:active aria-current={active ? 'page' : undefined}>
	{@render children?.()}
</a>

<style>
	.chip {
		display: inline-flex;
		align-items: center;
		padding: 0.35rem 0.8rem;
		border-radius: var(--radius-pill);
		background: var(--surface-2);
		color: var(--text-muted);
		font-weight: 700;
		font-size: 0.85rem;
		white-space: nowrap;
	}
	.chip:hover {
		text-decoration: none;
		color: var(--text);
	}
	.chip.active {
		background: var(--green);
		color: var(--on-accent);
	}
</style>
```

- [ ] **Step 4: `EmptyState.svelte`.**

```svelte
<script lang="ts">
	import Icon, { type IconName } from './Icon.svelte';
	let {
		icon,
		title,
		body = undefined,
		children
	}: {
		icon: IconName;
		title: string;
		body?: string;
		children?: import('svelte').Snippet;
	} = $props();
</script>

<div class="empty">
	<div class="empty-icon"><Icon name={icon} size={40} /></div>
	<h2>{title}</h2>
	{#if body}<p class="muted">{body}</p>{/if}
	{@render children?.()}
</div>

<style>
	.empty {
		text-align: center;
		padding: 3rem 1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}
	.empty-icon {
		width: 76px;
		height: 76px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		background: var(--green-tint);
		color: var(--green);
		margin-bottom: 0.5rem;
	}
</style>
```

- [ ] **Step 5: Type-check, lint, commit.**

```bash
bun run check && bun run format && bun run lint
git add src/lib/components/ui/
git commit -m "feat(m6): UI primitives (Button, Card, Chip, EmptyState)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: BottomNav + AppHeader

**Files:**
- Create: `src/lib/components/ui/BottomNav.svelte`, `AppHeader.svelte`

- [ ] **Step 1: `BottomNav.svelte`** — fixed tab bar with a center FAB. Active tab from `page.url.pathname` (works during SSR). M6 destinations: Garde (`/`), center **+** (`/add`), Compte (`/account`). (Bilan/Cuisiner tabs are added in M9/M10.)

```svelte
<script lang="ts">
	import { page } from '$app/state';
	import Icon from './Icon.svelte';
	import type { Messages } from '$lib/i18n';
	let { t }: { t: Messages } = $props();
	const path = $derived(page.url.pathname);
</script>

<nav class="bottom-nav" aria-label={t.nav_home}>
	<a href="/" class="tab" aria-current={path === '/' ? 'page' : undefined}>
		<Icon name="home" size={22} /><span>{t.nav_home}</span>
	</a>
	<a href="/add" class="fab" aria-label={t.nav_add}>
		<Icon name="plus" size={26} />
	</a>
	<a href="/account" class="tab" aria-current={path.startsWith('/account') ? 'page' : undefined}>
		<Icon name="user" size={22} /><span>{t.nav_settings}</span>
	</a>
</nav>

<style>
	.bottom-nav {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 20;
		display: flex;
		justify-content: space-around;
		align-items: center;
		height: var(--bottom-nav-h);
		padding-bottom: env(safe-area-inset-bottom);
		background: var(--surface);
		border-top: 1px solid var(--border);
	}
	.tab {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3px;
		font-size: 0.68rem;
		font-weight: 700;
		color: var(--text-muted);
		min-width: 4rem;
	}
	.tab:hover {
		text-decoration: none;
	}
	.tab[aria-current='page'] {
		color: var(--green);
	}
	.fab {
		width: 54px;
		height: 54px;
		margin-top: -1.5rem;
		border-radius: 50%;
		display: grid;
		place-items: center;
		background: var(--green);
		color: var(--on-accent);
		border: 4px solid var(--bg);
		box-shadow: 0 8px 18px rgba(47, 138, 62, 0.4);
	}
	.fab:hover {
		text-decoration: none;
		background: var(--green-dark);
	}
</style>
```

- [ ] **Step 2: `AppHeader.svelte`** — household `<details>` switcher (left) + settings link (right). The switch posts to the existing `/households?/switch` action (one submit button per household → no JS).

```svelte
<script lang="ts">
	import Icon from './Icon.svelte';
	import type { Messages } from '$lib/i18n';
	type Household = { id: string; name: string };
	let {
		households,
		activeHouseholdId,
		t
	}: { households: Household[]; activeHouseholdId: string | null; t: Messages } = $props();
	const active = $derived(households.find((h) => h.id === activeHouseholdId) ?? null);
</script>

<header class="app-header">
	{#if households.length > 0}
		<details class="switcher">
			<summary aria-label={t.nav_household_switcher}>
				<span class="hh-name">{active?.name ?? households[0].name}</span>
				<Icon name="chevron-right" size={16} class="chev" />
			</summary>
			<div class="menu">
				<form method="POST" action="/households?/switch">
					{#each households as h (h.id)}
						<button
							class="menu-item"
							name="householdId"
							value={h.id}
							aria-current={h.id === activeHouseholdId ? 'true' : undefined}
						>
							{h.name}
							{#if h.id === activeHouseholdId}<Icon name="check" size={16} />{/if}
						</button>
					{/each}
				</form>
				<a class="menu-link" href="/households">
					<Icon name="households" size={16} />{t.account_manage_households}
				</a>
			</div>
		</details>
	{:else}
		<a class="switcher-empty" href="/households">
			<Icon name="households" size={16} />{t.nav_create_household}
		</a>
	{/if}

	<a class="settings" href="/account" aria-label={t.nav_settings}>
		<Icon name="settings" size={22} />
	</a>
</header>

<style>
	.app-header {
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.6rem;
		padding: 0.55rem 1.1rem;
		max-width: var(--container);
		margin: 0 auto;
		background: color-mix(in srgb, var(--bg) 85%, transparent);
		backdrop-filter: saturate(140%) blur(8px);
	}
	.switcher {
		position: relative;
	}
	.switcher summary {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.35rem 0.7rem;
		border-radius: var(--radius-pill);
		background: var(--surface-2);
		font-weight: 800;
		cursor: pointer;
		list-style: none;
	}
	.switcher summary::-webkit-details-marker {
		display: none;
	}
	.switcher[open] summary :global(.chev) {
		transform: rotate(90deg);
	}
	.menu {
		position: absolute;
		top: calc(100% + 6px);
		left: 0;
		min-width: 12rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		box-shadow: var(--shadow);
		padding: 0.4rem;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.menu-item,
	.menu-link {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem 0.6rem;
		border-radius: var(--radius-sm);
		background: none;
		border: none;
		font: inherit;
		font-weight: 600;
		color: var(--text);
		text-align: left;
		cursor: pointer;
	}
	.menu-item:hover,
	.menu-link:hover {
		background: var(--surface-2);
		text-decoration: none;
	}
	.menu-link {
		color: var(--text-muted);
		border-top: 1px solid var(--border);
		margin-top: 2px;
	}
	.switcher-empty,
	.settings {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--text-muted);
		font-weight: 600;
	}
	.settings:hover,
	.switcher-empty:hover {
		color: var(--text);
		text-decoration: none;
	}
</style>
```

- [ ] **Step 3: Type-check, lint, commit.**

```bash
bun run check && bun run format && bun run lint
git add src/lib/components/ui/BottomNav.svelte src/lib/components/ui/AppHeader.svelte
git commit -m "feat(m6): BottomNav (tabs+FAB) and AppHeader (household switcher)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: ThemeToggle + account wiring (Thème, Foyers, Déconnexion)

**Files:**
- Create: `src/lib/components/ui/ThemeToggle.svelte`
- Modify: `src/routes/(app)/account/+page.server.ts`
- Modify: `src/routes/(app)/account/+page.svelte`

- [ ] **Step 1: `ThemeToggle.svelte`** — three submit buttons posting to `?/setTheme` (no JS).

```svelte
<script lang="ts">
	import Icon from './Icon.svelte';
	import type { Messages } from '$lib/i18n';
	import type { ThemeChoice } from '$lib/theme';
	let { value, t }: { value: ThemeChoice; t: Messages } = $props();
	const opts: { v: ThemeChoice; label: string; icon: 'monitor' | 'sun' | 'moon' }[] = [
		{ v: 'auto', label: t.theme_auto, icon: 'monitor' },
		{ v: 'light', label: t.theme_light, icon: 'sun' },
		{ v: 'dark', label: t.theme_dark, icon: 'moon' }
	];
</script>

<form method="POST" action="?/setTheme" class="seg">
	{#each opts as o (o.v)}
		<button name="theme" value={o.v} class="seg-btn" class:on={value === o.v} aria-pressed={value === o.v}>
			<Icon name={o.icon} size={18} />{o.label}
		</button>
	{/each}
</form>

<style>
	.seg {
		display: flex;
		gap: 0.4rem;
	}
	.seg-btn {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		padding: 0.7rem 0.4rem;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-sm);
		background: var(--surface);
		color: var(--text-muted);
		font-weight: 700;
		font-size: 0.85rem;
		cursor: pointer;
	}
	.seg-btn.on {
		border-color: var(--green);
		background: var(--green-tint);
		color: var(--green-dark);
	}
</style>
```

- [ ] **Step 2: Add the `setTheme` action + return current theme in `account/+page.server.ts`.** Add to the top imports if missing: `import { normalizeChoice, THEME_COOKIE } from '$lib/theme';` and `import { redirect } from '@sveltejs/kit';` (only if not already imported). In the `load`, add to the returned object: `theme: normalizeChoice(cookies.get(THEME_COOKIE))` (ensure `cookies` is destructured from the load event). Add to the `actions` object:

```ts
	setTheme: async ({ request, cookies }) => {
		const data = await request.formData();
		const theme = normalizeChoice(data.get('theme') as string | null);
		cookies.set(THEME_COOKIE, theme, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 365
		});
		redirect(303, '/account');
	},
```

- [ ] **Step 3: Render the new sections in `account/+page.svelte`.** Import at the top of the `<script>`: `import ThemeToggle from '$lib/components/ui/ThemeToggle.svelte';`. Add a Thème card, a Foyers link card, and a logout form. Place them after the Profile section (use the existing `.card`/`.btn` classes; `data.theme` comes from the load):

```svelte
<section class="card">
	<h2>{t.account_theme_section}</h2>
	<ThemeToggle value={data.theme} {t} />
</section>

<section class="card">
	<h2>{t.account_households_section}</h2>
	<a class="btn btn-secondary" href="/households">{t.account_manage_households}</a>
</section>

<form method="POST" action="/logout" class="logout-form">
	<button type="submit" class="btn btn-ghost">{t.account_logout}</button>
</form>
```

(Add minimal styling if needed: `.logout-form { margin-top: 1rem; }`.)

- [ ] **Step 4: Verify the round-trip.** Run: `bun run check && bun run build`, start the server, and confirm setting the cookie flips the attribute:

```bash
ORIGIN=http://localhost:3000 PORT=3000 bun ./build/index.js &
sleep 2
curl -s -H 'Cookie: gm_theme=dark' http://localhost:3000/login | grep -o '<html[^>]*>'
kill %1
```

Expected: `<html lang="fr" data-theme="dark">`.

- [ ] **Step 5: Lint + commit.**

```bash
bun run format && bun run lint
git add src/lib/components/ui/ThemeToggle.svelte 'src/routes/(app)/account/'
git commit -m "feat(m6): theme toggle + account Thème/Foyers/Déconnexion sections

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Adopt the shell in the `(app)` layout

Replace the crowded two-row header with `AppHeader` + `BottomNav`. No page-body changes (those are M7+).

**Files:**
- Modify: `src/routes/(app)/+layout.svelte`

- [ ] **Step 1: Rewrite `(app)/+layout.svelte`** to:

```svelte
<script lang="ts">
	import type { LayoutServerData } from './$types';
	import { m } from '$lib/i18n';
	import OfflineBanner from '$lib/components/OfflineBanner.svelte';
	import AppHeader from '$lib/components/ui/AppHeader.svelte';
	import BottomNav from '$lib/components/ui/BottomNav.svelte';

	let { data, children }: { data: LayoutServerData; children: import('svelte').Snippet } = $props();
	const t = $derived(m(data.locale));
</script>

<OfflineBanner locale={data.locale} />
<AppHeader households={data.households} activeHouseholdId={data.activeHouseholdId} {t} />

<main>
	{@render children()}
</main>

<BottomNav {t} />
```

(All previous header markup/styles are removed; the styling now lives in the components. `data.households` / `data.activeHouseholdId` / `data.locale` already come from `(app)/+layout.server.ts`.)

- [ ] **Step 2: Full type-check + build.** Run: `bun run check && bun run build`
Expected: 0 errors; build succeeds.

- [ ] **Step 3: Lint + commit.**

```bash
bun run format && bun run lint
git add 'src/routes/(app)/+layout.svelte'
git commit -m "refactor(m6): adopt AppHeader + BottomNav shell across (app) routes

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Milestone verification

- [ ] **Step 1: Whole suite green.** Run: `bun test`
Expected: all pass (the prior 211 + the new theme/i18n tests).

- [ ] **Step 2: Types + lint + build clean.** Run: `bun run check && bun run lint && bun run build`
Expected: 0 errors anywhere.

- [ ] **Step 3: Visual smoke in both themes.** With `bun --bun run dev` running, log in and verify on a 390px viewport:
  - Bottom nav is fixed, FAB centered, active tab highlighted; content isn't hidden behind the nav.
  - AppHeader household switcher opens (a `<details>`), switching households works **with JS disabled**.
  - In Compte → Thème, choose **Sombre**: the entire app switches to warm-dark; **Clair** forces light; **Auto** follows the OS. Logout works from Compte.
  - No `%gm.theme%`/`%gm.lang%` text appears anywhere.
  - (Optional, automated) Use the Playwright MCP at 390×844: screenshot `/` and `/account` with `gm_theme=light` and `gm_theme=dark` cookies for a side-by-side.

- [ ] **Step 4: Acceptance check against the spec's "M6 done when".** Confirm: every screen renders on the new system in both themes; the bottom nav replaces the old header; tests green. Fix any gaps before closing the milestone.

- [ ] **Step 5: (If the team wants it) open a PR** for `redesign/uiux` → `main`, or continue stacking M7 on the same branch per the project's merge convention.

---

## Self-review notes

- **Spec coverage (M6 rows of §11):** tokens light+dark ✅ (T1); theme mechanism + no-FOUC ✅ (T1/T3); ThemeToggle ✅ (T8); icon set ✅ (T5, UI glyphs — the **12 category icons are intentionally deferred to M7**, where their consumer `Thumb` lives, per YAGNI; noted here so it isn't mistaken for a gap); type/space scale ✅ (T1 radii + existing type scale); component library ✅ (T5–T8 — `DayBadge`, `Thumb`, `ItemRow`, `StatTile`, `Sheet` are **deferred to their consuming milestones** M7/M8/M9, not M6); nav shell across routes ✅ (T9); FR/EN parity ✅ (T4).
- **No placeholders:** every code step contains complete code; every command has expected output.
- **Type consistency:** `resolveTheme`/`normalizeChoice`/`THEME_COOKIE` (T2) are used identically in T3/T8; `IconName` (T5) is reused by Button/EmptyState/ThemeToggle; `Messages` prop threading (`t`) is consistent across AppHeader/BottomNav/ThemeToggle.
- **Deviation flagged:** the spec mentioned an optional inline-script instant theme flip; because `(app)` is `csr = false`, M6 ships the **no-JS cookie+reload** path only (fully sufficient; an enhancement can come later).
