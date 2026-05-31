# Apple HIG — M1 Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the HIG design foundations — iOS Dynamic Type type ramp, HIG semantic color roles mapped onto the warm brand palette, material/metric/motion tokens, and a HIG button hierarchy — in `src/app.css`, with no structural/navigation change and all tests green.

**Architecture:** Garde-Manger styles live almost entirely in `src/app.css` as CSS custom properties + global classes; thin Svelte wrappers (`Button.svelte`, `Card.svelte`) consume those classes. M1 therefore edits `app.css` and leaves the wrappers mostly untouched (Button gains two optional variants). A vitest regression test parses `app.css` to assert the new tokens exist, mirroring the project's existing `theme.test.ts` style.

**Tech Stack:** SvelteKit 2 + Svelte 5 runes, CSS `light-dark()` theming, vitest + jsdom test runner (run via `bunx vitest run`), Bun toolchain.

> **Spec:** `docs/superpowers/specs/2026-05-31-apple-hig-implementation-design.md` (§1 Foundations, §4 Button).
> **Environment note:** This session showed context-protection truncation on large/parallel tool outputs. Keep tool outputs small and sequential; verify file contents with targeted reads, not bulk dumps.

---

## File Structure

- **Modify** `src/app.css` — add three token blocks (typography, semantic color, materials/metrics/motion), type utility classes, and refactor `.btn-*` to the HIG hierarchy. This is the single source of design truth.
- **Modify** `src/lib/components/ui/Button.svelte` — extend the `Variant` union with `tinted` and `plain` (keep `primary`/`secondary`/`ghost`/`danger` as aliases so no caller breaks).
- **Create** `src/lib/design-tokens.test.ts` — vitest regression test asserting required HIG tokens and utility classes exist in `app.css`.
- `src/lib/components/ui/Card.svelte` — no change in M1 (grouped-list surface arrives with `List` in M3).

All `--green*/--amber*/--red*/--surface*/--text*/--bg/--border*` tokens already in `app.css` are reused; M1 adds **new** tokens that reference them — no hue changes.

---

## Task 1: HIG token regression test (TDD anchor)

**Files:**
- Create: `src/lib/design-tokens.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const css = readFileSync(fileURLToPath(new URL('../app.css', import.meta.url)), 'utf8');

describe('HIG design tokens', () => {
	const typography = [
		'--text-large-title',
		'--text-title-1',
		'--text-title-2',
		'--text-title-3',
		'--text-headline',
		'--text-body',
		'--text-callout',
		'--text-subhead',
		'--text-footnote',
		'--text-caption-1',
		'--text-caption-2'
	];
	const semantic = [
		'--text-tertiary',
		'--separator',
		'--tint',
		'--fill-secondary',
		'--fill-tertiary'
	];
	const systemic = [
		'--material-bar',
		'--material-overlay',
		'--layout-margin',
		'--row-min-h',
		'--radius-grouped',
		'--ease-ios',
		'--dur-fast',
		'--dur',
		'--dur-sheet'
	];

	it.each([...typography, ...semantic, ...systemic])('defines %s', (token) => {
		expect(css).toContain(`${token}:`);
	});

	const utilities = [
		'.t-large-title',
		'.t-title-2',
		'.t-headline',
		'.t-body',
		'.t-subhead',
		'.t-footnote',
		'.t-caption'
	];
	it.each(utilities)('defines utility class %s', (cls) => {
		expect(css).toContain(cls);
	});

	it('keeps the HIG button hierarchy', () => {
		for (const v of ['.btn-filled', '.btn-tinted', '.btn-gray', '.btn-plain']) {
			expect(css).toContain(v);
		}
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bunx vitest run src/lib/design-tokens.test.ts`
Expected: FAIL — assertions like `expect(css).toContain('--text-large-title:')` fail because the tokens do not exist yet.

- [ ] **Step 3: Commit the failing test**

```bash
git add src/lib/design-tokens.test.ts
git commit -m "test(hig): regression test for HIG foundation tokens"
```

---

## Task 2: Typography ramp (iOS Dynamic Type) tokens + utilities

**Files:**
- Modify: `src/app.css` (inside `:root { … }`, after the `--font` declaration; utility classes after the base `h1/h2/h3` block)

- [ ] **Step 1: Add the type-ramp tokens inside `:root`**

Add immediately after the `--font: …;` declaration (before `color-scheme`):

