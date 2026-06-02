# Tier 1 — Inventory UX: partial use, day badge, estimate mark, storage tips

Date: 2026-06-03
Status: Approved design, pending implementation plan

## Context

First tier of a four-tier roadmap that came out of a feature-brainstorm council.
Tier 1 is the "make the data we already have honest and visible" release: small,
mostly-reuse changes that fix data honesty and surface dormant columns. No new
tables, no migration, no new dependencies.

The four items, as scoped against the actual code:

1. **Partial consumption** — consumption is currently all-or-nothing
   (`setStatus`), which corrupts multi-unit items (eat 1 of 6 → either lie and
   mark all consumed, or hand-edit the quantity). The chosen behavior is
   **quick −1 per tap**.
2. **Overdue day count** — the day badge already shows days remaining
   (`DayBadge.svelte` + `dayBadge()` in `src/lib/dates.ts`). The only gap is that
   overdue items render a bare `!`. Show the count instead.
3. **Estimate mark** — `inventory_items.isEstimate` is stored on catalogue-derived
   items but rendered nowhere. Mark estimated dates with a `~` prefix.
4. **Storage tip** — `shelf_lives.tipsFr/tipsEn` (59 foods seeded) are read by no
   component. Surface the relevant tip on the item detail page only.

## Non-goals

- Unit-level consumption history (which units were eaten vs tossed). See
  "Partial consumption" below for why this is deferred.
- Any change to the Bilan stats screen (that is Tier 2).
- Showing tips on the add flow (item detail only, by decision).
- Schema changes, migrations, or new dependencies.

## Design

Each item is a thin, independently testable server/helper unit plus a small
Svelte render. New i18n strings go in `src/lib/i18n/messages/fr.ts` and `en.ts`;
the `Messages` type derives from `fr`, and `i18n.test.ts` guards key parity.

### 1. Partial consumption

**Helper (new):** `recordUse` in `src/lib/server/inventory.ts`.

```ts
export function recordUse(
  db: DB,
  { id, householdId, outcome }:
    { id: string; householdId: string; outcome: 'consumed' | 'discarded' }
): InventoryItem | undefined {
  const item = getItemScoped(db, { id, householdId });
  if (!item) return undefined;
  if (item.quantity > 1) {
    return updateItem(db, { id, householdId, quantity: item.quantity - 1 });
  }
  return setStatus(db, { id, householdId, status: outcome });
}
```

- Household-scoped via the existing helpers; no new query patterns.
- `quantity > 1` → decrement by one, row stays `active`.
- `quantity === 1` → `setStatus(...)` exactly as today (stamps `status` +
  `closedAt`).
- Not found / wrong household → `undefined` (callers already map this to 404).

**Wiring:** replace the direct `setStatus` calls in the `consume` and `discard`
actions of:

- `src/routes/(app)/garde-manger/+page.server.ts`
- `src/routes/(app)/item/[id]/+page.server.ts`

with `recordUse(db, { id, householdId, outcome: 'consumed' | 'discarded' })`.
Redirect behavior is unchanged.

**UI:** no label change. Buttons stay "Eaten" / "Tossed"; the `× N` already in the
row meta (`ItemRow.svelte`) visibly ticks down on reload. Works with no JS (the
existing hidden-`<form>` + `form=` pattern) and through the swipe enhancement
unchanged.

**Accepted limitation:** while a multi-unit row is drawn down it stays `active`;
only the final tap stamps one status. A ×6 row mostly eaten but tossed last counts
as one *discarded item* — the same 1-row-per-event granularity Bilan has today.
Unit-level accuracy would need an `item_events` table (a Tier 2 concern), which is
why it is out of scope here.

### 2. Overdue day count

**Helper (new, pure):** extract badge text/aria composition out of the component
into `src/lib/dates.ts` so it is unit-testable:

```ts
export function formatDayBadge(
  days: number | null,
  t: Pick<Messages, 'day_today' | 'day_unit' | 'day_overdue'>
): { text: string; aria: string }
```

Cases:

- `days === null` → text `∞`, aria `∞`
- `days < 0` → text `${days}` (e.g. `−2`), aria `${Math.abs(days)} ${t.day_unit} · ${t.day_overdue}`
- `days === 0` → text + aria `t.day_today`
- `days > 0` → text `${days} ${t.day_unit}`, aria the same

`DayBadge.svelte` calls `dayBadge()` (unchanged) then `formatDayBadge()` for the
visible text + aria. The band coloring is unchanged. The `−` is the literal minus
from the negative number; it fits the 2.9rem badge.

### 3. Estimate mark `~`

Plumb the existing `isEstimate` flag to the views:

- `src/routes/(app)/garde-manger/+page.server.ts`: add `isEstimate: boolean` to
  the `ItemRow` interface and set `isEstimate: item.isEstimate` in the row build.
- `src/lib/components/ui/ItemRow.svelte`: add `isEstimate` to `RowItem`; when true
  and a date label exists, prefix it with `~ ` (e.g. `~ Best before 12 Jun`). Add
  an accessible qualifier (e.g. an `aria-label`/`title` using a new
  `est_label` string) so the `~` is not the only signal.
- `src/routes/(app)/item/[id]/+page.server.ts` + `+page.svelte`: pass
  `isEstimate` and render a small caption near the date (e.g. `~ <est_label>`)
  when true.

Only estimated dates are marked; user-entered dates and DLCs are untouched.

### 4. Storage tip (item detail only)

**Helper (new):** `tipForItem` in `src/lib/server/catalogue.ts`:

```ts
export function tipForItem(
  db: DB,
  foodId: string,
  location: 'pantry' | 'fridge' | 'freezer',
  locale: 'fr' | 'en'
): string | null
```

- Selects `shelf_lives` rows for `(foodId, location)`.
- Prefers `basis = 'purchase'` (the basis the estimate is computed from), else any.
- Returns the localized `tipsFr`/`tipsEn`, or `null` if none / no row / no foodId.

**Wiring:** `item/[id]/+page.server.ts` load calls `tipForItem` only when
`item.foodId` is set, returns `tip: string | null`. `+page.svelte` renders a small
`💡` tip line **only when `tip` is non-null** (no empty box otherwise).

## Files touched

- `src/lib/server/inventory.ts` — add `recordUse`
- `src/lib/server/catalogue.ts` — add `tipForItem`
- `src/lib/dates.ts` — add `formatDayBadge`
- `src/lib/components/ui/DayBadge.svelte` — use `formatDayBadge`
- `src/lib/components/ui/ItemRow.svelte` — `isEstimate` + `~` prefix
- `src/routes/(app)/garde-manger/+page.server.ts` — `recordUse`, `isEstimate` on row
- `src/routes/(app)/item/[id]/+page.server.ts` — `recordUse`, `tipForItem`, `isEstimate`
- `src/routes/(app)/item/[id]/+page.svelte` — tip line, estimate caption
- `src/lib/i18n/messages/fr.ts` + `en.ts` — new key `est_label` ("estimated" /
  "estimée") for the estimate qualifier. The overdue badge reuses the existing
  `day_overdue` / `day_unit` keys (no new badge string). The tip line needs no new
  string (the tip text is its content); an optional `item_tip_label` heading may
  be added if the bare line reads poorly.

## Testing (TDD)

Unit (`bun test ./src`, alongside existing suites):

- `recordUse`: qty>1 decrements and stays `active`; qty==1 → `consumed` /
  `discarded` with `closedAt`; wrong household → `undefined`; missing id →
  `undefined`.
- `formatDayBadge`: null → `∞`; negative → count + overdue aria; zero → today;
  positive → `N d`.
- `tipForItem`: returns localized tip; prefers `purchase` basis over others; null
  when the food/location has no tip.

E2E (Playwright): tapping "Eaten" on a ×N item decrements to ×(N-1) and the row
stays on the list; tapping it on a ×1 item removes it from the list.

## Rollout

Pure additive UI + behavior change on existing routes. No migration, so deploy is
a normal build. The only behavioral change a user notices is that multi-unit
"Eaten"/"Tossed" now decrements instead of closing the whole row.
