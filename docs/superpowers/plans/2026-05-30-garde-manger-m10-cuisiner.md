# Garde-Manger M10 · Cuisiner (use-it-up ideas) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Cuisiner screen that, for each soon/urgent item, offers a few curated **offline, bilingual "use-it-up" ideas** (keyed by food category) — plus the Cuisiner bottom-nav tab. Also folds in the small Bilan streak-zero copy polish from M9.

**Architecture:** A static dataset `cook/ideas.data.ts` (category → ideas) and a pure, tested `cook.ts` (`ideasForCategory`). A new `(app)/cuisiner` route loads the household's urgent/soon items (same `listActive` + `bandFor` + foods-join pattern as the home load), attaches ideas, and renders them; items without category-ideas are omitted. A `cook` icon is added to the sprite and a Cuisiner tab to `BottomNav` (final order: Garde · Cuisiner · + · Bilan · Compte). No external API, no network, no schema change. No-JS.

**Tech Stack:** SvelteKit 2.57 + Svelte 5 (runes), Bun, `bun:test`, Drizzle/`bun:sqlite`.

---

## Conventions (read once)
- **Branch:** `redesign/m10` (already checked out). Don't switch/create branches. Dev server on :5173 — don't start another.
- **Gate every task:** `bun run format` → `bun run check` → `bun run lint`. Tests: `bun test <file>`. Full suite: `bun test --timeout 30000` (a seed test is flaky at the default timeout).
- **Commit trailer:** end every commit with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- **Facts:** the 12 `foods.category` values are: `Fruits, Légumes, Herbes, Charcuterie, Poissons / Fruits de mer, Produits laitiers, Viandes, Volaille, Œufs, Pain / Boulangerie, Placard / Épicerie, Restes / Plats cuisinés`. `listActive(db, hh)` returns active items; `bandFor(effectiveDate, warnDays, now)` → `'urgent'|'soon'|'ok'`; the `(app)` layout parent provides `{ locale, households (with warnDays), activeHouseholdId }`. M6–M9 give `Icon`(+`IconName`), `Card`, `Button`, `EmptyState`, `DayBadge`, `Chip`. `BottomNav` is currently Garde · + · Bilan · Compte.

## File map
| File | Responsibility | Action |
|---|---|---|
| `src/lib/server/cook/ideas.data.ts` | static category → ideas dataset (FR/EN) | create |
| `src/lib/server/cook.ts` | `ideasForCategory(category)` (pure) | create |
| `src/lib/server/cook.test.ts` | unit tests | create |
| `src/routes/+layout.svelte` | add `gm-cook` sprite symbol | modify |
| `src/lib/components/ui/Icon.svelte` | add `'cook'` to `IconName` | modify |
| `src/lib/i18n/messages/fr.ts`, `en.ts` | nav_cuisiner + cuisiner_* + bilan_streak_zero | modify |
| `src/routes/(app)/cuisiner/+page.server.ts` | scoped load: expiring items + ideas | create |
| `src/routes/(app)/cuisiner/+page.svelte` | Cuisiner UI | create |
| `src/lib/components/ui/BottomNav.svelte` | add Cuisiner tab (left of FAB) | modify |
| `src/routes/(app)/bilan/+page.svelte` | use `bilan_streak_zero` when streakDays===0 | modify |

---

### Task 1: Cook ideas dataset + `ideasForCategory` (TDD)

**Files:** create `src/lib/server/cook/ideas.data.ts`, `src/lib/server/cook.ts`, `src/lib/server/cook.test.ts`.

- [ ] **Step 1: Failing test** `src/lib/server/cook.test.ts`:

