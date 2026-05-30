# Garde-Manger M7 · Garde (home) redesign + Item detail — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the core home screen on the M6 design system (name-first rows, glanceable day-badges, real category-icon/photo thumbnails, calm-vs-shout urgency) and add an item-detail screen (edit date/quantity/location/notes, consume/discard/delete) — fixing the truncated-name and broken-thumbnail bugs.

**Architecture:** New presentational components (`DayBadge`, `Thumb`, `ItemRow`) compose the M6 primitives. The home `+page.svelte` is rebuilt from those; the server load gains a `category` field for icons (band/name/image logic unchanged). Item detail is a new `(app)/item/[id]` route backed by new household-scoped `updateItem`/`deleteItem`/`getItemScoped` in `inventory.ts` (pure, `bun:test`-covered). Everything is server-rendered and works with **no JavaScript** (`(app)` is `csr=false`); actions are form POSTs.

**Tech Stack:** SvelteKit 2.57 + Svelte 5 (runes), Bun, `bun:test`, Drizzle/`bun:sqlite`, inline-SVG sprite icons.

---

## Conventions (read once)
- **Run tests:** `bun test` (all) / `bun test <file>` (one). No `test` npm script.
- **Gate every task:** `bun run format` → `bun run check` → `bun run lint`. `bun:sqlite` is synchronous (no `await`).
- **No-JS:** every interaction is a link or form POST. `(app)` routes are `csr=false`.
- **Commit trailer:** end every commit message with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- **Branch:** `redesign/m7` (already checked out). A dev server is running on :5173 — don't start another; for build smoke use port 3000 and kill it.
- New components in `src/lib/components/ui/`. M6 gives you: `Icon.svelte` (+`IconName`), `Button`, `Card`, `Chip`, `EmptyState`, tokens, the icon sprite in `src/routes/+layout.svelte`.

## File map
| File | Responsibility | Action |
|---|---|---|
| `src/routes/+layout.svelte` | add 12 category `<symbol>`s to the sprite | modify |
| `src/lib/icons.ts` | `categoryIcon(category)` → IconName (pure) | create |
| `src/lib/icons.test.ts` | tests for `categoryIcon` | create |
| `src/lib/components/ui/Icon.svelte` | extend `IconName` union with category names | modify |
| `src/lib/dates.ts` | `dayBadge(iso, now)` → `{label, days}` (pure) | create |
| `src/lib/dates.test.ts` | tests for `dayBadge` | create |
| `src/lib/server/inventory.ts` | `getItemScoped`, `updateItem`, `deleteItem` (household-scoped) | modify |
| `src/lib/server/inventory.test.ts` | tests for the three new fns | modify |
| `src/lib/components/ui/DayBadge.svelte` | urgency badge (filled urgent / outline soon·ok) | create |
| `src/lib/components/ui/Thumb.svelte` | photo → category icon → fallback | create |
| `src/lib/components/ui/ItemRow.svelte` | name-first row, link to detail, urgent inline actions | create |
| `src/routes/(app)/+page.server.ts` | add `category` to `ItemRow`/load | modify |
| `src/routes/(app)/+page.svelte` | rebuild home from components + `EmptyState` | modify |
| `src/routes/(app)/item/[id]/+page.server.ts` | load scoped item + update/consume/discard/delete actions | create |
| `src/routes/(app)/item/[id]/+page.svelte` | item-detail UI | create |
| `src/lib/i18n/messages/fr.ts`, `en.ts` | day-badge + item-detail keys | modify |

---

### Task 1: Category icons + `categoryIcon()` (TDD)

The 12 `foods.category` values map to 12 icon names. Add the symbols to the sprite, extend `IconName`, and a tested pure mapping.

**Files:** modify `src/routes/+layout.svelte`, `src/lib/components/ui/Icon.svelte`; create `src/lib/icons.ts`, `src/lib/icons.test.ts`.

- [ ] **Step 1: Add 12 category `<symbol>`s** inside the existing `<defs>` in `src/routes/+layout.svelte` (after the existing `gm-monitor` symbol):

