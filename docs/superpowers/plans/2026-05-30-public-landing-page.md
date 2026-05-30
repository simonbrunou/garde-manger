# Public Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public marketing landing page at `/` for logged-out ("non connecté") visitors, moving the authenticated dashboard to `/garde-manger`.

**Architecture:** The landing lives at the top-level route `src/routes/+page.*`, outside the `(app)` and `(auth)` layout groups, so it has no app header / bottom nav. Its server `load` redirects already-authenticated users to `/garde-manger`. The dashboard relocates from `(app)/+page.*` to `(app)/garde-manger/+page.*`; every place that hard-coded the dashboard URL `/` (bottom nav, item back-link, filter chips, consume/discard action redirects, post-auth redirects, the daily-push deep-link, the PWA `start_url`) is repointed to `/garde-manger`.

**Tech Stack:** SvelteKit (Svelte 5 runes), TypeScript, bun:test, Drizzle, custom typed i18n (`fr.ts`/`en.ts` + `Messages` interface), Warm & Friendly CSS design tokens.

**Spec:** `docs/superpowers/specs/2026-05-30-public-landing-page-design.md`

**Conventions:**
- Run all tests with `bun test`; a single file with `bun test <path>`.
- Type-check with `npm run check`; format with `npm run format`; lint with `npm run lint`.
- Commit after each task. There is no `test` npm script — use `bun test` directly.

---

### Task 1: Relocate the dashboard to `/garde-manger`

Frees the `/` URL for the landing. Pure move + internal URL fixes; no behaviour change for logged-in users except the URL.

**Files:**
- Move: `src/routes/(app)/+page.svelte` → `src/routes/(app)/garde-manger/+page.svelte`
- Move: `src/routes/(app)/+page.server.ts` → `src/routes/(app)/garde-manger/+page.server.ts`

- [ ] **Step 1: Move the two route files with git**

```bash
mkdir -p "src/routes/(app)/garde-manger"
git mv "src/routes/(app)/+page.svelte" "src/routes/(app)/garde-manger/+page.svelte"
git mv "src/routes/(app)/+page.server.ts" "src/routes/(app)/garde-manger/+page.server.ts"
```

- [ ] **Step 2: Repoint the filter chips inside the moved page**

In `src/routes/(app)/garde-manger/+page.svelte`, replace the `.filters` block:

Find:
```svelte
		<Chip href="/" active={!data.locationFilter}>{t.home_filter_all}</Chip>
		<Chip href="/?location=fridge" active={data.locationFilter === 'fridge'}
			>{t.add_location_fridge}</Chip
		>
		<Chip href="/?location=pantry" active={data.locationFilter === 'pantry'}
			>{t.add_location_pantry}</Chip
		>
		<Chip href="/?location=freezer" active={data.locationFilter === 'freezer'}
			>{t.add_location_freezer}</Chip
		>
```

Replace with:
```svelte
		<Chip href="/garde-manger" active={!data.locationFilter}>{t.home_filter_all}</Chip>
		<Chip href="/garde-manger?location=fridge" active={data.locationFilter === 'fridge'}
			>{t.add_location_fridge}</Chip
		>
		<Chip href="/garde-manger?location=pantry" active={data.locationFilter === 'pantry'}
			>{t.add_location_pantry}</Chip
		>
		<Chip href="/garde-manger?location=freezer" active={data.locationFilter === 'freezer'}
			>{t.add_location_freezer}</Chip
		>
```

- [ ] **Step 3: Repoint the consume/discard action redirects in the moved server file**

In `src/routes/(app)/garde-manger/+page.server.ts` there are **two** identical redirect blocks (in `consume` and `discard`). Replace **both** occurrences of:

```ts
			const locationParam = url.searchParams.get('location');
			const target = locationParam ? `/?location=${encodeURIComponent(locationParam)}` : '/';
			redirect(303, target);
```

with:
```ts
			const locationParam = url.searchParams.get('location');
			const target = locationParam
				? `/garde-manger?location=${encodeURIComponent(locationParam)}`
				: '/garde-manger';
			redirect(303, target);
```

