# Garde-Manger M9 · Bilan (anti-waste stats) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Bilan ("anti-waste") screen showing eaten-vs-wasted this month and a no-waste streak, built entirely from the `consumed`/`discarded` + `closedAt` history already in the DB — plus a Bilan bottom-nav tab.

**Architecture:** A pure, tested `stats.ts` server module aggregates `inventory_items` (household-scoped) into `{ eaten, wasted, streakDays }`. A new `(app)/bilan` route loads it (membership-checked) and renders `StatTile` components (new). One `stats` icon is added to the sprite and a Bilan tab to `BottomNav`. No schema migration (history already retained). No-JS (server-rendered).

**Tech Stack:** SvelteKit 2.57 + Svelte 5 (runes), Bun, `bun:test`, Drizzle/`bun:sqlite`.

---

## Conventions (read once)
- **Branch:** `redesign/m9` (already checked out). Don't switch/create branches. Dev server on :5173 — don't start another.
- **Gate every task:** `bun run format` → `bun run check` → `bun run lint`. Tests: `bun test <file>` (no `test` npm script; import from `'bun:test'`). `bun:sqlite` is synchronous. Run the full suite with `bun test --timeout 30000` (a seed/argon2 test is flaky under load at the default timeout).
- **Commit trailer:** end every commit with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- **Facts:** `inventory_items` has `status` (`active|consumed|discarded`), `closedAt` (timestamp, set by `setStatus`), `householdId`. The active household is the `gm_household` cookie; routes check `requireMembership(db, hh, locals.user!.id)` (403 on `MembershipError`). M6/M7 give `Icon`(+`IconName`), `Card`, `Button`, `EmptyState`; `BottomNav` currently has Garde/FAB/Compte.

## File map
| File | Responsibility | Action |
|---|---|---|
| `src/lib/server/stats.ts` | `householdStats(db, householdId, now)` (pure) | create |
| `src/lib/server/stats.test.ts` | unit tests | create |
| `src/routes/+layout.svelte` | add `gm-stats` sprite symbol | modify |
| `src/lib/components/ui/Icon.svelte` | add `'stats'` to `IconName` | modify |
| `src/lib/components/ui/StatTile.svelte` | big number + label tile | create |
| `src/lib/i18n/messages/fr.ts`, `en.ts` | nav_bilan + bilan_* keys | modify |
| `src/routes/(app)/bilan/+page.server.ts` | scoped load of stats | create |
| `src/routes/(app)/bilan/+page.svelte` | Bilan UI | create |
| `src/lib/components/ui/BottomNav.svelte` | add Bilan tab | modify |

---

### Task 1: `householdStats` (TDD)

**Files:** create `src/lib/server/stats.ts`, `src/lib/server/stats.test.ts`.

- [ ] **Step 1: Failing test** `src/lib/server/stats.test.ts` (self-contained DB setup):

```ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createDb, runMigrations, type DB } from './db/client';
import { users, households, inventoryItems } from './db/schema';
import { householdStats } from './stats';

const HH = 'hh-stats-1';
const HH2 = 'hh-stats-2';
const U = 'u-stats-1';
const NOW = new Date('2026-05-15T12:00:00Z');

function makeDb(): DB {
	const { db } = createDb(join(tmpdir(), `stats-test-${crypto.randomUUID()}.db`));
	runMigrations(db);
	db.insert(users).values({ id: U, email: 's@e.com', displayName: 'S', locale: 'fr', createdAt: new Date() }).run();
	db.insert(households).values({ id: HH, name: 'H1', createdAt: new Date() }).run();
	db.insert(households).values({ id: HH2, name: 'H2', createdAt: new Date() }).run();
	return db;
}

function addClosed(db: DB, status: 'consumed' | 'discarded', closedAt: Date, householdId = HH): void {
	db.insert(inventoryItems).values({
		id: crypto.randomUUID(), householdId, addedBy: U, kind: 'fresh',
		location: 'fridge', addedAt: new Date('2026-01-01T00:00:00Z'), status, closedAt
	}).run();
}

describe('householdStats', () => {
	let db: DB;
	beforeEach(() => { db = makeDb(); });

	it('counts consumed vs discarded in the current month only', () => {
		addClosed(db, 'consumed', new Date('2026-05-03T10:00:00Z'));
		addClosed(db, 'consumed', new Date('2026-05-10T10:00:00Z'));
		addClosed(db, 'discarded', new Date('2026-05-12T10:00:00Z'));
		addClosed(db, 'consumed', new Date('2026-04-28T10:00:00Z')); // last month → excluded
		const s = householdStats(db, HH, NOW);
		expect(s.eaten).toBe(2);
		expect(s.wasted).toBe(1);
	});

	it('streakDays = whole days since the last discard', () => {
		addClosed(db, 'discarded', new Date('2026-05-10T10:00:00Z'));
		expect(householdStats(db, HH, NOW).streakDays).toBe(5);
	});

	it('streakDays is null when nothing was ever discarded', () => {
		addClosed(db, 'consumed', new Date('2026-05-10T10:00:00Z'));
		expect(householdStats(db, HH, NOW).streakDays).toBeNull();
	});

	it('is household-scoped', () => {
		addClosed(db, 'consumed', new Date('2026-05-10T10:00:00Z'), HH);
		addClosed(db, 'discarded', new Date('2026-05-11T10:00:00Z'), HH);
		const other = householdStats(db, HH2, NOW);
		expect(other).toEqual({ eaten: 0, wasted: 0, streakDays: null });
	});
});
```