```css
	/* ── iOS Dynamic Type ramp ──────────────────────────────────────────────
	   rem-based so the OS / browser base font size scales every style. Values
	   are the iOS point sizes ÷ 16 (1rem = 16px). Weights/line-heights per HIG. */
	--text-large-title: 2.125rem; /* 34 */
	--text-title-1: 1.75rem; /* 28 */
	--text-title-2: 1.375rem; /* 22 */
	--text-title-3: 1.25rem; /* 20 */
	--text-headline: 1.0625rem; /* 17 semibold */
	--text-body: 1.0625rem; /* 17 */
	--text-callout: 1rem; /* 16 */
	--text-subhead: 0.9375rem; /* 15 */
	--text-footnote: 0.8125rem; /* 13 */
	--text-caption-1: 0.75rem; /* 12 */
	--text-caption-2: 0.6875rem; /* 11 */
	--lh-tight: 1.15;
	--lh-snug: 1.25;
	--lh-normal: 1.4;
```

- [ ] **Step 2: Bump base body size to iOS body (17px) and add utility classes**

Change the `body { font-size: 16px; }` rule to `font-size: 17px;`. Then add this block immediately after the `h3 { … }` rule:

```css
/* ── HIG type utility classes ──────────────────────────────────────────── */
.t-large-title {
	font-size: var(--text-large-title);
	font-weight: 800;
	line-height: var(--lh-tight);
	letter-spacing: -0.02em;
}
.t-title-1 {
	font-size: var(--text-title-1);
	font-weight: 700;
	line-height: var(--lh-tight);
	letter-spacing: -0.015em;
}
.t-title-2 {
	font-size: var(--text-title-2);
	font-weight: 700;
	line-height: var(--lh-snug);
}
.t-title-3 {
	font-size: var(--text-title-3);
	font-weight: 600;
	line-height: var(--lh-snug);
}
.t-headline {
	font-size: var(--text-headline);
	font-weight: 600;
	line-height: var(--lh-snug);
}
.t-body {
	font-size: var(--text-body);
	font-weight: 400;
	line-height: var(--lh-normal);
}
.t-callout {
	font-size: var(--text-callout);
	font-weight: 400;
	line-height: var(--lh-normal);
}
.t-subhead {
	font-size: var(--text-subhead);
	font-weight: 400;
	line-height: var(--lh-normal);
}
.t-footnote {
	font-size: var(--text-footnote);
	font-weight: 400;
	line-height: var(--lh-normal);
	color: var(--text-muted);
}
.t-caption {
	font-size: var(--text-caption-1);
	font-weight: 500;
	line-height: var(--lh-normal);
	color: var(--text-muted);
}
```

- [ ] **Step 3: Re-run the token test**

Run: `bunx vitest run src/lib/design-tokens.test.ts`
Expected: typography + utility-class assertions now PASS; semantic/systemic/button assertions still FAIL.

- [ ] **Step 4: Commit**

```bash
git add src/app.css
git commit -m "feat(hig): iOS Dynamic Type ramp tokens + type utility classes"
```

---

## Task 3: HIG semantic color roles (mapped onto warm tokens)

**Files:**
- Modify: `src/app.css` (inside `:root`, in the Text and Accents areas)

- [ ] **Step 1: Add label/fill/separator/tint tokens inside `:root`**

Add after the existing `--text-muted: …;` line:

```css
	/* HIG label hierarchy (label = --text, secondaryLabel = --text-muted). */
	--text-tertiary: light-dark(#9a8f7c, #7e745f);
	--text-quaternary: light-dark(#b6ab96, #5f5742);

	/* HIG fills — control backgrounds layered on surfaces. */
	--fill-primary: light-dark(rgba(50, 44, 34, 0.1), rgba(241, 234, 221, 0.12));
	--fill-secondary: light-dark(rgba(50, 44, 34, 0.07), rgba(241, 234, 221, 0.09));
	--fill-tertiary: light-dark(rgba(50, 44, 34, 0.05), rgba(241, 234, 221, 0.06));
	--fill-quaternary: light-dark(rgba(50, 44, 34, 0.03), rgba(241, 234, 221, 0.04));

	/* Hairline separator (opaque, theme-aware) for list rows and bar edges. */
	--separator: var(--border);

	/* Single app tint for interactive text/controls/selection. */
	--tint: var(--green-strong);
```

- [ ] **Step 2: Point links at the tint**

Change the `a { color: var(--green-dark); }` rule to `color: var(--tint);` (keeps green, now centralized).

