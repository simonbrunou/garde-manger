# Tier 4 — "Encore bon?" shelf-life lookup engine

Date: 2026-06-03
Status: Approved (autonomous run)

## Context

The product's distinctive asset is its curated bilingual shelf-life catalogue
(`foods` + `shelf_lives`, sourced from ADEME / Santé publique France). Today it is
only reachable while adding an inventory item. "Encore bon?" surfaces it as a
standalone **answer engine**: search any food (even one you don't own) and see how
long it keeps — pantry / fridge / freezer, from purchase and once opened — at the
exact moment of need ("I have an opened yogurt, is it still good?").

This is the opposite of the removed Cook tab: it surfaces *proprietary sourced
data*, not a re-list of inventory. Catalogue-only — no household or inventory
dependency (works even for a user with no household).

No schema change. New i18n keys in both locales + the `Messages` interface.

## Non-goals
- A public (unauthenticated) route — keep it inside the authed `(app)` group for now.
- Adding foods to inventory from this view (that's the existing `/add` flow; a
  future enhancement could cross-link).
- Cost/CO₂ or recipe data.

## Design

### Catalogue helper — `shelfLifeGuide`
`src/lib/server/catalogue.ts`:

```ts
export interface ShelfLifeEntry {
	location: 'pantry' | 'fridge' | 'freezer';
	basis: 'purchase' | 'opened' | 'unspecified';
	min: number;
	max: number;
	unit: 'hours' | 'days' | 'weeks' | 'months' | 'years';
	notRecommended: boolean;
	tips: string | null; // localized
}

export function shelfLifeGuide(db: DB, foodId: string, locale: 'fr' | 'en'): ShelfLifeEntry[]
```
Selects all `shelf_lives` rows for `foodId`, maps to `ShelfLifeEntry` (localized
`tips`), and returns them sorted by location (pantry, fridge, freezer) then basis
(purchase, opened, unspecified) for stable display. Empty array if the food has no
rows. Unit-testable.

### Route `/encore-bon` (in `(app)`)
`+page.server.ts` load (no membership/household needed):
- `const { locale } = await parent();`
- `q = url.searchParams.get('q') ?? ''`; `foodId = url.searchParams.get('food')`.
- `results = searchFoods(db, q, locale)` (reuse).
- if `foodId`: load the `foods` row; if found, `selected = { id, name }` (localized)
  and `guide = shelfLifeGuide(db, foodId, locale)`.
- return `{ locale, q, results, selected, guide }`.

`+page.svelte`:
- Title + a short intro line (`encore_intro`).
- A `GET` search form (reuse `add_search_label` / `add_search_placeholder` /
  `add_search_submit`) posting `q` to `/encore-bon`.
- Results: list of foods (reuse `add_no_results` when empty + a query present),
  each a link to `/encore-bon?q=<q>&food=<id>`.
- When `selected`: a card with the food name and the guide grouped by location.
  For each location heading (Pantry / Fridge / Freezer via existing
  `add_location_*`), list its entries: a basis label
  (`encore_basis_purchase|opened|unspecified`) and either
  `encore_keeps(range)` (range = `min–max <unit>`, or `max <unit>` when min===max,
  unit via `dur_*`) or `encore_not_recommended` when `notRecommended`; show `tips`
  when present. End the card with the shared `est_disclaimer` (Tier 3).

### Navigation
`src/lib/components/ui/BottomNav.svelte`: add a 4th tab linking `/encore-bon` with
the existing `search` icon and label `nav_encore_bon`, `aria-current` when
`path.startsWith('/encore-bon')`. (The tab bar already caps tab width and ellipsizes
labels, so four tabs fit.)

### i18n (both locales + `Messages` interface)
- `nav_encore_bon`: EN "Still good?" / FR "Encore bon ?"
- `encore_title`: EN "Still good?" / FR "Encore bon ?"
- `encore_intro`: EN "How long does a food keep? Look it up — even if it's not in your inventory." / FR "Combien de temps un aliment se conserve-t-il ? Cherchez-le, même s'il n'est pas dans votre inventaire."
- `encore_basis_purchase`: EN "From purchase" / FR "À l'achat"
- `encore_basis_opened`: EN "Once opened" / FR "Après ouverture"
- `encore_basis_unspecified`: EN "Storage" / FR "Conservation"
- `encore_not_recommended`: EN "Not recommended at this location" / FR "Déconseillé à cet emplacement"
- `encore_keeps`: `(range: string) => string` — EN `` `Keeps ${range}` `` / FR `` `Se conserve ${range}` ``
- `dur_hours|dur_days|dur_weeks|dur_months|dur_years`: EN hours/days/weeks/months/years; FR heures/jours/semaines/mois/ans
- Reused: `add_search_label`, `add_search_placeholder`, `add_search_submit`, `add_no_results`, `add_location_pantry|fridge|freezer`, `est_disclaimer`.

## Files touched
- `src/lib/server/catalogue.ts` (+ `catalogue.test.ts`) — `shelfLifeGuide`
- `src/routes/(app)/encore-bon/+page.server.ts` (new) + `+page.svelte` (new)
- `src/lib/components/ui/BottomNav.svelte`
- `src/lib/i18n/messages/fr.ts` + `en.ts` (+ `Messages`)
- `tests/e2e/encore-bon.spec.ts` (new)

## Testing (TDD)
- `shelfLifeGuide`: returns entries for a seeded food with pantry+fridge rows
  (purchase & opened), localized tips, correct sort order; empty for a food with no
  rows / unknown food.
- e2e: navigate to `/encore-bon` (tab visible), search a known catalogue food
  (e.g. a seeded one), click the result, assert the guide shows a localized
  "keeps …" line and the disclaimer; an empty search shows the no-results message.
