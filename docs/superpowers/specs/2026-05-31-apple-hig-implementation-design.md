# Apple HIG implementation for Garde-Manger — Design

**Date:** 2026-05-31
**Status:** Approved-pending-review
**Author:** Simon Brunou (with Claude)

## Goal

Adopt Apple's Human Interface Guidelines (HIG) patterns, interaction idioms, and
foundations across the Garde-Manger PWA, layered on top of the existing
"Warm & Friendly" cream/produce design system. We keep the brand palette and map
HIG's *semantic roles* onto it, rather than adopting stock-iOS neutral colors.

### Scoping decisions (confirmed with user)

1. **Fidelity: Full HIG structure.** Re-architect navigation into iOS large-title
   bars that collapse on scroll, present Add/Edit as sheets, convert primary
   surfaces to inset grouped lists with swipe actions, and adopt iOS controls
   (switch, segmented, action sheet). Keep the brand palette.
2. **Brand: Keep warm palette, HIG semantics.** Apply HIG color *roles* (grouped
   backgrounds, separators, label hierarchy, fills, single tint color) mapped onto
   the existing cream/produce green tokens. The app still looks like Garde-Manger.
3. **Tab bar: Flatten to HIG standard.** Replace the raised green center "+" FAB
   with five equal flat tabs (icon + caption label, translucent material, brand
   active tint). "Add" becomes a normal tab that opens the Add sheet.

## HIG themes → how they apply here

- **Clarity** — legible type at every size via the iOS Dynamic Type ramp (rem-based
  so user font scaling is honored), precise iconography, edge-to-edge content,
  hairline separators.
- **Deference** — content first; translucent material chrome; minimal decoration;
  let the produce content and its green/amber/red status colors lead.
- **Depth** — layered navigation (push/pop with horizontal transitions), sheets
  that rise over dimmed content, distinct elevation through materials and shadow.

## 1. Foundations (`src/app.css`)

### Typography — iOS text styles (Dynamic Type)

Define CSS custom properties for the standard iOS type ramp, in `rem` (so they
scale with the user/base font size), with HIG weights and line-heights:

| Token                | Size/line (pt) | Weight |
| -------------------- | -------------- | ------ |
| `--text-large-title` | 34 / 41        | 700    |
| `--text-title-1`     | 28 / 34        | 700    |
| `--text-title-2`     | 22 / 28        | 700    |
| `--text-title-3`     | 20 / 25        | 600    |
| `--text-headline`    | 17 / 22        | 600    |
| `--text-body`        | 17 / 22        | 400    |
| `--text-callout`     | 16 / 21        | 400    |
| `--text-subhead`     | 15 / 20        | 400    |
| `--text-footnote`    | 13 / 18        | 400    |
| `--text-caption-1`   | 12 / 16        | 400    |
| `--text-caption-2`   | 11 / 13        | 400    |

- Base body font-size moves to **17px** (iOS body).
- Keep `ui-rounded`/`SF Pro Rounded` for brand warmth (a real system face; HIG-legal).
- Provide utility classes: `.t-large-title`, `.t-title-2`, `.t-headline`,
  `.t-body`, `.t-subhead`, `.t-footnote`, `.t-caption`, etc.
- Map base elements: `h1` → large-title (collapsing in nav), `h2` → title-2/3,
  `h3` → headline.

### Color semantics — HIG roles on warm tokens

Introduce a semantic layer that **maps to existing palette values** (no new hues):

- **Backgrounds:** `--bg` = systemGroupedBackground (existing cream `--bg`);
  `--surface` = secondarySystemGroupedBackground (card cream). Add fill levels
  `--fill-quaternary/tertiary/secondary/primary` from `--surface-2` tints for
  control backgrounds (segmented track, switch off-state, tinted buttons).
- **Labels:** `--text` = label; `--text-muted` = secondaryLabel; add
  `--text-tertiary` and `--text-quaternary`. Keep WCAG AA on every pairing.
- **Separators:** add `--separator` (hairline; 1px, theme-aware color) used for
  list rows and bar bottoms, with text-aligned inset on list rows.
- **Tint:** `--tint` = brand green (`--green-strong`) — the single app accent for
  interactive text, controls, and selection. Replaces ad-hoc link/accent usage.

### Materials

Standardize the translucent bar treatment (already present on AppHeader) as
reusable tokens: `--material-bar` (thick blur + saturation for nav/tab bars) and
`--material-overlay` (for scrims/sheets), each with a **solid fallback** for
browsers without `backdrop-filter`.