```svelte
		<symbol id="gm-cat-fruit" viewBox="0 0 24 24"><path d="M12 8c1-3 4-4 6-3 1 4-1 9-4 11-1 .7-3 .7-4 0C7 14 5 9 6 5c2-1 5 0 6 3z" /><path d="M12 8V4" /></symbol>
		<symbol id="gm-cat-veg" viewBox="0 0 24 24"><path d="M5 13c0 4 3 7 7 7s7-3 7-7-3-6-7-6-7 2-7 6z" /><path d="M12 7c0-2 1-3 3-4M12 7c0-1-1-2-3-3" /></symbol>
		<symbol id="gm-cat-herb" viewBox="0 0 24 24"><path d="M12 21V9" /><path d="M12 12c-3 0-5-2-5-5 3 0 5 2 5 5zM12 10c3 0 5-2 5-5-3 0-5 2-5 5z" /></symbol>
		<symbol id="gm-cat-charcuterie" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" /><circle cx="9" cy="10" r="1" /><circle cx="14" cy="13" r="1" /><circle cx="11" cy="15" r="1" /></symbol>
		<symbol id="gm-cat-fish" viewBox="0 0 24 24"><path d="M3 12c4-5 11-5 15 0-4 5-11 5-15 0z" /><path d="M18 12c1-1 3-2 3-2v4s-2-1-3-2z" /><circle cx="8" cy="12" r="1" /></symbol>
		<symbol id="gm-cat-dairy" viewBox="0 0 24 24"><path d="M8 3h8l-1 4v12a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V7z" /><path d="M9 9h6" /></symbol>
		<symbol id="gm-cat-meat" viewBox="0 0 24 24"><path d="M14 4a5 5 0 0 1 5 5c0 3-3 5-6 6-2 .7-4 2-5 4-1-1-2-3-1-5 1-3 3-5 6-6a5 5 0 0 1 1-4z" /><circle cx="7" cy="17" r="2" /></symbol>
		<symbol id="gm-cat-poultry" viewBox="0 0 24 24"><path d="M6 20c0-5 3-9 8-9 3 0 5 2 5 5 0 4-4 4-4 4z" /><path d="M14 11c0-2-1-4-3-4M11 7l-2-2" /></symbol>
		<symbol id="gm-cat-egg" viewBox="0 0 24 24"><path d="M12 3c3 0 6 5 6 9a6 6 0 0 1-12 0c0-4 3-9 6-9z" /></symbol>
		<symbol id="gm-cat-bakery" viewBox="0 0 24 24"><path d="M4 13c0-3 4-5 8-5s8 2 8 5c0 2-2 3-2 3H6s-2-1-2-3z" /><path d="M9 11l1 5M13 11l1 5" /></symbol>
		<symbol id="gm-cat-pantry" viewBox="0 0 24 24"><path d="M6 8h12l-1 12H7z" /><path d="M9 8V5a3 3 0 0 1 6 0v3" /></symbol>
		<symbol id="gm-cat-leftovers" viewBox="0 0 24 24"><path d="M4 11h16a8 8 0 0 1-16 0z" /><path d="M5 11a7 7 0 0 1 14 0M12 4v3" /><path d="M3 20h18" /></symbol>
```

- [ ] **Step 2: Extend `IconName`** in `src/lib/components/ui/Icon.svelte` — add the category names to the union (append after `'monitor'`):

```ts
		| 'cat-fruit' | 'cat-veg' | 'cat-herb' | 'cat-charcuterie' | 'cat-fish' | 'cat-dairy'
		| 'cat-meat' | 'cat-poultry' | 'cat-egg' | 'cat-bakery' | 'cat-pantry' | 'cat-leftovers';
```

- [ ] **Step 3: Write the failing test** `src/lib/icons.test.ts`:

```ts
import { describe, it, expect } from 'bun:test';
import { categoryIcon } from './icons';
import type { IconName } from './components/ui/Icon.svelte';

describe('categoryIcon', () => {
	it('maps each known FR category to its icon', () => {
		expect(categoryIcon('Fruits')).toBe('cat-fruit');
		expect(categoryIcon('Légumes')).toBe('cat-veg');
		expect(categoryIcon('Herbes')).toBe('cat-herb');
		expect(categoryIcon('Charcuterie')).toBe('cat-charcuterie');
		expect(categoryIcon('Poissons / Fruits de mer')).toBe('cat-fish');
		expect(categoryIcon('Produits laitiers')).toBe('cat-dairy');
		expect(categoryIcon('Viandes')).toBe('cat-meat');
		expect(categoryIcon('Volaille')).toBe('cat-poultry');
		expect(categoryIcon('Œufs')).toBe('cat-egg');
		expect(categoryIcon('Pain / Boulangerie')).toBe('cat-bakery');
		expect(categoryIcon('Placard / Épicerie')).toBe('cat-pantry');
		expect(categoryIcon('Restes / Plats cuisinés')).toBe('cat-leftovers');
	});
	it('falls back to cat-pantry for unknown/null', () => {
		expect(categoryIcon(null)).toBe('cat-pantry');
		expect(categoryIcon('Nope')).toBe('cat-pantry');
	});
});
```

- [ ] **Step 4: Run it, expect FAIL.** `bun test src/lib/icons.test.ts` → module not found.

- [ ] **Step 5: Implement** `src/lib/icons.ts`:

```ts
import type { IconName } from './components/ui/Icon.svelte';

const MAP: Record<string, IconName> = {
	Fruits: 'cat-fruit',
	Légumes: 'cat-veg',
	Herbes: 'cat-herb',
	Charcuterie: 'cat-charcuterie',
	'Poissons / Fruits de mer': 'cat-fish',
	'Produits laitiers': 'cat-dairy',
	Viandes: 'cat-meat',
	Volaille: 'cat-poultry',
	Œufs: 'cat-egg',
	'Pain / Boulangerie': 'cat-bakery',
	'Placard / Épicerie': 'cat-pantry',
	'Restes / Plats cuisinés': 'cat-leftovers'
};

/** Map a foods.category string to a category IconName; falls back to a pantry jar. */
export function categoryIcon(category: string | null | undefined): IconName {
	return (category && MAP[category]) || 'cat-pantry';
}
```

- [ ] **Step 6: Run tests, expect PASS.** `bun test src/lib/icons.test.ts`.
- [ ] **Step 7: Gate + commit.** `bun run format && bun run check && bun run lint`, then:
```bash
git add src/routes/+layout.svelte src/lib/components/ui/Icon.svelte src/lib/icons.ts src/lib/icons.test.ts
git commit -m "feat(m7): 12 category icons + categoryIcon() mapping (tested)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `dayBadge()` date helper (TDD)

Turns an effective-date ISO string into a short badge label + day count.

**Files:** create `src/lib/dates.ts`, `src/lib/dates.test.ts`.

- [ ] **Step 1: Failing test** `src/lib/dates.test.ts`:

```ts
import { describe, it, expect } from 'bun:test';
import { dayBadge } from './dates';

const NOW = new Date('2026-05-29T10:00:00Z');