- [ ] **Step 2: Run, expect FAIL.** `bun test src/lib/server/stats.test.ts`.
- [ ] **Step 3: Implement** `src/lib/server/stats.ts`:

```ts
import { and, count, desc, eq, gte } from 'drizzle-orm';
import type { DB } from './db/client';
import { inventoryItems } from './db/schema';

export interface HouseholdStats {
	/** items marked consumed in the current calendar month (UTC) */
	eaten: number;
	/** items marked discarded in the current calendar month (UTC) */
	wasted: number;
	/** whole days since the most recent discard; null if nothing was ever discarded */
	streakDays: number | null;
}

const MS_PER_DAY = 86_400_000;

export function householdStats(db: DB, householdId: string, now: Date): HouseholdStats {
	const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

	const countBy = (status: 'consumed' | 'discarded'): number =>
		db
			.select({ c: count() })
			.from(inventoryItems)
			.where(
				and(
					eq(inventoryItems.householdId, householdId),
					eq(inventoryItems.status, status),
					gte(inventoryItems.closedAt, monthStart)
				)
			)
			.get()?.c ?? 0;

	const lastDiscard = db
		.select({ ts: inventoryItems.closedAt })
		.from(inventoryItems)
		.where(and(eq(inventoryItems.householdId, householdId), eq(inventoryItems.status, 'discarded')))
		.orderBy(desc(inventoryItems.closedAt))
		.limit(1)
		.get();

	let streakDays: number | null = null;
	if (lastDiscard?.ts) {
		const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
		const last = Date.UTC(lastDiscard.ts.getUTCFullYear(), lastDiscard.ts.getUTCMonth(), lastDiscard.ts.getUTCDate());
		streakDays = Math.max(0, Math.round((today - last) / MS_PER_DAY));
	}

	return { eaten: countBy('consumed'), wasted: countBy('discarded'), streakDays };
}
```

- [ ] **Step 4: Run, expect PASS.** `bun test src/lib/server/stats.test.ts`.
- [ ] **Step 5: Gate + commit.**
```bash
bun run format && bun run check && bun run lint
git add src/lib/server/stats.ts src/lib/server/stats.test.ts
git commit -m "feat(m9): householdStats() anti-waste aggregation (tested)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `stats` bar-chart icon

**Files:** modify `src/routes/+layout.svelte`, `src/lib/components/ui/Icon.svelte`.

- [ ] **Step 1:** Add a symbol inside the sprite `<defs>` in `src/routes/+layout.svelte` (after `gm-monitor` or near the other UI glyphs):
```svelte
		<symbol id="gm-stats" viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M21 20H3" /></symbol>
```
- [ ] **Step 2:** Add `'stats'` to the `IconName` union in `src/lib/components/ui/Icon.svelte` (e.g. append to the UI-glyph line: `… | 'monitor' | 'stats'` — keep the `cat-*` members intact).
- [ ] **Step 3:** `bun run check && bun run format && bun run lint`. Commit:
```bash
git add src/routes/+layout.svelte src/lib/components/ui/Icon.svelte
git commit -m "feat(m9): stats (bar-chart) icon

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: i18n keys (nav + bilan)