- [ ] **Step 4: Type-check and confirm the existing suite still passes**

Run: `npm run check && bun test`
Expected: svelte-check passes (0 errors); all existing tests pass (push/cron tests still green — their `/?filter=expiring` assertions are updated later in Task 5).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(routes): move dashboard from / to /garde-manger"
```

---

### Task 2: Add `landing_*` i18n keys

Add the bilingual copy. The parity test (`Object.keys(fr) === Object.keys(en)`) guarantees both locales stay in sync.

**Files:**
- Modify: `src/lib/i18n/messages/fr.ts` (object + `Messages` interface)
- Modify: `src/lib/i18n/messages/en.ts` (object)
- Test: `src/lib/i18n/i18n.test.ts` (existing — no edit, used as the gate)

- [ ] **Step 1: Add keys to the FR object**

In `src/lib/i18n/messages/fr.ts`, find the end of the `fr` object literal:
```ts
	bilan_streak_zero: "Reparti·e à zéro — c'est reparti !"
};
```
Replace with:
```ts
	bilan_streak_zero: "Reparti·e à zéro — c'est reparti !",

	// --- Landing (public) ---
	landing_hero_title: 'Ne gaspillez plus. Cuisinez ce que vous avez.',
	landing_hero_subtitle:
		'Suivez votre garde-manger, soyez alerté avant péremption, et trouvez quoi cuisiner — en quelques secondes.',
	landing_cta_signup: 'Créer un compte',
	landing_cta_login: 'Se connecter',
	landing_feature_stock_title: 'Suivi du stock',
	landing_feature_stock_body: "Sachez en un coup d'œil ce qu'il vous reste.",
	landing_feature_expiry_title: 'Alertes de péremption',
	landing_feature_expiry_body: 'Soyez prévenu avant que ça ne périme.',
	landing_feature_scan_title: 'Scan code-barres',
	landing_feature_scan_body: 'Ajoutez un produit en le scannant.',
	landing_feature_cook_title: 'Idées recettes',
	landing_feature_cook_body: 'Cuisinez à partir de ce que vous avez déjà.',
	landing_closing_prompt: 'Prêt à arrêter le gaspillage ?',
	landing_meta_description:
		'Garde-Manger — suivez votre stock alimentaire, évitez le gaspillage et cuisinez malin.'
};
```

- [ ] **Step 2: Add the keys to the `Messages` interface (same file)**

In `src/lib/i18n/messages/fr.ts`, find the end of the `Messages` interface:
```ts
	bilan_streak_zero: string;
}
```
Replace with:
```ts
	bilan_streak_zero: string;
	// --- Landing (public) ---
	landing_hero_title: string;
	landing_hero_subtitle: string;
	landing_cta_signup: string;
	landing_cta_login: string;
	landing_feature_stock_title: string;
	landing_feature_stock_body: string;
	landing_feature_expiry_title: string;
	landing_feature_expiry_body: string;
	landing_feature_scan_title: string;
	landing_feature_scan_body: string;
	landing_feature_cook_title: string;
	landing_feature_cook_body: string;
	landing_closing_prompt: string;
	landing_meta_description: string;
}
```

- [ ] **Step 3: Add the matching keys to the EN object**

In `src/lib/i18n/messages/en.ts`, find the end of the `en` object literal:
```ts
	bilan_streak_zero: 'Back to zero — fresh start!'
};
```
Replace with:
```ts
	bilan_streak_zero: 'Back to zero — fresh start!',

	// --- Landing (public) ---
	landing_hero_title: 'Stop wasting food. Cook what you have.',
	landing_hero_subtitle:
		'Track your pantry, get alerted before things expire, and find what to cook — in seconds.',
	landing_cta_signup: 'Create account',
	landing_cta_login: 'Log in',
	landing_feature_stock_title: 'Track your stock',
	landing_feature_stock_body: 'See at a glance what you have left.',
	landing_feature_expiry_title: 'Expiry alerts',
	landing_feature_expiry_body: 'Get notified before food goes bad.',
	landing_feature_scan_title: 'Barcode scan',
	landing_feature_scan_body: 'Add a product just by scanning it.',
	landing_feature_cook_title: 'Recipe ideas',
	landing_feature_cook_body: "Cook from what's already in your kitchen.",
	landing_closing_prompt: 'Ready to stop wasting food?',
	landing_meta_description: 'Garde-Manger — track your food stock, cut waste, and cook smart.'
};
```

- [ ] **Step 4: Run the i18n suite — parity + type shape must hold**

Run: `bun test src/lib/i18n/i18n.test.ts && npm run check`
Expected: PASS — `en has exactly the same keys as fr`; svelte-check reports 0 errors (EN satisfies `Messages` with all new keys present).

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n/messages/fr.ts src/lib/i18n/messages/en.ts
git commit -m "i18n(landing): add landing_* keys (fr + en)"
```