```ts
import { describe, it, expect } from 'bun:test';
import { ideasForCategory } from './cook';
import { IDEAS } from './cook/ideas.data';

describe('ideasForCategory', () => {
	it('returns curated ideas for a known category', () => {
		const fruits = ideasForCategory('Fruits');
		expect(fruits.length).toBeGreaterThan(0);
		expect(fruits[0]).toHaveProperty('fr');
		expect(fruits[0]).toHaveProperty('en');
	});
	it('returns [] for null/unknown', () => {
		expect(ideasForCategory(null)).toEqual([]);
		expect(ideasForCategory(undefined)).toEqual([]);
		expect(ideasForCategory('Nope')).toEqual([]);
	});
	it('covers all 12 catalogue categories with at least one idea each', () => {
		const cats = [
			'Fruits', 'Légumes', 'Herbes', 'Charcuterie', 'Poissons / Fruits de mer',
			'Produits laitiers', 'Viandes', 'Volaille', 'Œufs', 'Pain / Boulangerie',
			'Placard / Épicerie', 'Restes / Plats cuisinés'
		];
		for (const c of cats) expect(ideasForCategory(c).length).toBeGreaterThan(0);
	});
	it('every idea in the dataset has non-empty fr and en strings', () => {
		for (const list of Object.values(IDEAS))
			for (const idea of list) {
				expect(idea.fr.length).toBeGreaterThan(0);
				expect(idea.en.length).toBeGreaterThan(0);
			}
	});
});
```

- [ ] **Step 2: Run, expect FAIL.** `bun test src/lib/server/cook.test.ts`.
- [ ] **Step 3: Implement** `src/lib/server/cook/ideas.data.ts`:

```ts
export interface Idea {
	fr: string;
	en: string;
}

/** Curated, offline use-it-up ideas keyed by foods.category. Draft culinary
 * suggestions only — not food-safety advice. */
export const IDEAS: Record<string, Idea[]> = {
	Fruits: [
		{ fr: 'Smoothie ou compote', en: 'Smoothie or compote' },
		{ fr: 'Cake ou crumble', en: 'Cake or crumble' }
	],
	Légumes: [
		{ fr: 'Soupe ou velouté', en: 'Soup' },
		{ fr: 'Poêlée ou wok', en: 'Stir-fry' }
	],
	Herbes: [
		{ fr: 'Pesto maison', en: 'Homemade pesto' },
		{ fr: 'Huile ou beurre aromatisé', en: 'Flavoured oil or butter' }
	],
	Charcuterie: [
		{ fr: 'Quiche ou cake salé', en: 'Quiche or savoury cake' },
		{ fr: 'Omelette garnie', en: 'Loaded omelette' }
	],
	'Poissons / Fruits de mer': [
		{ fr: 'Poêlée express', en: 'Quick pan-fry' },
		{ fr: 'Congeler le jour même', en: 'Freeze the same day' }
	],
	'Produits laitiers': [
		{ fr: 'Gratin ou béchamel', en: 'Gratin or béchamel' },
		{ fr: 'Pancakes ou gâteau', en: 'Pancakes or cake' }
	],
	Viandes: [
		{ fr: 'Mijoté ou curry', en: 'Stew or curry' },
		{ fr: 'Congeler en portions', en: 'Freeze in portions' }
	],
	Volaille: [
		{ fr: 'Bouillon ou curry', en: 'Broth or curry' },
		{ fr: 'Émincé sauté', en: 'Sautéed strips' }
	],
	'Œufs': [
		{ fr: 'Omelette ou frittata', en: 'Omelette or frittata' },
		{ fr: 'Quiche ou flan', en: 'Quiche or custard' }
	],
	'Pain / Boulangerie': [
		{ fr: 'Pain perdu', en: 'French toast' },
		{ fr: 'Croûtons ou chapelure', en: 'Croutons or breadcrumbs' }
	],
	'Placard / Épicerie': [
		{ fr: "Base d'un plat complet", en: 'Base for a one-pot meal' },
		{ fr: 'Bocal ou conserve maison', en: 'Jar or home preserve' }
	],
	'Restes / Plats cuisinés': [
		{ fr: "Réchauffer aujourd'hui", en: 'Reheat today' },
		{ fr: 'Congeler une portion', en: 'Freeze a portion' }
	]
};
```