describe('dayBadge', () => {
	it('null date → infinity, no days', () => {
		expect(dayBadge(null, NOW)).toEqual({ label: '∞', days: null });
	});
	it('today or past → 0 days', () => {
		expect(dayBadge('2026-05-29T00:00:00Z', NOW).days).toBe(0);
		expect(dayBadge('2026-05-20T00:00:00Z', NOW).days).toBe(-9);
	});
	it('future → positive day count', () => {
		expect(dayBadge('2026-05-30T00:00:00Z', NOW).days).toBe(1);
		expect(dayBadge('2026-06-03T00:00:00Z', NOW).days).toBe(5);
	});
});
```

- [ ] **Step 2: Run, expect FAIL.** `bun test src/lib/dates.test.ts`.
- [ ] **Step 3: Implement** `src/lib/dates.ts`:

```ts
const MS_PER_DAY = 86_400_000;

/** Whole days from `now` (UTC start-of-day) until the ISO date. null date → {∞, null}. */
export function dayBadge(iso: string | null, now: Date): { label: string; days: number | null } {
	if (!iso) return { label: '∞', days: null };
	const d = new Date(iso);
	const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
	const target = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
	const days = Math.round((target - today) / MS_PER_DAY);
	return { label: String(days), days };
}
```

- [ ] **Step 4: Run, expect PASS.** `bun test src/lib/dates.test.ts`.
- [ ] **Step 5: Gate + commit.**
```bash
bun run format && bun run check && bun run lint
git add src/lib/dates.ts src/lib/dates.test.ts
git commit -m "feat(m7): dayBadge() date-to-badge helper (tested)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: i18n keys for day-badge & item detail

**Files:** modify `src/lib/i18n/messages/fr.ts`, `en.ts`.

- [ ] **Step 1: Add to `fr.ts`** (group near the home keys):
```ts
	// --- Day badge / item detail (M7) ---
	day_today: "Auj.",
	day_overdue: 'En retard',
	day_unit: 'j',
	home_subtitle: (n: number, urgent: number) =>
		`${n} ${n > 1 ? 'aliments' : 'aliment'}${urgent > 0 ? ` · ${urgent} à consommer vite` : ''}`,
	home_empty_title: 'Garde-manger vide',
	home_empty_body: 'Ajoutez un premier aliment avec le bouton +.',
	item_detail_title: "Détail de l'aliment",
	item_added_on: 'Ajouté le',
	item_notes_label: 'Notes',
	item_notes_placeholder: 'Entamé, à finir…',
	item_save: 'Enregistrer',
	item_saved: 'Modifications enregistrées.',
	item_delete: "Supprimer l'aliment",
	item_delete_confirm: 'Confirmer la suppression',
	item_back: '← Retour',
```

- [ ] **Step 2: Mirror in `en.ts`** (same keys):
```ts
	// --- Day badge / item detail (M7) ---
	day_today: 'Today',
	day_overdue: 'Overdue',
	day_unit: 'd',
	home_subtitle: (n: number, urgent: number) =>
		`${n} ${n > 1 ? 'items' : 'item'}${urgent > 0 ? ` · ${urgent} to eat soon` : ''}`,
	home_empty_title: 'Pantry is empty',
	home_empty_body: 'Add your first item with the + button.',
	item_detail_title: 'Item detail',
	item_added_on: 'Added on',
	item_notes_label: 'Notes',
	item_notes_placeholder: 'Opened, finish soon…',
	item_save: 'Save',
	item_saved: 'Changes saved.',
	item_delete: 'Delete item',
	item_delete_confirm: 'Confirm deletion',
	item_back: '← Back',
```

- [ ] **Step 3: Verify + commit.** `bun run check` (type parity), `bun test src/lib/i18n/i18n.test.ts`, `bun run format && bun run lint`. Then:
```bash
git add src/lib/i18n/
git commit -m "feat(m7): i18n keys for day-badge and item detail (FR/EN)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Household-scoped `getItemScoped`, `updateItem`, `deleteItem` (TDD)

**Files:** modify `src/lib/server/inventory.ts`, `src/lib/server/inventory.test.ts`.

- [ ] **Step 1: Add failing tests** to `src/lib/server/inventory.test.ts` (reuse the file's existing `createDb`/seed helpers and `HOUSEHOLD_ID`; add a new describe block). Use the same item-creation helper the file already uses (e.g. `addFresh`/`addCustom`); adapt to the file's existing setup:

```ts
describe('getItemScoped / updateItem / deleteItem', () => {
	it('getItemScoped returns the item only for its household', () => {
		const db = freshDb();
		const item = addCustom(db, { householdId: HOUSEHOLD_ID, addedBy: USER_ID, customName: 'Lait', location: 'fridge' });
		expect(getItemScoped(db, { id: item.id, householdId: HOUSEHOLD_ID })?.id).toBe(item.id);
		expect(getItemScoped(db, { id: item.id, householdId: 'other' })).toBeUndefined();
	});
	it('updateItem changes fields, household-scoped', () => {
		const db = freshDb();
		const item = addCustom(db, { householdId: HOUSEHOLD_ID, addedBy: USER_ID, customName: 'Lait', location: 'fridge' });
		const upd = updateItem(db, { id: item.id, householdId: HOUSEHOLD_ID, quantity: 3, location: 'pantry', notes: 'entamé' });
		expect(upd?.quantity).toBe(3);
		expect(upd?.location).toBe('pantry');
		expect(upd?.notes).toBe('entamé');
		expect(updateItem(db, { id: item.id, householdId: 'other', quantity: 9 })).toBeUndefined();
	});
	it('deleteItem removes the row, household-scoped', () => {
		const db = freshDb();
		const item = addCustom(db, { householdId: HOUSEHOLD_ID, addedBy: USER_ID, customName: 'Lait', location: 'fridge' });
		expect(deleteItem(db, { id: item.id, householdId: 'other' })).toBe(false);
		expect(deleteItem(db, { id: item.id, householdId: HOUSEHOLD_ID })).toBe(true);
		expect(getItem(db, item.id)).toBeUndefined();
	});
});
```
(NOTE to implementer: match the existing test file's actual setup — its DB factory name, `USER_ID`/`HOUSEHOLD_ID` constants, and item-creation helper. If a `freshDb()`/`USER_ID` helper doesn't exist under those names, use whatever the file already defines. Import `getItemScoped, updateItem, deleteItem` alongside the existing imports.)

- [ ] **Step 2: Run, expect FAIL.** `bun test src/lib/server/inventory.test.ts` (new symbols undefined).
- [ ] **Step 3: Implement** in `src/lib/server/inventory.ts` (add after `setStatus`):

```ts
/** Get an item only if it belongs to the given household. */
export function getItemScoped(
	db: DB,
	{ id, householdId }: { id: string; householdId: string }
): InventoryItem | undefined {
	return (
		db
			.select()
			.from(inventoryItems)
			.where(and(eq(inventoryItems.id, id), eq(inventoryItems.householdId, householdId)))
			.get() ?? undefined
	);
}

