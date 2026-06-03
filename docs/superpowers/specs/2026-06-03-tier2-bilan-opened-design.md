# Tier 2 — Bilan month-over-month + opened-basis re-dating

Date: 2026-06-03
Status: Approved (autonomous run — user pre-authorized Tiers 2–4)

## Context

Second roadmap tier. Two changes, both activating data the app already captures:

1. **Bilan month-over-month.** `householdStats` (src/lib/server/stats.ts) reports
   this-month `eaten`/`wasted` counts + a `streakDays`. It answers "how much this
   month" but not "am I getting better?" — the actual behavioural question. Add a
   previous-calendar-month comparison.
2. **Opened-basis re-dating.** `shelf_lives.basis` distinguishes
   `purchase`/`opened`/`unspecified`, and the catalogue seeds `opened` rows — but
   nothing in the app ever uses them. Let a user mark an item "opened", which
   recomputes its date from *now* using the `opened`-basis shelf life. This is the
   single most common reason an estimate is wrong (an opened carton's clock starts
   at opening, not purchase).

No schema change. New i18n keys go in both `fr.ts` and `en.ts` (`Messages` is a
hand-written interface in `fr.ts`; add the key there too; `i18n.test.ts` enforces
parity).

## Non-goals
- Per-category or cost/CO₂ waste breakdown (deferred; the spec council flagged
  "dashboards nobody reads" — month-over-month is the cheap behavioural win).
- Persisting an `openedAt` column or a separate "opened" status — re-dating
  recomputes `best_by_date` in place and flags `is_estimate`.
- Charts/graphs.

## Design

### A. Bilan month-over-month

**stats.ts:** extend `HouseholdStats` with `prevEaten: number; prevWasted: number;`
(previous calendar month, UTC). Generalize the inner counter to a half-open
window `[start, end)`:

```ts
const countBy = (status: 'consumed' | 'discarded', start: Date, end?: Date): number =>
	db.select({ c: count() }).from(inventoryItems)
		.where(and(
			eq(inventoryItems.householdId, householdId),
			eq(inventoryItems.status, status),
			gte(inventoryItems.closedAt, start),
			...(end ? [lt(inventoryItems.closedAt, end)] : [])
		)).get()?.c ?? 0;
```

- `monthStart` = first of this month (UTC). Current month uses `countBy(status, monthStart)`.
- `prevMonthStart` = first of the previous month (UTC). Previous month uses
  `countBy(status, prevMonthStart, monthStart)`.
- `streakDays` unchanged.

Add `lt` to the drizzle import.

**bilan/+page.svelte:** below the two tiles, render a single **waste-trend** line
(the mission metric — "am I wasting less?"):

- prior month had no activity (`prevEaten === 0 && prevWasted === 0`) → `bilan_trend_first`
- `wasted < prevWasted` → `bilan_trend_better(prevWasted)`
- `wasted > prevWasted` → `bilan_trend_worse(prevWasted)`
- else → `bilan_trend_same(prevWasted)`

New i18n keys (both locales + `Messages`):
- `bilan_trend_first: string` — e.g. "Your first month — no comparison yet"
- `bilan_trend_better: (prev: number) => string` — "Less waste than last month ({prev}) 🎉"
- `bilan_trend_worse: (prev: number) => string` — "More waste than last month ({prev})"
- `bilan_trend_same: (prev: number) => string` — "Same as last month ({prev})"

Styled muted; a `tone` class may color better/worse (green/red) but keep it light.
The `empty` state (no activity ever) is unchanged — the trend line only renders in
the non-empty branch.

### B. Opened-basis re-dating

**catalogue.ts — `openedEstimate`:**
```ts
export function openedEstimate(
	db: DB,
	foodId: string,
	location: 'pantry' | 'fridge' | 'freezer',
	openedAt: Date
): Date | null
```
Finds the `shelf_lives` row for `(foodId, location, basis: 'opened')`; if present
and `computeBestBy` yields a date (not `notRecommended`/guidance), returns that
date; otherwise `null`.

**inventory.ts — extend `updateItem`** to accept an optional `isEstimate?: boolean`
(one line in the `set` builder: `if (params.isEstimate !== undefined) set.isEstimate = params.isEstimate;`).

**item/[id]/+page.server.ts:**
- `load`: compute `canOpen = item.foodId ? openedEstimate(db, item.foodId, item.location, new Date()) !== null : false`; return it.
- new `open` action: resolve household + membership (same guard pattern as the
  other actions); load the item scoped + require `status === 'active'` and a
  `foodId`; `const date = openedEstimate(db, item.foodId, item.location, new Date())`;
  if `null` → `fail(400, { message: t.item_open_no_data })`; else
  `updateItem(db, { id, householdId, bestByDate: date, useByDate: null, isEstimate: true })`;
  `redirect(303, /item/${id})`. (Clearing `useByDate` makes the recomputed
  `best_by_date` the effective date; the item becomes a `~` DDM estimate.)

**item/[id]/+page.svelte:** when `data.canOpen`, render a "Mark as opened" button
(its own `<form method="POST" action="?/open">`) near the lifecycle actions.

New i18n keys (both locales + `Messages`):
- `item_mark_opened: string` — fr "Je l'ai entamé", en "Mark as opened"
- `item_open_no_data: string` — fr/en error when no opened-basis guidance exists

## Files touched
- `src/lib/server/stats.ts` (+ `stats.test.ts`)
- `src/routes/(app)/bilan/+page.svelte`
- `src/lib/server/catalogue.ts` (+ `catalogue.test.ts`) — `openedEstimate`
- `src/lib/server/inventory.ts` (+ `inventory.test.ts`) — `updateItem` isEstimate
- `src/routes/(app)/item/[id]/+page.server.ts` + `+page.svelte`
- `src/lib/i18n/messages/fr.ts` + `en.ts` (+ `Messages` interface)
- `tests/e2e/fixtures/db.ts` — add `seedFood` + `seedShelfLife` helpers
- `tests/e2e/item.spec.ts` — open-flow e2e; `tests/e2e/bilan.spec.ts` — trend e2e

## Testing (TDD)
- `householdStats`: prev-month counts; an item closed last month counts in `prev`
  not current; boundary at the month start.
- `openedEstimate`: returns a recomputed date from the opened-basis row; null when
  no opened row / notRecommended / no food.
- `updateItem`: setting `isEstimate` persists.
- e2e: marking a fresh catalogue item (with an opened-basis shelf life seeded via
  the new fixtures) "opened" recomputes its date and shows the `~` estimate;
  Bilan renders the trend line.