**Files:** modify `src/lib/i18n/messages/fr.ts`, `en.ts`.

- [ ] **Step 1: `fr.ts`** (add a group; include in the `Messages` interface):
```ts
	// --- Bilan (M9) ---
	nav_bilan: 'Bilan',
	bilan_title: 'Bilan anti-gaspi',
	bilan_month_subtitle: 'Ce mois-ci',
	bilan_eaten: 'Consommés',
	bilan_wasted: 'Jetés',
	bilan_streak: (n: number) => `${n} jour${n > 1 ? 's' : ''} sans gaspillage`,
	bilan_streak_none: 'Aucun gaspillage enregistré 🎉',
	bilan_empty_title: 'Pas encore de bilan',
	bilan_empty_body: 'Marquez des aliments comme mangés ou jetés pour suivre votre anti-gaspi.',
```
- [ ] **Step 2: `en.ts`** (same keys):
```ts
	// --- Bilan (M9) ---
	nav_bilan: 'Stats',
	bilan_title: 'Waste report',
	bilan_month_subtitle: 'This month',
	bilan_eaten: 'Eaten',
	bilan_wasted: 'Wasted',
	bilan_streak: (n: number) => `${n} day${n > 1 ? 's' : ''} waste-free`,
	bilan_streak_none: 'No waste recorded yet 🎉',
	bilan_empty_title: 'Nothing to report yet',
	bilan_empty_body: 'Mark items as eaten or thrown away to track your waste.',
```
- [ ] **Step 3:** `bun run check` (parity), `bun test src/lib/i18n/i18n.test.ts`, `bun run format && bun run lint`. Commit:
```bash
git add src/lib/i18n/
git commit -m "feat(m9): i18n keys for Bilan (FR/EN)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: `StatTile.svelte`

**Files:** create `src/lib/components/ui/StatTile.svelte`.

```svelte
<script lang="ts">
	let {
		value,
		label,
		tone = 'neutral'
	}: { value: string | number; label: string; tone?: 'eaten' | 'wasted' | 'neutral' } = $props();
</script>

<div class="tile tone-{tone}">
	<div class="value">{value}</div>
	<div class="label">{label}</div>
</div>

<style>
	.tile {
		flex: 1;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		box-shadow: var(--shadow-sm);
		padding: 1.1rem 1rem;
		text-align: center;
	}
	.value { font-size: 2rem; font-weight: 800; line-height: 1; }
	.label { margin-top: 0.35rem; font-size: 0.85rem; font-weight: 600; color: var(--text-muted); }
	.tone-eaten .value { color: var(--green); }
	.tone-wasted .value { color: var(--red); }
	.tone-neutral .value { color: var(--text); }
</style>
```

- [ ] **Step 1:** Create. **Step 2:** `bun run check && bun run format && bun run lint`. **Step 3:** commit:
```bash
git add src/lib/components/ui/StatTile.svelte
git commit -m "feat(m9): StatTile component

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Bilan route (server + page)

**Files:** create `src/routes/(app)/bilan/+page.server.ts`, `src/routes/(app)/bilan/+page.svelte`.

- [ ] **Step 1: server** `src/routes/(app)/bilan/+page.server.ts`:
```ts
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { requireMembership, MembershipError } from '$lib/server/households';
import { householdStats } from '$lib/server/stats';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, cookies, parent }) => {
	const { locale } = await parent();
	const hh = cookies.get('gm_household') ?? null;
	if (!hh) return { noHousehold: true as const, locale };
	try {
		requireMembership(db, hh, locals.user!.id);
	} catch (e) {
		if (e instanceof MembershipError) error(403, 'Forbidden');
		throw e;
	}
	return { noHousehold: false as const, locale, stats: householdStats(db, hh, new Date()) };
};
```