/** Update mutable fields of an item, household-scoped. Returns the updated row or undefined. */
export function updateItem(
	db: DB,
	params: {
		id: string;
		householdId: string;
		location?: 'pantry' | 'fridge' | 'freezer';
		useByDate?: Date | null;
		bestByDate?: Date | null;
		quantity?: number;
		notes?: string | null;
	}
): InventoryItem | undefined {
	const set: Partial<typeof inventoryItems.$inferInsert> = {};
	if (params.location !== undefined) set.location = params.location;
	if (params.useByDate !== undefined) set.useByDate = params.useByDate;
	if (params.bestByDate !== undefined) set.bestByDate = params.bestByDate;
	if (params.quantity !== undefined) set.quantity = params.quantity;
	if (params.notes !== undefined) set.notes = params.notes;
	if (Object.keys(set).length === 0) return getItemScoped(db, params);

	return (
		db
			.update(inventoryItems)
			.set(set)
			.where(and(eq(inventoryItems.id, params.id), eq(inventoryItems.householdId, params.householdId)))
			.returning()
			.get() ?? undefined
	);
}

/** Hard-delete an item, household-scoped. Returns true if a row was deleted. */
export function deleteItem(
	db: DB,
	{ id, householdId }: { id: string; householdId: string }
): boolean {
	const rows = db
		.delete(inventoryItems)
		.where(and(eq(inventoryItems.id, id), eq(inventoryItems.householdId, householdId)))
		.returning()
		.all();
	return rows.length > 0;
}
```

- [ ] **Step 4: Run, expect PASS.** `bun test src/lib/server/inventory.test.ts`.
- [ ] **Step 5: Gate + commit.**
```bash
bun run format && bun run check && bun run lint
git add src/lib/server/inventory.ts src/lib/server/inventory.test.ts
git commit -m "feat(m7): household-scoped getItemScoped/updateItem/deleteItem (tested)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: `DayBadge.svelte`

Filled red for urgent; amber outline for soon; green outline for ok. Label from `dayBadge()`: `∞` (no date), `t.day_today` (days ≤ 0), else `N` + `t.day_unit`.

**Files:** create `src/lib/components/ui/DayBadge.svelte`.

```svelte
<script lang="ts">
	import { dayBadge } from '$lib/dates';
	import type { Messages } from '$lib/i18n';
	import type { Band } from '$lib/server/inventory';
	let {
		band,
		effectiveDate,
		now = new Date(),
		t
	}: { band: Band; effectiveDate: string | null; now?: Date; t: Messages } = $props();
	const info = $derived(dayBadge(effectiveDate, now));
	const text = $derived(
		info.days === null ? '∞' : info.days <= 0 ? t.day_today : `${info.days} ${t.day_unit}`
	);
</script>

<span class="badge badge-{band}" aria-label={text}>{text}</span>

<style>
	.badge {
		flex: none;
		min-width: 2.9rem;
		height: 2.9rem;
		padding: 0 0.4rem;
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-size: 0.8rem;
		font-weight: 800;
		line-height: 1;
		text-align: center;
	}
	.badge-urgent {
		background: var(--red);
		color: var(--on-accent);
		box-shadow: 0 4px 10px color-mix(in srgb, var(--red) 32%, transparent);
	}
	.badge-soon {
		background: var(--amber-tint);
		color: var(--amber-dark);
		border: 2px solid color-mix(in srgb, var(--amber) 45%, transparent);
	}
	.badge-ok {
		background: var(--green-tint);
		color: var(--green-dark);
		border: 2px solid color-mix(in srgb, var(--green) 35%, transparent);
	}
</style>
```

- [ ] **Step 1:** Create the file. **Step 2:** `bun run check && bun run format && bun run lint`. **Step 3:** commit:
```bash
git add src/lib/components/ui/DayBadge.svelte
git commit -m "feat(m7): DayBadge component (urgent filled / soon·ok outline)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: `Thumb.svelte`

Resolution order: product photo (`/products/<barcode>/image`) → category icon → fallback pantry icon. Eliminates the broken-image state.

**Files:** create `src/lib/components/ui/Thumb.svelte`.

> Implementer: confirm the product-image URL by reading the existing `thumb` snippet in `(app)/+page.svelte` before deleting it in Task 8 — it currently builds the URL from the barcode. Use the same path here.

```svelte
<script lang="ts">
	import Icon from './Icon.svelte';
	import { categoryIcon } from '$lib/icons';
	let {
		imagePath = null,
		barcode = null,
		category = null,
		size = 46,
		alt = ''
	}: {
		imagePath?: string | null;
		barcode?: string | null;
		category?: string | null;
		size?: number;
		alt?: string;
	} = $props();
	const icon = $derived(categoryIcon(category));