---

### Task 3: Create the public landing route

The landing owns `/`. Server `load` redirects logged-in users to `/garde-manger`; otherwise returns the locale. TDD the redirect first.

**Files:**
- Create: `src/routes/+page.server.ts`
- Create: `src/routes/+page.svelte`
- Test: `src/routes/landing.server.test.ts` (co-located, **not** a `+`-route file, so SvelteKit ignores it for routing; `bun test` still discovers it)

- [ ] **Step 1: Write the failing load test**

Create `src/routes/landing.server.test.ts`:
```ts
import { test, expect, describe } from 'bun:test';
import { load } from './+page.server';

// The route's `load` uses redirect()/returns locale based on auth state.
// We call it with a minimal fake event (only `locals` is read).
const call = (locals: unknown) => (load as unknown as (e: { locals: unknown }) => unknown)({ locals });

describe('landing page load', () => {
	test('redirects a logged-in user to /garde-manger', async () => {
		let thrown: { status?: number; location?: string } | undefined;
		try {
			await call({ user: { id: 'u1' }, locale: 'fr' });
		} catch (e) {
			thrown = e as { status?: number; location?: string };
		}
		expect(thrown?.status).toBe(303);
		expect(thrown?.location).toBe('/garde-manger');
	});

	test('returns the locale for an anonymous visitor', async () => {
		const result = await call({ user: null, locale: 'en' });
		expect(result).toEqual({ locale: 'en' });
	});
});
```

- [ ] **Step 2: Run it — expect failure (module not found)**

Run: `bun test src/routes/landing.server.test.ts`
Expected: FAIL — cannot resolve `./+page.server` (the file does not exist yet).

> Pivot note: if `bun test` cannot import `@sveltejs/kit`'s `redirect` transitively in this environment (unexpected — it is a plain runtime export), extract the decision into a pure helper `src/lib/landing.ts` (`landingTarget(user): string | null`) and unit-test that instead, calling it from the route `load`.

- [ ] **Step 3: Create the server load**

Create `src/routes/+page.server.ts`:
```ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Logged-in visitors skip the marketing page and go straight to the app.
	if (locals.user) redirect(303, '/garde-manger');
	return { locale: locals.locale };
};
```

- [ ] **Step 4: Run the test — expect pass**

Run: `bun test src/routes/landing.server.test.ts`
Expected: PASS (both cases).

- [ ] **Step 5: Create the landing page UI**