### Metrics & motion

- `--layout-margin: 16px`, `--row-min-h: 44px`, `--nav-bar-h`, `--tab-bar-h`,
  `--radius-grouped: 10px` (iOS grouped-list corner).
- Motion: `--ease-ios: cubic-bezier(0.32, 0.72, 0, 1)` (sheet/nav curve),
  `--dur-fast: 0.2s`, `--dur: 0.35s`, `--dur-sheet: 0.45s`. All new transitions
  gated by the existing `prefers-reduced-motion` rule.

## 2. Navigation chrome

### `NavigationBar.svelte` (new; augments/replaces AppHeader)

- **Large title** rendered in the scroll content; collapses into a centered,
  translucent, hairline-bordered inline title as the user scrolls. Implemented
  with a scroll sentinel placed under the large title + IntersectionObserver,
  toggling a `.collapsed` state on the fixed bar.
- **Leading slot:** back button (chevron + previous title) on pushed views.
- **Trailing slot:** contextual actions (settings gear on home; Edit/Done on
  detail; etc.).
- Translucent `--material-bar`; bottom hairline appears only when collapsed.
- Respects `env(safe-area-inset-top)`.
- The household switcher (currently in AppHeader) becomes the **home large-title
  menu** (name + chevron → popover/menu). Settings gear → trailing nav button.

### `TabBar.svelte` (rewrites `BottomNav.svelte`)

- Five flat equal tabs: **Home (Garde-manger) · Cuisiner · Add · Bilan ·
  Réglages**.
- SF-style icon (~24–28px) above a caption-2 label; active = `--tint`,
  inactive = secondaryLabel.
- Translucent `--material-bar`; hairline top separator; height `49pt` +
  `env(safe-area-inset-bottom)`.
- **Raised FAB removed.** "Add" is a normal tab that opens the Add sheet.
- Retain `aria-current="page"`.

### Push/pop transitions

Pushed routes (`item/[id]`, `households/[id]`, `households/[id]/invite`,
`scan/[barcode]`, account sub-flows) get an iOS-style horizontal push/pop: new
view slides in from the right, previous view parallaxes left; reverse on back.
Implemented via SvelteKit view transitions or a scoped Svelte transition, gated
on reduced-motion. Back button is the primary affordance (edge-swipe-back is a
stretch goal).

## 3. Sheets

### `Sheet.svelte` (new)

Modal sheet rising from the bottom over dimmed content:

- Grabber handle, rounded top corners, `--surface` background, spring rise/dismiss
  via `--ease-ios`; backdrop scrim fades.
- Dismiss: grabber drag-down (pointer events), backdrop tap, `Escape`, and an
  in-sheet nav row (leading "Annuler" / trailing "Ajouter"/"OK").
- Accessibility: `role="dialog"`, `aria-modal`, focus trap, focus restored on
  close, body scroll lock.
- Safe-area aware; full-height detent (medium detent is a stretch goal).

### `ActionSheet.svelte` (new)

Bottom-rising list of actions (destructive in red, a separated Cancel) for item
and destructive actions (e.g., Supprimer with confirmation).

### Usage

- **Add item**, **Edit item**, and settings pickers (theme, etc.) → `Sheet`.
- **Item destructive actions** → `ActionSheet`.
- **Scan** stays a full-screen camera modal with a Cancel nav button + HIG framing.

## 4. Lists & controls

### `List.svelte` + `ListRow.svelte` (new — inset grouped list)

- Rounded container (`--surface`, `--radius-grouped`) with internal hairline
  separators that inset to align with the text (past any leading thumb/icon).
- Row: leading (icon/thumb), title + subtitle (subhead/footnote), trailing
  (value text in secondaryLabel, `DayBadge`, and/or disclosure chevron). Min 44px.
- Optional section header (footnote, uppercase, secondaryLabel) and footer text.

### `SegmentedControl.svelte` (new)

For the home location filter (Tout / Frigo / Placard / Congélo) and the
expiring-only toggle where a single-select model fits. Keep `Chip` where
multi-select is needed.

### `Toggle.svelte` (new — iOS switch)

Boolean settings (push notifications, theme auto, expiring-only) replacing
checkboxes; `role="switch"`, `aria-checked`, 44px target.

### `SwipeActions.svelte` (new)