</script>

<div class="thumb" style="--s:{size}px">
	{#if imagePath && barcode}
		<img src={`/products/${barcode}/image`} {alt} loading="lazy" />
	{:else}
		<Icon name={icon} size={Math.round(size * 0.55)} />
	{/if}
</div>

<style>
	.thumb {
		width: var(--s);
		height: var(--s);
		flex: none;
		border-radius: 14px;
		overflow: hidden;
		display: grid;
		place-items: center;
		background: var(--surface-2);
		color: var(--text-muted);
	}
	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
</style>
```

- [ ] **Step 1:** Create. **Step 2:** gate (`check`/`format`/`lint`). **Step 3:** commit:
```bash
git add src/lib/components/ui/Thumb.svelte
git commit -m "feat(m7): Thumb component (photo → category icon → fallback)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: `ItemRow.svelte`

Name-first row: the thumb + name + meta area is a link to `/item/<id>`; on the right, the `DayBadge`. For **urgent** items, inline *Mangé/Jeté* forms render below (so urgent items can be cleared in one tap); soon/ok items are tap-to-detail only. Forms are siblings of the link (never nested inside `<a>`).

**Files:** create `src/lib/components/ui/ItemRow.svelte`.

```svelte
<script lang="ts">
	import Thumb from './Thumb.svelte';
	import DayBadge from './DayBadge.svelte';
	import Icon from './Icon.svelte';
	import type { Messages } from '$lib/i18n';
	import type { Band } from '$lib/server/inventory';

	export interface RowItem {
		id: string;
		name: string;
		location: 'pantry' | 'fridge' | 'freezer';
		dateKind: 'DLC' | 'DDM' | null;
		effectiveDate: string | null;
		band: Band;
		quantity: number;
		barcode: string | null;
		imagePath: string | null;
		category: string | null;
	}

	let { item, locale, t }: { item: RowItem; locale: 'fr' | 'en'; t: Messages } = $props();

	const locLabel = $derived(
		item.location === 'fridge'
			? t.add_location_fridge
			: item.location === 'freezer'
				? t.add_location_freezer
				: t.add_location_pantry
	);
	const dateLabel = $derived(
		item.dateKind && item.effectiveDate
			? `${item.dateKind === 'DLC' ? t.dlc_label : t.ddm_label} ${new Intl.DateTimeFormat(locale, { dateStyle: 'short' }).format(new Date(item.effectiveDate))}`
			: ''
	);
</script>

<div class="row card">
	<a class="main" href={`/item/${item.id}`}>
		<Thumb imagePath={item.imagePath} barcode={item.barcode} category={item.category} alt={item.name} />
		<span class="info">
			<span class="name">{item.name}</span>
			<span class="meta">
				{locLabel}{#if item.quantity > 1}&nbsp;· ×{item.quantity}{/if}{#if dateLabel}&nbsp;· {dateLabel}{/if}
			</span>
		</span>
		<DayBadge band={item.band} effectiveDate={item.effectiveDate} {t} />
	</a>
	{#if item.band === 'urgent'}
		<div class="actions">
			<form method="POST" action="/?/consume">
				<input type="hidden" name="id" value={item.id} />
				<button class="act eat"><Icon name="check" size={15} />{t.lifecycle_ate}</button>
			</form>
			<form method="POST" action="/?/discard">
				<input type="hidden" name="id" value={item.id} />
				<button class="act toss"><Icon name="trash" size={15} />{t.lifecycle_tossed}</button>
			</form>
		</div>
	{/if}
</div>

<style>
	.row {
		padding: 0.7rem 0.8rem;
	}
	.main {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		color: inherit;
	}
	.main:hover {
		text-decoration: none;
	}
	.info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.name {
		font-weight: 800;
		font-size: 0.95rem;
		line-height: 1.15;
		overflow-wrap: anywhere;
	}
	.meta {
		font-size: 0.78rem;
		color: var(--text-muted);
	}
	.actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.6rem;
	}
	.act {
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		padding: 0.5rem;
		border-radius: 11px;
		border: none;
		font: inherit;
		font-weight: 800;
		font-size: 0.8rem;
		cursor: pointer;
	}
	.eat {
		background: var(--green-tint);
		color: var(--green-dark);
	}
	.toss {
		background: var(--surface-2);
		color: var(--text-muted);
	}
	.actions form {
		flex: 1;
		display: flex;
		margin: 0;
	}
	.actions form button {
		width: 100%;
	}
</style>
```

- [ ] **Step 1:** Create. **Step 2:** gate. **Step 3:** commit:
```bash
git add src/lib/components/ui/ItemRow.svelte
git commit -m "feat(m7): ItemRow component (name-first, link to detail, urgent inline actions)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Home server load — add `category`

**Files:** modify `src/routes/(app)/+page.server.ts`.

- [ ] **Step 1:** Add `category: string | null;` to the `ItemRow` interface (after `imagePath`).
- [ ] **Step 2:** When building each row, resolve the category from the food map: for fresh items set `category` from `foodMap.get(item.foodId)?.category ?? null`; for packaged/custom set `null`. Add `category` to the `row` object literal. (The `foodMap` already holds the food rows; `food.category` exists on the foods table.)
- [ ] **Step 3:** Also compute an `urgentCount` and `totalCount` and return them for the new subtitle: after building `groups`, add `const totalCount = groups.urgent.length + groups.soon.length + groups.ok.length;` and `const urgentCount = groups.urgent.length;` and include both in the returned object.
- [ ] **Step 4:** `bun run check` (0 errors). `bun run format && bun run lint`.
- [ ] **Step 5:** Commit:
```bash
git add 'src/routes/(app)/+page.server.ts'
git commit -m "feat(m7): expose item category + counts from home load

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Rebuild the home page

**Files:** modify `src/routes/(app)/+page.svelte`.

- [ ] **Step 1:** Replace the whole file with a version that:
  - imports `Chip`, `ItemRow`, `EmptyState` from `$lib/components/ui/...`, `m` from `$lib/i18n`, and the page `data`.
  - `const t = $derived(m(data.locale));`
  - Renders a header: `<h1>{data.activeHouseholdName}</h1>` + a subtitle `{t.home_subtitle(totalCount, urgentCount)}` (use the returned counts). **Remove the old in-page “＋ Ajouter” button** — the bottom-nav FAB now owns adding.
  - A filter chip row using `Chip` (active by `data.locationFilter`): `Tout`→`/`, `Réfrigérateur`→`/?location=fridge`, `Placard`→`/?location=pantry`, `Congélateur`→`/?location=freezer` (labels `t.home_filter_all`, `t.add_location_fridge/pantry/freezer`).
  - If all bands empty → `<EmptyState icon="home" title={t.home_empty_title} body={t.home_empty_body} />`.
  - Else, for each non-empty band in order urgent → soon → ok (ok hidden when `data.expiringOnly`), a section with the band label (`t.home_band_urgent/soon/ok`) and an `{#each}` of `<ItemRow {item} locale={data.locale} {t} />`. Use a colored dot before the band label consistent with the band.
  - Keep the `(app)` layout's shell (don't add a header/nav — those come from M6).

  Reference structure (write it cleanly; the key is: no truncation, ItemRow per item, EmptyState, no in-page add button):