Create `src/routes/+page.svelte`:
```svelte
<script lang="ts">
	import { m } from '$lib/i18n';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/components/ui/Icon.svelte';

	let { data } = $props();
	const t = $derived(m(data.locale));

	const features = $derived<{ icon: IconName; title: string; body: string; tone: string }[]>([
		{
			icon: 'cat-pantry',
			title: t.landing_feature_stock_title,
			body: t.landing_feature_stock_body,
			tone: 'green'
		},
		{
			icon: 'bell',
			title: t.landing_feature_expiry_title,
			body: t.landing_feature_expiry_body,
			tone: 'amber'
		},
		{
			icon: 'scan',
			title: t.landing_feature_scan_title,
			body: t.landing_feature_scan_body,
			tone: 'green'
		},
		{
			icon: 'cook',
			title: t.landing_feature_cook_title,
			body: t.landing_feature_cook_body,
			tone: 'red'
		}
	]);
</script>

<svelte:head>
	<title>Garde-Manger</title>
	<meta name="description" content={t.landing_meta_description} />
</svelte:head>

<main class="landing">
	<section class="hero">
		<p class="brand"><span class="brand-mark" aria-hidden="true">🥕</span> Garde-Manger</p>
		<h1>{t.landing_hero_title}</h1>
		<p class="lede">{t.landing_hero_subtitle}</p>
		<div class="cta">
			<a class="btn btn-primary" href="/signup">{t.landing_cta_signup}</a>
			<a class="btn btn-secondary" href="/login">{t.landing_cta_login}</a>
		</div>
	</section>

	<section class="features">
		{#each features as f (f.title)}
			<div class="card feature">
				<span class="feature-icon tone-{f.tone}"><Icon name={f.icon} size={26} /></span>
				<h2>{f.title}</h2>
				<p>{f.body}</p>
			</div>
		{/each}
	</section>

	<section class="closing">
		<p>{t.landing_closing_prompt}</p>
		<a class="btn btn-primary" href="/signup">{t.landing_cta_signup}</a>
	</section>

	<footer class="foot"><span aria-hidden="true">🥕</span> Garde-Manger</footer>
</main>

<style>
	.landing {
		max-width: 56rem;
		margin: 0 auto;
		padding: 1.5rem 1.25rem 4rem;
	}
	.hero {
		text-align: center;
		padding: 2.5rem 0 2rem;
	}
	.brand {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		margin: 0;
		font-weight: 800;
		letter-spacing: 0.02em;
		color: var(--text-muted);
	}
	.brand-mark {
		font-size: 1.3rem;
	}
	.hero h1 {
		margin: 1rem 0 0;
		font-size: clamp(1.8rem, 6vw, 2.8rem);
		line-height: 1.1;
	}
	.lede {
		max-width: 34rem;
		margin: 1rem auto 0;
		color: var(--text-muted);
		font-size: 1.05rem;
		line-height: 1.5;
	}
	.cta {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.75rem;
		margin-top: 1.75rem;
	}
	.cta .btn {
		min-width: 11rem;
	}
	.features {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
		margin-top: 1rem;
	}
	.feature {
		padding: 1.25rem;
		text-align: left;
	}
	.feature h2 {
		margin: 0.75rem 0 0.35rem;
		font-size: 1.05rem;
	}
	.feature p {
		margin: 0;
		color: var(--text-muted);
		font-size: 0.92rem;
		line-height: 1.45;
	}
	.feature-icon {
		display: inline-grid;
		place-items: center;
		width: 2.75rem;
		height: 2.75rem;
		border-radius: 0.9rem;
		color: var(--green);
		background: color-mix(in srgb, var(--green) 14%, transparent);
	}
	.tone-amber {
		color: var(--amber);
		background: color-mix(in srgb, var(--amber) 16%, transparent);
	}
	.tone-red {
		color: var(--red);
		background: color-mix(in srgb, var(--red) 14%, transparent);
	}
	.closing {
		margin-top: 2.5rem;
		text-align: center;
	}
	.closing p {
		margin: 0 0 1rem;
		font-size: 1.15rem;
		font-weight: 700;
	}
	.foot {
		margin-top: 3rem;
		text-align: center;
		color: var(--text-muted);
		font-size: 0.85rem;
	}
	@media (max-width: 30rem) {
		.features {
			grid-template-columns: 1fr;
		}
		.cta .btn {
			width: 100%;
		}
	}
</style>
```

- [ ] **Step 6: Type-check the new route**

Run: `npm run check`
Expected: 0 errors (the `IconName` values `cat-pantry`/`bell`/`scan`/`cook` are all valid; `data.locale` flows from the load).

- [ ] **Step 7: Commit**

```bash
git add "src/routes/+page.server.ts" "src/routes/+page.svelte" "src/routes/landing.server.test.ts"
git commit -m "feat(landing): public marketing page at / with logged-in redirect"
```

---

### Task 4: Repoint in-app navigation and post-auth redirects to `/garde-manger`