- [ ] **Step 4: Implement** `src/lib/server/cook.ts`:

```ts
import { IDEAS, type Idea } from './cook/ideas.data';

export type { Idea };

/** Curated use-it-up ideas for a foods.category; [] for null/unknown. */
export function ideasForCategory(category: string | null | undefined): Idea[] {
	return (category && IDEAS[category]) || [];
}
```

- [ ] **Step 5: Run, expect PASS.** `bun test src/lib/server/cook.test.ts`.
- [ ] **Step 6: Gate + commit.**
```bash
bun run format && bun run check && bun run lint
git add src/lib/server/cook.ts src/lib/server/cook/ src/lib/server/cook.test.ts
git commit -m "feat(m10): cook ideas dataset + ideasForCategory (tested, offline)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `cook` (utensils) icon

**Files:** modify `src/routes/+layout.svelte`, `src/lib/components/ui/Icon.svelte`.

- [ ] **Step 1:** Add to the sprite `<defs>` in `src/routes/+layout.svelte`:
```svelte
		<symbol id="gm-cook" viewBox="0 0 24 24"><path d="M6 3v6a2 2 0 0 0 4 0V3M8 9v12M16 3c-1.6 1-2.6 3.4-2.6 6.4H16V21" /></symbol>
```
- [ ] **Step 2:** Add `'cook'` to the `IconName` union in `Icon.svelte` (append to the UI-glyph line, e.g. `… | 'stats' | 'cook'`; keep `cat-*` intact).
- [ ] **Step 3:** `bun run check && bun run format && bun run lint`. Commit:
```bash
git add src/routes/+layout.svelte src/lib/components/ui/Icon.svelte
git commit -m "feat(m10): cook (utensils) icon

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: i18n keys (Cuisiner + bilan streak-zero polish)

**Files:** modify `src/lib/i18n/messages/fr.ts`, `en.ts`.