- [ ] **Step 3: Re-run the token test**

Run: `bunx vitest run src/lib/design-tokens.test.ts`
Expected: semantic assertions now PASS; systemic + button assertions still FAIL.

- [ ] **Step 4: Commit**

```bash
git add src/app.css
git commit -m "feat(hig): semantic color roles (labels, fills, separator, tint)"
```

---

## Task 4: Material, metric, and motion tokens

**Files:**
- Modify: `src/app.css` (inside `:root`, in the Shape & depth area)

- [ ] **Step 1: Add the systemic tokens inside `:root`**

Add after the existing `--bottom-nav-h: 4.25rem;` line:

```css
	/* Materials — translucent bar treatment with a solid fallback. */
	--material-bar: color-mix(in srgb, var(--bg) 82%, transparent);
	--material-overlay: light-dark(rgba(30, 24, 16, 0.32), rgba(0, 0, 0, 0.5));

	/* Metrics (iOS standards). */
	--layout-margin: 16px;
	--row-min-h: 44px;
	--nav-bar-h: 44px;
	--tab-bar-h: 49px;
	--radius-grouped: 10px;

	/* Motion — iOS sheet/nav spring curve + durations. */
	--ease-ios: cubic-bezier(0.32, 0.72, 0, 1);
	--dur-fast: 0.2s;
	--dur: 0.35s;
	--dur-sheet: 0.45s;
```

- [ ] **Step 2: Add a solid fallback for `--material-bar`**

Add this block after the `@media (prefers-reduced-motion: reduce)` block at the end of `app.css`:

```css
/* Material fallback: browsers without backdrop-filter get an opaque bar. */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
	:root {
		--material-bar: var(--bg);
	}
}
```

- [ ] **Step 3: Re-run the token test**

Run: `bunx vitest run src/lib/design-tokens.test.ts`
Expected: systemic assertions now PASS; only the button-hierarchy assertion still FAILs.

- [ ] **Step 4: Commit**

```bash
git add src/app.css
git commit -m "feat(hig): material, metric, and motion tokens with fallback"
```

---

## Task 5: HIG button hierarchy

**Files:**
- Modify: `src/app.css` (the `── Buttons ──` block)
- Modify: `src/lib/components/ui/Button.svelte`

- [ ] **Step 1: Add HIG button variant classes in `app.css`**

In the `── Buttons ──` section, after the existing `.btn-danger:hover { … }` rule, add the HIG-named variants and alias the legacy names to them:

```css
/* ── HIG button hierarchy ──────────────────────────────────────────────────
   filled (high emphasis) · tinted (medium) · gray (low) · plain (text-only).
   Legacy names alias onto these so existing callers keep working. */
.btn-filled,
.btn-primary {
	background: var(--green-strong);
	color: var(--on-accent);
}
.btn-filled:hover,
.btn-primary:hover {
	background: var(--green-dark);
	text-decoration: none;
}
.btn-tinted {
	background: var(--green-tint);
	color: var(--green-strong);
}
.btn-tinted:hover {
	background: color-mix(in srgb, var(--green) 16%, var(--green-tint));
	text-decoration: none;
}
.btn-gray,
.btn-secondary {
	background: var(--surface-2);
	color: var(--text);
	border-color: var(--border);
}
.btn-gray:hover,
.btn-secondary:hover {
	background: color-mix(in srgb, var(--text) 7%, var(--surface-2));
	text-decoration: none;
}
.btn-plain,
.btn-ghost {
	background: transparent;
	color: var(--tint);
	padding: 0.4rem 0.6rem;
}
.btn-plain:hover,
.btn-ghost:hover {
	background: var(--fill-tertiary);
	text-decoration: none;
}
```

Then DELETE the now-superseded standalone `.btn-primary`, `.btn-secondary`, `.btn-ghost` rule blocks that appear earlier in the section (the original `.btn-primary { background: var(--green-strong); … }`, `.btn-secondary { … }` with its hardcoded `#ece3d3` hover, and `.btn-ghost { … }`), so each class is defined once. Leave `.btn`, `.btn:active`, and `.btn-danger` as-is.

- [ ] **Step 2: Extend the Button variant union**

In `src/lib/components/ui/Button.svelte`, change line 3 from:

```ts
	type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
```

to:

```ts
	type Variant = 'filled' | 'tinted' | 'gray' | 'plain' | 'primary' | 'secondary' | 'ghost' | 'danger';
```

No other change — the template already renders `class="btn btn-{variant}"`, which now resolves for every name.

