# Garde-Manger — UI/UX Redesign Design Spec

**Date:** 2026-05-29
**Status:** Approved (brainstorm) — pending spec review
**Scope:** Full experience rethink: a "Warm & Friendly" design system (light + dark), redesign of every existing screen, plus four new surfaces (FAB add-sheet, item detail, anti-waste stats, cook-what's-expiring).
**Builds on:** the existing app (M0–M5, feature-complete, 211 tests green). SvelteKit + Bun + SQLite (Drizzle), mobile-first PWA, bilingual FR/EN, passkey auth, Open Food Facts scanning, web-push reminders, household sharing.

---

## 1. Goals & non-goals

**Goals**
- Fix the genuinely broken core screen (item names truncating to ~2 characters; broken/inconsistent thumbnails).
- Establish a real, themeable design system with a **light + warm-dark** theme.
- Replace the overcrowded header with a coherent navigation model.
- Make the add flow direct (no scroll-trap).
- Add four new surfaces that deepen the anti-waste mission.
- Keep the warm, friendly identity the owner already likes — evolve, don't replace.

**Non-goals (YAGNI for this redesign)**
- No external recipe API; no third-party analytics; no new auth methods.
- No €/CO₂ estimate in v1 of Bilan (counts + streak first; estimate is a later nice-to-have).
- No redesign of server/business logic except where a surface needs new reads/writes (item edit, stats query, cook dataset, theme persistence).
- No change to the shelf-life catalogue data (still pending human food-safety review — unchanged).

**Principles**
- Mobile-first; progressive enhancement (every flow works without JS, matching the existing no-JS scan fallback).
- Frugal & self-hosted: no new runtime dependencies or network calls; offline-friendly (PWA).
- Accessibility: WCAG-AA contrast in both themes, visible focus, reduced-motion respected.
- Bilingual parity: one locale throughout a session (fix today's FR/EN leaks).
- Keep the 211 tests green; add tests with each milestone.

---

## 2. Current-state audit (what we're fixing)

| Severity | Issue | Screen |
|---|---|---|
| Critical | Item names truncate to ~2 chars ("B…", "Co…"); urgent item shows no name. Inline text buttons (*J'ai mangé* / *Jeté*) consume the row. | Garde (home) |
| Critical | Broken-image icon for photoless items; green ✅ box as inconsistent fallback. | Garde |
| High | Overcrowded header: logo wraps to two lines; nav cramped; household switcher + "Changer" is a clunky second row; logout is a big outlined box. | All (app) |
| High | Add flow scroll-trap: selecting a food appends the form below the entire catalogue list. | Add |
| High | Bilingual leak: login mixes EN labels with a FR passkey button. | Login |
| Medium | Bare empty states (plain text links). | Home / Foyers |
| Medium | Emoji used as iconography; inconsistent rendering. | Add / nav |
| Medium | Noisy card rhythm: location + badge + DDM + two buttons repeated per row. | Garde |

---

## 3. Visual direction — "Warm & Friendly" (A × C)

Cream paper + soft rounded cards (cozy), blended with playful day-circles, friendly action buttons, and a center **+**. Deliberate **urgency hierarchy**: urgent items *shout* (filled red day-badge + inline *Mangé/Jeté*), safe items stay *calm* (outlined badge, tap-to-act). Real food/category icons (and OFF photos) replace emoji and broken thumbnails. Warm-dark theme keeps the same soul.

---

## 4. Design tokens

Implemented as CSS custom properties in `src/app.css`. Light is the current theme (kept). Dark is a **warm espresso** palette (not flat black), with produce colors brightened to hold AA contrast on dark surfaces.

### 4.1 Light (current — kept)
```
--bg:#faf6ee  --surface:#fffdf9  --surface-2:#f3ece0
--border:#e9e0d1  --border-strong:#d9cdb8
--text:#322c22  --text-muted:#8a7e6b
--green:#2f9e44 --green-dark:#2b8a3e --green-tint:#e9f6ec
--amber:#e08a1e --amber-dark:#c2740f --amber-tint:#fdf1de
--red:#d6492f   --red-dark:#b93c25   --red-tint:#fbeae6
--shadow-sm:0 1px 2px rgba(80,60,30,.06)
--shadow:0 1px 2px rgba(80,60,30,.06),0 6px 16px rgba(80,60,30,.07)
```

### 4.2 Dark (new — warm espresso)
```
--bg:#1d1811  --surface:#2a241b  --surface-2:#352e21
--border:#3a3326  --border-strong:#4a412f
--text:#f1eadd  --text-muted:#a89e8b
--green:#43b15a --green-dark:#54b366 --green-tint:rgba(84,179,102,.15)
--amber:#e8b257 --amber-dark:#f0c070 --amber-tint:rgba(224,162,58,.16)
--red:#ef6a4f   --red-dark:#ff8064   --red-tint:rgba(239,106,79,.16)
--shadow-sm:0 1px 2px rgba(0,0,0,.30)
--shadow:0 1px 2px rgba(0,0,0,.30),0 6px 16px rgba(0,0,0,.28)
```
Plus `color-scheme: dark` and `--on-accent` (text on filled green/red) resolved per theme.

### 4.3 Shape, type & space (shared)
- Radii: `--radius:16px` (cards), `--radius-sm:10px` (inputs), `--radius-lg:22px` (sheets), `--radius-pill:999px`.
- Type scale: 12 / 13.5 / 15 / 17 / 20 / 23 px (display 28+ for stats). Weights 600/700/800. Rounded font stack (unchanged).
- Space scale: 4 / 8 / 12 / 16 / 20 / 24 / 32. Container 640px. Safe-area padding for bottom nav (`env(safe-area-inset-bottom)`).

### 4.4 Theme mechanism
- `:root` = light tokens. `@media (prefers-color-scheme: dark)` applies dark tokens **unless** `[data-theme="light"]` is set; `[data-theme="dark"]` forces dark regardless of OS.
- `data-theme` is written on `<html>` **server-side** from the `gm_theme` cookie (`auto|light|dark`, default `auto`): set to `light`/`dark` only when explicitly chosen; for `auto` it is **omitted** so the `prefers-color-scheme` media query governs. No FOUC and no JS required (the media query applies on first paint).
- Toggle in Compte (Light / Dark / Auto) sets the cookie via a form action; a small inline script also flips it instantly client-side. `<meta name="theme-color">` updated to match the active surface.

---

## 5. Iconography

A single inline-SVG icon set (currentColor, 24px, 2px stroke) — no icon font, no dependency.
- **UI glyphs:** home, plus, scan/barcode, user, households, stats, cook/utensils, gear, check, trash, kebab, chevron, search, bell, key, edit, close.
- **12 category icons** (1:1 with `foods.category`): Fruits, Légumes, Herbes, Charcuterie, Poissons/Fruits de mer, Produits laitiers, Viandes, Volaille, Œufs, Pain/Boulangerie, Placard/Épicerie, Restes/Plats cuisinés.
- **Thumbnail resolution order:** OFF product photo → category icon (tinted tile) → neutral fallback tile. The broken-image state is eliminated.

---

## 6. Components

Svelte components under `src/lib/components/ui/`. Each is presentational, theme-token-driven, and independently testable.

| Component | Responsibility | Key props |
|---|---|---|
| `Button` | primary / secondary / ghost / danger; icon support | `variant`, `href?`, `icon?` |
| `Card` | surface container | `tint?` |
| `Chip` | filter pill (location filters) | `active`, `href` |
| `DayBadge` | glanceable urgency: filled (urgent) / amber outline (soon) / green outline (ok/∞) | `band`, `label` |
| `Thumb` | photo → category icon → fallback | `imagePath?`, `category` |
| `ItemRow` | name-first row: thumb + name + meta + DayBadge; urgent variant shows inline actions; others a kebab | `item`, `urgent` |
| `BottomNav` | 4 tabs + center FAB; active state; safe-area aware | `active` |
| `Sheet` | bottom sheet (add menu, confirmations); focus-trapped; `<dialog>`-based with no-JS `<details>` fallback | `open`, `title` |
| `EmptyState` | icon + headline + body + primary CTA | `icon`, `title`, `cta` |
| `StatTile` | big number + label for Bilan | `value`, `label`, `tone` |
| `AppHeader` | title + household quick-switcher chip + gear; replaces the crowded header | `householdName` |
| `ThemeToggle` | Light / Dark / Auto control | `value` |

---

## 7. Navigation & IA

**Bottom tab bar + center FAB** (replaces the top nav clutter):
`Garde` (inventory) · `Cuisiner` · **+** · `Bilan` · `Compte`.

- **+** opens the **add-sheet**: Scan · Fruit/frais · Saisie libre · récents.
- **Foyers** moves under **Compte**, with a household quick-switcher chip in `AppHeader`. (Switching is setup, not daily.)
- Header per screen: screen title + household chip + gear (→ Compte). No logout button in the chrome (logout lives in Compte).
- Auth screens (login/signup/join) keep a minimal centered layout, no bottom nav.

---

## 8. Screen designs

**Garde (home).** `AppHeader` + location `Chip` row + urgency sections (`À consommer vite` / `Bientôt` / `Encore bon`) of `ItemRow`s. Urgent rows show inline *J'ai mangé / Jeté*; others tap → item detail, kebab for quick actions. Empty state via `EmptyState`. Existing band logic (`bandFor`) and load query are reused unchanged; only presentation changes.

**Item detail (new)** — `(app)/item/[id]`. Large thumb + name + DayBadge; editable date (DLC/DDM), quantity, location, notes; "history" (added date, status changes via `closedAt`); actions: *J'ai mangé*, *Jeté*, *Supprimer*. Server load + form actions; reuses `getItem`/`setStatus`, adds `updateItem`.

**Add-sheet + flows (M8).** FAB opens `Sheet`. *Fruit/frais* → in-place search + confirm (catalogue list collapses once an item is chosen — fixes scroll-trap). *Scan* → existing camera island + no-JS manual entry, restyled. *Saisie libre* → free entry form. Confirm form appears in context, not below the full list.

**Bilan (new, M9).** `StatTile`s from `consumed`/`discarded` + `closedAt` history: eaten vs wasted this month, total "sauvés", current streak (days since last *Jeté*), and a simple month bar. No €/CO₂ in v1.

**Cuisiner (new, M10).** Lists the household's urgent/soon items, each with 1–3 curated, bilingual "use-it-up" ideas keyed by food key → category fallback. Static dataset, offline. Empty state when nothing's expiring ("Rien ne presse 🎉").

**Compte.** Restyled cards: Profil (nom, langue), **Thème (Light/Dark/Auto)**, Notifications, Passkeys, **Foyers** (list + switch + create + invite/members links), Déconnexion.

**Foyers / invitations / membres.** Restyled lists & forms; reachable from Compte and the header chip.

**Auth (login / signup / join).** Centered card, consistent locale (fix FR/EN leak), passkey + password, themed.

**Empty / loading / error.** Shared `EmptyState`; skeleton rows for lists; themed error styling (extends current `.error`).

---

## 9. New data & logic

- **`stats.ts`** (server): aggregate `inventory_items` where `status IN ('consumed','discarded')` by `closedAt` (month range, household-scoped). Returns `{ eaten, wasted, savedThisMonth, streakDays }`. Pure/tested.
- **`cook/ideas.data.ts`** + **`cook.ts`**: static `Record<foodKey|category, Idea[]>` with `{ titleFr, titleEn }`; `ideasForItems(items)` returns ideas for urgent/soon items. No DB, no network.
- **`updateItem(db, {id, householdId, ...fields})`** in `inventory.ts`: edit date/quantity/location/notes, household-scoped; tested.
- **Theme persistence:** `gm_theme` cookie (`auto|light|dark`); read in `hooks.server.ts`/root layout to set `<html data-theme>`; set via a Compte form action. (Optional later: persist to user profile.)

No schema migration is required for stats (history already retained) or cook. Item notes/quantity/location columns already exist. Theme uses a cookie (no schema change).

---

## 10. Cross-cutting

- **i18n:** audit all routes for hardcoded/leaked strings; every new surface gets FR/EN keys. One active locale per session.
- **A11y:** AA contrast both themes; `:focus-visible` on all interactive elements; bottom nav + sheet keyboard operable; `aria-current` on active tab; reduced-motion media query disables non-essential motion.
- **Motion:** subtle FAB press, sheet slide-up, and a satisfying clear animation when an item is consumed/discarded — all gated by `prefers-reduced-motion`.
- **PWA:** `theme-color` per theme; bottom nav respects safe-area insets; offline shell unaffected.
- **Progressive enhancement:** sheet falls back to `<details>`/full page; actions are real form posts; swipe/instant-toggle are enhancements.

---

## 11. Milestones (build order)

Each milestone is independently shippable and keeps tests green.

- **M6 · Foundation.** Tokens (light + dark) + theme mechanism + `ThemeToggle`; icon set; type/space scale; UI component library; `BottomNav`/`AppHeader` shell adopted across routes. No feature change. *Done when:* every screen renders on the new system in both themes, nav replaces the old header, tests green.
- **M7 · Garde + Item detail.** Home redesign (name-first rows, DayBadge, calm/shout hierarchy, real thumbnails, empty/skeleton states); new item-detail screen; quick actions. *Done when:* names never truncate; no broken images; detail edit/delete works; component tests added.
- **M8 · Ajouter / Scan.** FAB add-sheet; in-place confirm (scroll-trap gone); scan + confirm restyle with no-JS fallback intact.
- **M9 · Bilan.** `stats.ts` + Bilan screen; tested aggregation.
- **M10 · Cuisiner.** Cook dataset + screen; tested `ideasForItems`.

Cross-cutting (i18n parity, a11y, motion) is folded into each milestone, not deferred.

---

## 12. Testing

- Unit: `stats.ts`, `cook.ts`, `updateItem` (Vitest, in-memory SQLite as existing).
- Component: `DayBadge`, `ItemRow`, `Thumb` (resolution order), `BottomNav`, `Sheet` (incl. no-JS fallback).
- i18n: extend existing i18n tests to cover new keys (FR/EN parity).
- Manual/Playwright smoke at a 390px viewport in both themes for each milestone.
- Regression: the existing 211 tests must stay green throughout.

---

## 13. Assumptions & open questions

- **Assumed (owner approved as defaults):** local curated Cuisiner; Bilan counts+streak first (€/CO₂ later); theme persisted via cookie; Foyers nested under Compte.
- **Open (decide at implementation):** exact "soon" band label (`Bientôt` vs `À consommer bientôt`); streak definition edge cases (no activity yet → 0); whether to persist theme to profile in addition to cookie.
- **Constraint:** shelf-life catalogue remains draft/unreviewed — no health-critical claims added by any new surface.
```

---

This spec is the contract for the implementation plan; milestones map to the existing M-series convention.