- [ ] **Step 1: `fr.ts`** (add group; include in `Messages` interface):
```ts
	// --- Cuisiner (M10) ---
	nav_cuisiner: 'Cuisiner',
	cuisiner_title: 'Cuisiner',
	cuisiner_subtitle: 'Idées pour vos aliments à consommer vite',
	cuisiner_empty_title: 'Rien ne presse',
	cuisiner_empty_body: "Aucun aliment à consommer rapidement pour l'instant.",
	bilan_streak_zero: "Reparti·e à zéro — c'est reparti !",
```
- [ ] **Step 2: `en.ts`** (same keys):
```ts
	// --- Cuisiner (M10) ---
	nav_cuisiner: 'Cook',
	cuisiner_title: 'Cook',
	cuisiner_subtitle: 'Ideas for items to use up soon',
	cuisiner_empty_title: 'Nothing to use up',
	cuisiner_empty_body: 'No items need using up right now.',
	bilan_streak_zero: 'Back to zero — fresh start!',
```
- [ ] **Step 3:** `bun run check` (parity), `bun test src/lib/i18n/i18n.test.ts`, `bun run format && bun run lint`. Commit:
```bash
git add src/lib/i18n/
git commit -m "feat(m10): i18n keys for Cuisiner + bilan_streak_zero (FR/EN)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Cuisiner route (server + page)

**Files:** create `src/routes/(app)/cuisiner/+page.server.ts`, `src/routes/(app)/cuisiner/+page.svelte`.

- [ ] **Step 1: server** `src/routes/(app)/cuisiner/+page.server.ts`:
```ts
import { error } from '@sveltejs/kit';
import { inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { foods } from '$lib/server/db/schema';
import { requireMembership, MembershipError } from '$lib/server/households';
import { listActive, bandFor } from '$lib/server/inventory';
import { ideasForCategory } from '$lib/server/cook';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { locale, households, activeHouseholdId } = await parent();
	if (!activeHouseholdId) return { noHousehold: true as const, locale };
	try {
		requireMembership(db, activeHouseholdId, locals.user!.id);
	} catch (e) {
		if (e instanceof MembershipError) error(403, 'Forbidden');
		throw e;
	}

	const warnDays = households.find((h) => h.id === activeHouseholdId)?.warnDays ?? 3;
	const items = listActive(db, activeHouseholdId);

	const foodIds = [...new Set(items.map((i) => i.foodId).filter((x): x is string => !!x))];
	const foodMap = new Map<string, typeof foods.$inferSelect>();
	if (foodIds.length > 0) {
		for (const f of db.select().from(foods).where(inArray(foods.id, foodIds)).all()) {
			foodMap.set(f.id, f);
		}
	}

	const now = new Date();
	const expiring: { id: string; name: string; band: 'urgent' | 'soon'; ideas: string[] }[] = [];
	for (const it of items) {
		const band = bandFor(it.effectiveDate ?? null, warnDays, now);
		if (band !== 'urgent' && band !== 'soon') continue;
		const food = it.foodId ? foodMap.get(it.foodId) : undefined;
		const category = food?.category ?? null;
		const ideas = ideasForCategory(category).map((i) => (locale === 'fr' ? i.fr : i.en));
		if (ideas.length === 0) continue; // only items we have ideas for
		const name = food ? (locale === 'fr' ? food.nameFr : food.nameEn) : (it.customName ?? '—');
		expiring.push({ id: it.id, name, band, ideas });
	}
	// urgent first, then soon
	expiring.sort((a, b) => (a.band === 'urgent' ? 0 : 1) - (b.band === 'urgent' ? 0 : 1));

	return { noHousehold: false as const, locale, items: expiring };
};
```

- [ ] **Step 2: page** `src/routes/(app)/cuisiner/+page.svelte`:
```svelte
<script lang="ts">
	import { m } from '$lib/i18n';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	let { data } = $props();
	const t = $derived(m(data.locale));
</script>

<svelte:head><title>{t.cuisiner_title}</title></svelte:head>