- [ ] **Step 2: page** `src/routes/(app)/bilan/+page.svelte`:
```svelte
<script lang="ts">
	import { m } from '$lib/i18n';
	import StatTile from '$lib/components/ui/StatTile.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	let { data } = $props();
	const t = $derived(m(data.locale));
	const s = $derived(data.noHousehold ? null : data.stats);
	const empty = $derived(!!s && s.eaten === 0 && s.wasted === 0 && s.streakDays === null);
</script>

<svelte:head><title>{t.bilan_title}</title></svelte:head>

{#if data.noHousehold}
	<EmptyState icon="households" title={t.add_no_household}>
		<Button href="/households" variant="primary">{t.nav_create_household}</Button>
	</EmptyState>
{:else if empty}
	<EmptyState icon="stats" title={t.bilan_empty_title} body={t.bilan_empty_body} />
{:else if s}
	<header class="head">
		<h1>{t.bilan_title}</h1>
		<p class="sub">{t.bilan_month_subtitle}</p>
	</header>
	<div class="tiles">
		<StatTile value={s.eaten} label={t.bilan_eaten} tone="eaten" />
		<StatTile value={s.wasted} label={t.bilan_wasted} tone="wasted" />
	</div>
	<p class="streak">{s.streakDays === null ? t.bilan_streak_none : t.bilan_streak(s.streakDays)}</p>
{/if}

<style>
	.head { margin-bottom: 1rem; }
	.head h1 { margin: 0; }
	.sub { margin: 0.1rem 0 0; color: var(--text-muted); font-weight: 600; font-size: 0.9rem; }
	.tiles { display: flex; gap: 0.8rem; }
	.streak {
		margin-top: 1rem; text-align: center; font-weight: 700;
		background: var(--green-tint); color: var(--green-dark);
		border-radius: var(--radius); padding: 0.9rem;
	}
</style>
```

- [ ] **Step 3:** `bun run check` (0 errors), `bun run build`, `bun run format && bun run lint`. Commit:
```bash
git add 'src/routes/(app)/bilan'
git commit -m "feat(m9): Bilan route (scoped stats + StatTiles + empty state)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Add the Bilan tab to BottomNav

**Files:** modify `src/lib/components/ui/BottomNav.svelte`.

- [ ] **Step 1:** Insert a Bilan tab **between the FAB and the Compte tab** (so the final M9 order is Garde · + · Bilan · Compte; M10 will add Cuisiner left of the FAB). Add after the `<a href="/add" class="fab">…</a>` line and before the account `<a>`:
```svelte
	<a href="/bilan" class="tab" aria-current={path.startsWith('/bilan') ? 'page' : undefined}>
		<Icon name="stats" size={22} /><span>{t.nav_bilan}</span>
	</a>
```
- [ ] **Step 2:** `bun run check`, `bun run build`, `bun run format && bun run lint`. Commit:
```bash
git add src/lib/components/ui/BottomNav.svelte
git commit -m "feat(m9): Bilan tab in BottomNav

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Verification + final review

- [ ] **Step 1:** `bun test --timeout 30000` — all pass (224 + new stats tests).
- [ ] **Step 2:** `bun run check && bun run lint && bun run build` — all clean.
- [ ] **Step 3:** Visual smoke at 390px both themes (dev :5173): the Bilan tab appears in the nav and routes to `/bilan`; with history present, the two StatTiles (Consommés green / Jetés red) and the streak banner render; with no history, the EmptyState shows; works with JS disabled.
- [ ] **Step 4:** Confirm spec M9 "done when": stats from consumed/discarded history; tested aggregation; Bilan tab + screen. Fix gaps.

## Self-review notes
- **Spec coverage:** Bilan = StatTiles from `consumed`/`discarded` + `closedAt` (T1,T5) — eaten vs wasted this month + streak; no €/CO₂ (deferred per spec); Bilan tab (T6); icon (T2); StatTile (T4 — the M6-deferred component); i18n (T3). No schema migration (history already retained).
- **No placeholders:** all code complete; the test is self-contained (own DB fixture, not relying on inventory.test.ts internals).
- **Type consistency:** `HouseholdStats { eaten, wasted, streakDays }` (T1) is consumed identically by the route (T5) and page; `StatTile` `tone` union (`eaten|wasted|neutral`) matches its usage; `'stats'` IconName (T2) used by BottomNav (T6) + Bilan empty state (T5).
- **Streak definition:** whole UTC days since the most recent discard; `null` (→ "no waste recorded") when nothing was ever discarded. Documented; tested.