Mechanical URL fixes so logged-in navigation lands on the relocated dashboard.

**Files:**
- Modify: `src/lib/validation.ts` (add `fallback` param to `safeLocalPath`)
- Modify: `src/routes/(auth)/login/+page.server.ts`
- Modify: `src/routes/(auth)/signup/+page.server.ts`
- Modify: `src/lib/components/PasskeyLogin.svelte`
- Modify: `src/lib/components/ui/BottomNav.svelte`
- Modify: `src/routes/(app)/item/[id]/+page.svelte`

- [ ] **Step 1: Give `safeLocalPath` an optional fallback**

In `src/lib/validation.ts`, replace:
```ts
export function safeLocalPath(p: string | null | undefined): string {
	if (typeof p === 'string' && p.startsWith('/') && !p.startsWith('//')) {
		return p;
	}
	return '/';
}
```
with:
```ts
export function safeLocalPath(p: string | null | undefined, fallback = '/'): string {
	if (typeof p === 'string' && p.startsWith('/') && !p.startsWith('//')) {
		return p;
	}
	return fallback;
}
```

- [ ] **Step 2: Default login redirects to the app**

In `src/routes/(auth)/login/+page.server.ts`:
- In `load`, replace `safeLocalPath(url.searchParams.get('redirectTo'))` with `safeLocalPath(url.searchParams.get('redirectTo'), '/garde-manger')`.
- In the default action, replace `safeLocalPath(raw.redirectTo as string)` with `safeLocalPath(raw.redirectTo as string, '/garde-manger')`.

- [ ] **Step 3: Default signup redirects to the app**

In `src/routes/(auth)/signup/+page.server.ts`, make the identical two replacements as Step 2 (the `load` line and the action line).

- [ ] **Step 4: Default the passkey redirect to the app**

In `src/lib/components/PasskeyLogin.svelte`, replace:
```svelte
	let { redirectTo = '/' }: Props = $props();
```
with:
```svelte
	let { redirectTo = '/garde-manger' }: Props = $props();
```

- [ ] **Step 5: Point the bottom-nav home tab at the dashboard**

In `src/lib/components/ui/BottomNav.svelte`, replace:
```svelte
	<a href="/" class="tab" aria-current={path === '/' ? 'page' : undefined}>
```
with:
```svelte
	<a href="/garde-manger" class="tab" aria-current={path === '/garde-manger' ? 'page' : undefined}>
```

- [ ] **Step 6: Point the item-detail back link at the dashboard**

In `src/routes/(app)/item/[id]/+page.svelte`, replace:
```svelte
<a class="back" href="/">{t.item_back}</a>
```
with:
```svelte
<a class="back" href="/garde-manger">{t.item_back}</a>
```

- [ ] **Step 7: Type-check + run the full suite**

Run: `npm run check && bun test`
Expected: 0 type errors; all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/lib/validation.ts "src/routes/(auth)/login/+page.server.ts" "src/routes/(auth)/signup/+page.server.ts" src/lib/components/PasskeyLogin.svelte src/lib/components/ui/BottomNav.svelte "src/routes/(app)/item/[id]/+page.svelte"
git commit -m "refactor(nav): repoint in-app + post-auth redirects to /garde-manger"
```

---

### Task 5: Update the daily-push deep-link and PWA start_url

The reminder push and the installed-PWA launch URL still point at the old dashboard `/`. Update them; the two tests that assert the deep-link drive this TDD-style.

**Files:**
- Modify: `src/lib/server/push.ts`
- Modify: `src/lib/server/push.test.ts`
- Modify: `src/lib/server/cron.test.ts`
- Modify: `static/manifest.webmanifest`

- [ ] **Step 1: Update the two failing assertions first**

In `src/lib/server/push.test.ts` (line ~100) replace:
```ts
		expect(obj.notification.navigate).toBe(`${ORIGIN}/?filter=expiring`);
```
with:
```ts
		expect(obj.notification.navigate).toBe(`${ORIGIN}/garde-manger?filter=expiring`);