{#if data.noHousehold}
	<EmptyState icon="households" title={t.add_no_household}>
		<Button href="/households" variant="primary">{t.nav_create_household}</Button>
	</EmptyState>
{:else if data.items.length === 0}
	<EmptyState icon="cook" title={t.cuisiner_empty_title} body={t.cuisiner_empty_body} />
{:else}
	<header class="head">
		<h1>{t.cuisiner_title}</h1>
		<p class="sub">{t.cuisiner_subtitle}</p>
	</header>
	<div class="list">
		{#each data.items as item (item.id)}
			<Card>
				<a class="name" href={`/item/${item.id}`}>{item.name}</a>
				<ul class="ideas">
					{#each item.ideas as idea (idea)}
						<li>{idea}</li>
					{/each}
				</ul>
			</Card>
		{/each}
	</div>
{/if}

<style>
	.head { margin-bottom: 1rem; }
	.head h1 { margin: 0; }
	.sub { margin: 0.1rem 0 0; color: var(--text-muted); font-weight: 600; font-size: 0.9rem; }
	.list { display: flex; flex-direction: column; gap: 0.8rem; }
	.name { display: inline-block; font-weight: 800; font-size: 1rem; color: inherit; margin-bottom: 0.5rem; }
	.name:hover { text-decoration: none; color: var(--green-dark); }
	.ideas { margin: 0; padding-left: 1.1rem; display: flex; flex-direction: column; gap: 0.3rem; }
	.ideas li { color: var(--text); }
</style>
```

- [ ] **Step 3:** `bun run check` (0 errors), `bun run build`, `bun run format && bun run lint`. Commit:
```bash
git add 'src/routes/(app)/cuisiner'
git commit -m "feat(m10): Cuisiner route (expiring items + offline ideas + empty state)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Add the Cuisiner tab to BottomNav

**Files:** modify `src/lib/components/ui/BottomNav.svelte`.

- [ ] **Step 1:** Insert a Cuisiner tab **between the Garde tab and the FAB** (final order: Garde · Cuisiner · + · Bilan · Compte). Add after the `<a href="/" class="tab">…</a>` and before the `<a href="/add" class="fab">`:
```svelte
	<a href="/cuisiner" class="tab" aria-current={path.startsWith('/cuisiner') ? 'page' : undefined}>
		<Icon name="cook" size={22} /><span>{t.nav_cuisiner}</span>
	</a>
```
- [ ] **Step 2:** `bun run check`, `bun run build`, `bun run format && bun run lint`. Commit:
```bash
git add src/lib/components/ui/BottomNav.svelte
git commit -m "feat(m10): Cuisiner tab in BottomNav (final 5-slot nav)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Bilan streak-zero copy polish (M9 follow-up)

**Files:** modify `src/routes/(app)/bilan/+page.svelte`.

- [ ] **Step 1:** In the streak banner, distinguish `streakDays === 0` from `> 0`. Replace the streak `<p>` expression so it reads: `null` → `t.bilan_streak_none`; `0` → `t.bilan_streak_zero`; else → `t.bilan_streak(n)`. Concretely, change the banner line to:
```svelte
	<p class="streak">
		{s.streakDays === null
			? t.bilan_streak_none
			: s.streakDays === 0
				? t.bilan_streak_zero
				: t.bilan_streak(s.streakDays)}
	</p>
```
- [ ] **Step 2:** `bun run check`, `bun run format && bun run lint`. Commit:
```bash
git add 'src/routes/(app)/bilan/+page.svelte'
git commit -m "polish(m10): clearer Bilan copy when streak is 0 (same-day discard)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Verification + final review + merge/push

- [ ] **Step 1:** `bun test --timeout 30000` — all pass (228 + new cook tests).
- [ ] **Step 2:** `bun run check && bun run lint && bun run build` — all clean.
- [ ] **Step 3:** Visual smoke at 390px both themes (dev :5173): the Cuisiner tab appears (final nav: Garde · Cuisiner · + · Bilan · Compte) and routes to `/cuisiner`; with soon/urgent catalogue items present, each shows its name (link to detail) + 1–2 ideas; with nothing expiring, the EmptyState shows; the Bilan streak-zero copy reads correctly; works with JS disabled.
- [ ] **Step 4:** Confirm spec M10 "done when": curated offline ideas for soon/urgent items by category; Cuisiner tab + screen; tested `ideasForCategory`. Fix gaps.

## Self-review notes
- **Spec coverage:** Cuisiner = offline curated use-it-up ideas for urgent/soon items, keyed by category (T1,T4); Cuisiner tab (T5); cook icon (T2); i18n (T3); EmptyState when nothing expiring (T4). The M9 streak-zero polish is folded in (T6). No external recipe API (offline dataset), matching the spec + frugal ethos.
- **Scope decision:** ideas are keyed by **category** only (covers all catalogue foods); packaged/custom items without a category are omitted from Cuisiner (they have no ideas) — documented. Per-food overrides are intentionally not built (YAGNI); category granularity is sufficient and avoids brittle food-id coupling.
- **No placeholders:** the dataset is complete (all 12 categories), the route assembles real data via the same pattern as the home load, and the test asserts coverage of all 12 categories.
- **Type consistency:** `Idea { fr, en }` (T1) re-exported by `cook.ts` and consumed by the route; `ideasForCategory` signature is identical at definition and call site; `'cook'` IconName (T2) used by BottomNav (T5) + Cuisiner empty state (T4); the Cuisiner load's returned `{ noHousehold, locale, items }` shape matches the page's usage.
- **Security/no-JS:** route is membership-scoped via the layout's `activeHouseholdId` + `requireMembership`; page is links-only, server-rendered.