```svelte
<script lang="ts">
	import { m } from '$lib/i18n';
	import Chip from '$lib/components/ui/Chip.svelte';
	import ItemRow from '$lib/components/ui/ItemRow.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	let { data } = $props();
	const t = $derived(m(data.locale));
	const bands = $derived(
		[
			{ key: 'urgent', label: t.home_band_urgent, color: 'var(--red)', rows: data.groups.urgent },
			{ key: 'soon', label: t.home_band_soon, color: 'var(--amber)', rows: data.groups.soon },
			{ key: 'ok', label: t.home_band_ok, color: 'var(--green)', rows: data.expiringOnly ? [] : data.groups.ok }
		].filter((b) => b.rows.length > 0)
	);
	const empty = $derived(bands.length === 0);
</script>

<header class="head">
	<h1>{data.activeHouseholdName}</h1>
	<p class="sub">{t.home_subtitle(data.totalCount, data.urgentCount)}</p>
</header>

<div class="filters">
	<Chip href="/" active={!data.locationFilter}>{t.home_filter_all}</Chip>
	<Chip href="/?location=fridge" active={data.locationFilter === 'fridge'}>{t.add_location_fridge}</Chip>
	<Chip href="/?location=pantry" active={data.locationFilter === 'pantry'}>{t.add_location_pantry}</Chip>
	<Chip href="/?location=freezer" active={data.locationFilter === 'freezer'}>{t.add_location_freezer}</Chip>
</div>

{#if empty}
	<EmptyState icon="home" title={t.home_empty_title} body={t.home_empty_body} />
{:else}
	{#each bands as b (b.key)}
		<section class="band">
			<h2 class="band-title"><span class="dot" style="background:{b.color}"></span>{b.label}</h2>
			<div class="list">
				{#each b.rows as item (item.id)}
					<ItemRow {item} locale={data.locale} {t} />
				{/each}
			</div>
		</section>
	{/each}
{/if}

<style>
	.head { margin-bottom: 0.8rem; }
	.head h1 { margin: 0; }
	.sub { margin: 0.1rem 0 0; color: var(--text-muted); font-weight: 600; font-size: 0.9rem; }
	.filters { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.2rem; }
	.band { margin-bottom: 1.5rem; }
	.band-title {
		display: flex; align-items: center; gap: 0.5rem;
		font-size: 0.8rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em;
		margin: 0 0 0.6rem;
	}
	.dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
	.list { display: flex; flex-direction: column; gap: 0.6rem; }
</style>
```

- [ ] **Step 2:** Verify the data fields used (`data.totalCount`, `data.urgentCount`, `data.activeHouseholdName`, `data.locationFilter`, `data.groups`, `data.expiringOnly`, `data.locale`) all come from the load (Task 8 added counts). `bun run check` (0 errors), `bun run build`.
- [ ] **Step 3:** `bun run format && bun run lint`. Commit:
```bash
git add 'src/routes/(app)/+page.svelte'
git commit -m "feat(m7): rebuild home with ItemRow/DayBadge/Thumb + EmptyState (no truncation)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Item-detail route — server

**Files:** create `src/routes/(app)/item/[id]/+page.server.ts`.

- [ ] **Step 1:** Implement the load (household-scoped) + actions. It mirrors the home page's membership pattern (`resolveActiveHouseholdId` via `gm_household` cookie; `requireMembership`). Resolve display name + category + imagePath the same way the home load does (food vs product vs custom).

```ts
import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { foods, products } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { requireMembership, MembershipError } from '$lib/server/households';
import { getItemScoped, updateItem, deleteItem, setStatus, bandFor } from '$lib/server/inventory';
import type { PageServerLoad, Actions } from './$types';