Pantry rows gain iOS swipe-to-reveal **trailing** actions ("Mangé" / "Jeté" /
"Supprimer"). Pointer/touch drag reveals colored buttons; full-swipe triggers the
primary action. The existing inline buttons remain as the **keyboard/desktop/no-
swipe fallback** and a context menu. Reduced-motion safe; keyboard accessible.

### `Button.svelte` (refactor)

Align variants to HIG hierarchy: **filled** (primary), **tinted** (green text on
green tint), **gray** (secondary), **plain** (text-only tint). 44px min (already).

## 5. Per-surface application

- **Home (`garde-manger`):** large-title nav (household name + switcher),
  `SegmentedControl` location filter, inset grouped sections per band
  (urgent/soon/ok), swipe actions, refined empty state. Search bar = stretch.
- **Item detail (`item/[id]`):** pushed view with back; large title = item name;
  grouped list of attributes (location, dates, quantity, category) with edit;
  destructive "Supprimer" via `ActionSheet`.
- **Add / Scan:** Add as a `Sheet` with grouped form rows; Scan stays full-screen
  camera modal with Cancel.
- **Bilan:** large title; stat tiles as grouped cards; charts keep palette.
- **Cuisiner:** large title; idea cards as grouped list/cards.
- **Account & Households:** inset grouped settings lists; `Toggle` switches;
  push/theme controls; destructive actions via `ActionSheet`.
- **Auth (login/signup) & landing:** lighter pass — apply type scale, buttons,
  materials; no full nav restructure (these sit outside the `(app)` shell).

## 6. Accessibility & quality

- Maintain **WCAG AA**; re-verify tint-on-surface and on-accent contrasts.
- **Dynamic Type:** layouts reflow when base font scales (rem-based).
- Semantics: `role` for dialog/list/switch/tab; `aria-current`, `aria-expanded`,
  `aria-modal`, labels on all new controls.
- **44pt targets** audited on every new control.
- **Reduced-motion:** all new transitions gated.
- Keep light/dark via `light-dark()`.
- **Tests:** keep all existing Vitest tests green; add unit tests for new logic
  (large-title collapse threshold, segmented selection, swipe gesture state,
  sheet open/close + focus behavior where testable). **Live-verify** with
  Playwright / Chrome DevTools in light + dark on a mobile viewport.

## Architecture / componentization

New components in `src/lib/components/ui/`:

- `NavigationBar.svelte` (+ a layout-level scroll context for large-title collapse)
- `TabBar.svelte` (replaces `BottomNav.svelte`)
- `Sheet.svelte`, `ActionSheet.svelte`
- `List.svelte`, `ListRow.svelte` (+ optional `ListSection.svelte`)
- `Toggle.svelte`, `SegmentedControl.svelte`, `SwipeActions.svelte`

Refactored: `Button.svelte`, `Card.svelte`, `ItemRow.svelte`, `EmptyState.svelte`,
`AppHeader.svelte`, and `src/app.css` (tokens + base). The `(app)/+layout.svelte`
wires `NavigationBar` + `TabBar` and provides the scroll context.

Each component: single, clear purpose; typed props; documented usage; testable
in isolation.

## Build sequence (milestones)

1. **M1 Foundations** — tokens (type ramp, semantic colors, materials, metrics,
   motion) in `app.css`; `Button`/`Card` HIG pass. No structural change. Tests green.
2. **M2 Chrome** — `NavigationBar` (large-title collapse) + `TabBar` (flatten) +
   push transitions; wire into `(app)` layout.
3. **M3 Lists & controls** — `List`/`ListRow`, `SegmentedControl`, `Toggle`;
   convert Home to grouped list + segmented filter.
4. **M4 Sheets & actions** — `Sheet`, `ActionSheet`; Add/Edit as sheets; item
   destructive actions.
5. **M5 Swipe actions** — pantry row swipe-to-reveal with fallbacks.
6. **M6 Per-surface polish** — item detail, bilan, cuisiner, account, households.
7. **M7 A11y + verification** — contrast/Dynamic Type/semantics audit, live
   Playwright verification (light+dark, mobile), tests, docs, graphify update.

Each milestone is independently shippable and ends test-green.

## Out of scope / YAGNI

- Stock-iOS neutral color theme (explicitly rejected — brand palette kept).
- Native haptics beyond the Web Vibration API (best-effort only, where supported).
- Edge-swipe-back gesture and sheet medium-detent are stretch goals, not required.
- Re-architecting auth/landing navigation.