- [ ] **Step 3: Run the full token test**

Run: `bunx vitest run src/lib/design-tokens.test.ts`
Expected: ALL assertions PASS (button hierarchy now present).

- [ ] **Step 4: Verify Svelte type-check passes**

Run: `bun run check`
Expected: 0 errors (the widened union is a superset; existing `variant="primary"` callers still type-check).

- [ ] **Step 5: Commit**

```bash
git add src/app.css src/lib/components/ui/Button.svelte
git commit -m "feat(hig): HIG button hierarchy (filled/tinted/gray/plain) + aliases"
```

---

## Task 6: Full suite + live verification

**Files:** none (verification only)

- [ ] **Step 1: Run the entire test suite**

Run: `bunx vitest run`
Expected: PASS — all pre-existing tests plus the new `design-tokens.test.ts` green. (Baseline was 249 green per project memory; expect 249 + new file's cases.)

- [ ] **Step 2: Run lint**

Run: `bunx prettier --check src/app.css src/lib/components/ui/Button.svelte src/lib/design-tokens.test.ts`
Expected: PASS, or run `bunx prettier --write` on those files and re-check, then amend the relevant commit.

- [ ] **Step 3: Live visual verification (light + dark)**

Start the dev server (`bun run dev`), then with Playwright/Chrome DevTools MCP on a mobile viewport (e.g. 390×844):
1. Open `/garde-manger` (log in first if needed) — confirm body text now renders at 17px, headings unchanged in layout, buttons render with filled/gray styling, no visual regression.
2. Toggle dark theme — confirm tokens resolve (no missing-variable fallbacks, separators/fills visible, contrast intact).
3. Capture one screenshot per theme for the record.

Expected: no regression vs. pre-M1; new tokens resolve in both themes.

- [ ] **Step 4: Refresh the knowledge graph**

Run: `graphify update .`
Expected: completes (AST-only, no API cost).

- [ ] **Step 5: Final commit (if any verification fixups were made)**

```bash
git add -A
git commit -m "chore(hig): M1 foundations verification fixups"
```

(Skip if Steps 1–4 required no changes.)

---

## Self-Review

**Spec coverage (§1 Foundations + §4 Button):**
- Typography ramp → Task 2 ✓
- Semantic color roles (labels, fills, separator, tint) → Task 3 ✓
- Materials + fallback → Task 4 ✓
- Metrics + motion → Task 4 ✓
- Button HIG hierarchy → Task 5 ✓
- Tests green + live verify → Tasks 1, 6 ✓
- Keep brand palette / light-dark / WCAG AA → all tokens reference existing palette and use `light-dark()`; contrast verified in Task 6 Step 3 ✓

**Out of M1 scope (later milestones):** NavigationBar/TabBar/transitions (M2), List/SegmentedControl/Toggle + Home conversion (M3), Sheet/ActionSheet (M4), SwipeActions (M5), per-surface polish (M6), full a11y/Dynamic-Type audit (M7). Card grouped-surface support lands with List in M3.

**Placeholder scan:** none — every code step shows exact CSS/TS.

**Type consistency:** token names in `design-tokens.test.ts` (Task 1) exactly match those added in Tasks 2–5; button class names (`.btn-filled/tinted/gray/plain`) consistent between Task 1 test, Task 5 CSS, and the widened `Variant` union.

---

## Roadmap — subsequent milestones (each gets its own plan when reached)

- **M2 Chrome:** `NavigationBar.svelte` (large-title scroll-collapse via sentinel + IntersectionObserver), `TabBar.svelte` (flat 5-tab, replaces `BottomNav.svelte`), push/pop route transitions; wire into `(app)/+layout.svelte`.
- **M3 Lists & controls:** `List.svelte`/`ListRow.svelte`, `SegmentedControl.svelte`, `Toggle.svelte`; convert Home (`garde-manger`) to grouped sections + segmented location filter; `Card` grouped-surface variant.
- **M4 Sheets & actions:** `Sheet.svelte`, `ActionSheet.svelte`; Add/Edit as sheets; item destructive actions.
- **M5 Swipe actions:** `SwipeActions.svelte` on pantry rows with keyboard/desktop fallback.
- **M6 Per-surface polish:** item detail (pushed view), bilan, cuisiner, account, households.
- **M7 A11y + verification:** contrast/Dynamic-Type/semantics audit, live Playwright verification (light+dark, mobile), docs, graphify update.