function activeHouseholdId(cookies: import('@sveltejs/kit').Cookies): string | null {
	return cookies.get('gm_household') ?? null;
}

export const load: PageServerLoad = async ({ params, locals, cookies, parent }) => {
	const { locale } = await parent();
	const hh = activeHouseholdId(cookies);
	if (!hh) redirect(303, '/');
	try {
		requireMembership(db, hh, locals.user!.id);
	} catch (e) {
		if (e instanceof MembershipError) error(403, 'Forbidden');
		throw e;
	}
	const item = getItemScoped(db, { id: params.id, householdId: hh });
	if (!item) error(404, 'Not found');

	let name = '—';
	let category: string | null = null;
	let imagePath: string | null = null;
	if (item.foodId) {
		const food = db.select().from(foods).where(eq(foods.id, item.foodId)).get();
		if (food) {
			name = locale === 'fr' ? food.nameFr : food.nameEn;
			category = food.category;
		}
	} else if (item.kind === 'packaged' && item.barcode) {
		const product = db.select().from(products).where(eq(products.barcode, item.barcode)).get();
		name = product?.name ?? item.customName ?? item.barcode ?? '—';
		imagePath = product?.imagePath ?? null;
	} else if (item.customName) {
		name = item.customName;
	}

	const dateKind: 'DLC' | 'DDM' | null = item.useByDate ? 'DLC' : item.bestByDate ? 'DDM' : null;
	const effectiveDate = item.effectiveDate ? item.effectiveDate.toISOString() : null;
	const dateValue = effectiveDate ? effectiveDate.slice(0, 10) : '';
	const band = bandFor(item.effectiveDate ?? null, 3, new Date());

	return {
		locale,
		item: {
			id: item.id, name, category, imagePath, barcode: item.barcode,
			location: item.location, quantity: item.quantity, notes: item.notes ?? '',
			dateKind, effectiveDate, dateValue, band,
			addedAt: item.addedAt ? item.addedAt.toISOString() : null
		}
	};
};

export const actions: Actions = {
	update: async ({ request, params, locals, cookies }) => {
		const hh = activeHouseholdId(cookies);
		if (!hh) error(400, 'No active household');
		try { requireMembership(db, hh, locals.user!.id); }
		catch (e) { if (e instanceof MembershipError) error(403, 'Forbidden'); throw e; }

		const fd = await request.formData();
		const location = fd.get('location') as 'pantry' | 'fridge' | 'freezer';
		const quantity = Math.max(1, parseInt((fd.get('quantity') as string) ?? '1', 10) || 1);
		const notes = ((fd.get('notes') as string) ?? '').trim() || null;
		const dateKind = fd.get('dateKind') as 'DLC' | 'DDM' | null;
		const dateStr = (fd.get('date') as string) ?? '';
		const date = dateStr ? new Date(dateStr) : null;

		const patch: Parameters<typeof updateItem>[1] = { id: params.id, householdId: hh, location, quantity, notes };
		if (dateKind === 'DLC') patch.useByDate = date;
		else if (dateKind === 'DDM') patch.bestByDate = date;

		const updated = updateItem(db, patch);
		if (!updated) return fail(404, { message: 'Not found' });
		redirect(303, `/item/${params.id}`);
	},
	consume: async ({ params, locals, cookies }) => {
		const hh = activeHouseholdId(cookies);
		if (!hh) error(400, 'No active household');
		try { requireMembership(db, hh, locals.user!.id); }
		catch (e) { if (e instanceof MembershipError) error(403, 'Forbidden'); throw e; }
		if (!setStatus(db, { id: params.id, householdId: hh, status: 'consumed' })) error(404, 'Not found');
		redirect(303, '/');
	},
	discard: async ({ params, locals, cookies }) => {
		const hh = activeHouseholdId(cookies);
		if (!hh) error(400, 'No active household');
		try { requireMembership(db, hh, locals.user!.id); }
		catch (e) { if (e instanceof MembershipError) error(403, 'Forbidden'); throw e; }
		if (!setStatus(db, { id: params.id, householdId: hh, status: 'discarded' })) error(404, 'Not found');
		redirect(303, '/');
	},
	remove: async ({ params, locals, cookies }) => {
		const hh = activeHouseholdId(cookies);
		if (!hh) error(400, 'No active household');
		try { requireMembership(db, hh, locals.user!.id); }
		catch (e) { if (e instanceof MembershipError) error(403, 'Forbidden'); throw e; }
		if (!deleteItem(db, { id: params.id, householdId: hh })) error(404, 'Not found');
		redirect(303, '/');
	}
};
```

> NOTE: the load uses `bandFor(..., 3, ...)` with a fixed 3-day window for the detail badge — the home page's authoritative band is per-household `warn_days`; matching it exactly here is optional for M7 (the detail badge is informational). If the implementer can cheaply read the household's `warn_days` (as the home load does), prefer that; otherwise the fixed window is acceptable and must be noted.

- [ ] **Step 2:** `bun run check` (0 errors). `bun run format && bun run lint`.
- [ ] **Step 3:** Commit:
```bash
git add 'src/routes/(app)/item'
git commit -m "feat(m7): item-detail server (scoped load + update/consume/discard/delete)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Item-detail route — page

**Files:** create `src/routes/(app)/item/[id]/+page.svelte`.