```

In `src/lib/server/cron.test.ts` (line ~155) make the identical replacement.

- [ ] **Step 2: Run them — expect failure**

Run: `bun test src/lib/server/push.test.ts src/lib/server/cron.test.ts`
Expected: FAIL — actual is still `${ORIGIN}/?filter=expiring` (push.ts not yet updated).

- [ ] **Step 3: Update the deep-link in push.ts**

In `src/lib/server/push.ts`, replace:
```ts
	const navigate = `${opts.origin}/?filter=expiring`;
```
with:
```ts
	const navigate = `${opts.origin}/garde-manger?filter=expiring`;
```

- [ ] **Step 4: Run them — expect pass**

Run: `bun test src/lib/server/push.test.ts src/lib/server/cron.test.ts`
Expected: PASS.

- [ ] **Step 5: Update the PWA start_url**

In `static/manifest.webmanifest`, replace:
```json
	"start_url": "/",
```
with:
```json
	"start_url": "/garde-manger",
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/push.ts src/lib/server/push.test.ts src/lib/server/cron.test.ts static/manifest.webmanifest
git commit -m "fix(push,pwa): point reminder deep-link and start_url at /garde-manger"
```

---

### Task 6: Full verification + graph refresh

- [ ] **Step 1: Format, lint, type-check, and run the whole suite**

Run:
```bash
npm run format
npm run lint
npm run check
bun test
```
Expected: prettier writes any formatting; eslint clean; svelte-check 0 errors; **all** tests pass (count = previous total + the 2 new landing-load tests; i18n parity green).

- [ ] **Step 2: Manual smoke test in dev**

Run: `npm run dev`, then verify in a browser:
- Logged **out**, visit `/` → the landing page renders (hero, 4 feature cards, CTAs); no bottom nav / app header.
- Click **Se connecter** → `/login`; **Créer un compte** → `/signup`.
- Toggle OS/dark theme (or the in-app theme cookie) → landing colors adapt (tokens + `light-dark()`).
- Log **in** → after auth you land on `/garde-manger` (the dashboard), bottom-nav "Garde-manger" tab is active.
- While logged in, manually visit `/` → you are redirected straight to `/garde-manger`.
- Item detail "back" and the dashboard filter chips stay within `/garde-manger`.

- [ ] **Step 3: Commit any formatting changes**

```bash
git add -A
git commit -m "style: prettier-format landing page additions" || echo "nothing to format-commit"
```

- [ ] **Step 4: Refresh the knowledge graph (project convention)**

Run: `graphify update .`
Expected: AST-only re-index succeeds (no API cost). Commit if it changes tracked graph files:
```bash
git add graphify-out 2>/dev/null && git commit -m "chore(graphify): update graph after landing page" || echo "no graph changes"
```

---

## Self-Review

**Spec coverage:**
- Routing Approach A (landing owns `/`, dashboard → `/garde-manger`) → Tasks 1 & 3. ✓
- Landing load redirect for logged-in users → Task 3 (TDD). ✓
- Icon feature-card UI, light/dark, reused tokens → Task 3 Step 5. ✓
- i18n `landing_*` keys, FR/EN parity → Task 2. ✓
- Link/redirect updates (bottom nav, item back, filter chips, consume/discard actions, login+signup defaults, passkey default) → Tasks 1 & 4. ✓
- Push deep-link + PWA start_url + their tests → Task 5. ✓
- `join/[token]` back-home stays `/` → intentionally untouched (documented in spec). ✓
- Testing: i18n parity stays green, new landing-load test, updated push/cron assertions → Tasks 2, 3, 5, 6. ✓
- Out of scope (no screenshots/blog/analytics/SEO beyond title+meta) → respected. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code. ✓

**Type/name consistency:** `safeLocalPath(p, fallback='/')` defined in Task 4 Step 1 and called with `'/garde-manger'` in Steps 2–3. `IconName` values (`cat-pantry`, `bell`, `scan`, `cook`) all exist in `Icon.svelte`'s union. `landing_*` keys are identical across the FR object (Task 2 Step 1), `Messages` interface (Step 2), and EN object (Step 3). Deep-link string `/garde-manger?filter=expiring` matches in `push.ts` and both test assertions. ✓