- [ ] **Step 1:** Implement the UI: back link, large `Thumb` + name + `DayBadge`; an edit `<form method="POST" action="?/update">` (location select, date input bound to `dateValue` with a hidden `dateKind`, quantity number, notes textarea, save `Button`); a consume/discard pair; and a delete inside a `<details>` (no-JS confirm). Use M6 primitives and tokens.

```svelte
<script lang="ts">
	import { m } from '$lib/i18n';
	import Thumb from '$lib/components/ui/Thumb.svelte';
	import DayBadge from '$lib/components/ui/DayBadge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	let { data } = $props();
	const t = $derived(m(data.locale));
	const it = $derived(data.item);
</script>

<a class="back" href="/">{t.item_back}</a>

<header class="head">
	<Thumb imagePath={it.imagePath} barcode={it.barcode} category={it.category} size={64} alt={it.name} />
	<div class="ht">
		<h1>{it.name}</h1>
	</div>
	<DayBadge band={it.band} effectiveDate={it.effectiveDate} {t} />
</header>

<Card>
	<form method="POST" action="?/update" class="edit">
		<label>{t.add_location_label}
			<select name="location" value={it.location}>
				<option value="pantry">{t.add_location_pantry}</option>
				<option value="fridge">{t.add_location_fridge}</option>
				<option value="freezer">{t.add_location_freezer}</option>
			</select>
		</label>
		{#if it.dateKind}
			<input type="hidden" name="dateKind" value={it.dateKind} />
			<label>{it.dateKind === 'DLC' ? t.dlc_label : t.ddm_label}
				<input type="date" name="date" value={it.dateValue} />
			</label>
		{/if}
		<label>{t.add_quantity_label}
			<input type="number" name="quantity" min="1" value={it.quantity} />
		</label>
		<label>{t.item_notes_label}
			<textarea name="notes" rows="2" placeholder={t.item_notes_placeholder}>{it.notes}</textarea>
		</label>
		<Button type="submit" full>{t.item_save}</Button>
	</form>
</Card>

<div class="lifecycle">
	<form method="POST" action="?/consume"><Button type="submit" variant="secondary" icon="check" full>{t.lifecycle_ate}</Button></form>
	<form method="POST" action="?/discard"><Button type="submit" variant="secondary" icon="trash" full>{t.lifecycle_tossed}</Button></form>
</div>

<details class="danger">
	<summary>{t.item_delete}</summary>
	<form method="POST" action="?/remove">
		<Button type="submit" variant="danger" icon="trash" full>{t.item_delete_confirm}</Button>
	</form>
</details>

<style>
	.back { display: inline-block; margin-bottom: 0.6rem; font-weight: 700; color: var(--text-muted); }
	.head { display: flex; align-items: center; gap: 0.8rem; margin-bottom: 1.2rem; }
	.head h1 { margin: 0; font-size: 1.3rem; overflow-wrap: anywhere; }
	.ht { flex: 1; min-width: 0; }
	.edit { display: flex; flex-direction: column; gap: 0.8rem; }
	.edit label { display: flex; flex-direction: column; gap: 0.3rem; }
	.lifecycle { display: flex; gap: 0.6rem; margin: 1rem 0; }
	.lifecycle form { flex: 1; display: flex; }
	.danger { margin-top: 0.5rem; }
	.danger summary { color: var(--red-dark); font-weight: 700; cursor: pointer; padding: 0.5rem 0; }
	.danger form { margin-top: 0.5rem; }
</style>
```

- [ ] **Step 2:** `bun run check` (0 errors), `bun run build`. `bun run format && bun run lint`.
- [ ] **Step 3:** Commit:
```bash
git add 'src/routes/(app)/item'
git commit -m "feat(m7): item-detail page (edit/consume/discard/delete, no-JS)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Milestone verification + final review

- [ ] **Step 1:** `bun test` — all pass (the M6 215 + new icons/dates/inventory tests).
- [ ] **Step 2:** `bun run check && bun run lint && bun run build` — all clean.
- [ ] **Step 3:** Visual smoke at 390px in both themes (dev server on :5173): home shows full item names (no truncation), category-icon/photo thumbs, day-badges (filled red urgent / outline soon·ok), urgent inline actions; tapping a row opens `/item/<id>`; edit saves; consume/discard/delete redirect home; empty state renders; **no JS** (all flows work with JS disabled).
- [ ] **Step 4:** Confirm against the spec's M7 "done when": names never truncate; no broken images; detail edit/delete works; component tests added. Fix any gaps.

## Self-review notes
- **Spec coverage:** home redesign (day-badges, calm/shout, real thumbnails, empty state) — T5–T9; item detail (edit date/qty/location/notes, history-add date, consume/discard/delete) — T4,T10,T11; category icons replacing emoji/broken thumbs — T1,T6; quick actions — T7 (urgent inline). **Deferred (noted):** swipe-gesture quick actions are an optional JS enhancement, omitted (no-JS inline buttons cover the need); item "history" beyond added-date is out of M7 scope (the data exists for a later view). DayBadge tone uses the server `band` (authoritative); the detail badge uses a fixed warn window unless the household's `warn_days` is cheaply available.
- **No placeholders:** every component/file has complete code; the two "match existing setup" notes (inventory test helpers; product-image URL) are explicit verification steps, not gaps.
- **Type consistency:** `RowItem` (T7) matches the home `ItemRow` server type + the new `category` field (T8); `getItemScoped`/`updateItem`/`deleteItem` signatures (T4) are used identically in T10; `categoryIcon`/`IconName` (T1) reused by Thumb (T6); `dayBadge` (T2) used by DayBadge (T5).
