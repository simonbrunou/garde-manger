# Apple HIG — M2 Chrome Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.
>
> **PREREQUISITE — live browser verification.** Every task here changes the app shell or a
> visible screen. Do NOT execute without a working dev server + browser screenshot tool
> (chrome-devtools MCP or Playwright). In the session that built M1/M3 components, browser
> tools were unavailable, so this wiring was deliberately deferred. Verify the browser
> works (navigate to the dev server + take one screenshot) BEFORE starting Task 1.

**Goal:** Wire the already-built `NavigationBar.svelte` (large-title scroll-collapse) and
the already-flattened `BottomNav.svelte` tab bar into the `(app)` shell, fold the
`AppHeader` household switcher into the home large-title, and add iOS push/pop route
transitions — verifying each step live in light + dark on a mobile viewport.

**Architecture:** SvelteKit `(app)/+layout.svelte` currently renders `OfflineBanner` +
`AppHeader` + `<main>` + `BottomNav`. The HIG large-title must live in scroll content
per-page, so `NavigationBar` is rendered by each page (or a shared wrapper), not the
layout. The layout keeps `OfflineBanner` + `<main>` + the (already-HIG) tab bar; AppHeader
is removed and its household switcher moves into the home page's NavigationBar trailing/
title slot.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, `bun:test` (`bun test`), `bun run check`.

> **Spec:** `docs/superpowers/specs/2026-05-31-apple-hig-implementation-design.md` (§2).
> **Already done (branch `feat/apple-hig`):** `BottomNav.svelte` flat tab bar (`2edc60d`);
> `NavigationBar.svelte` built (`ba063ee`); M3 controls + home SegmentedControl + Card
> grouped (`e607165`, `a593020`, `e63b12f`); Sheet/ActionSheet (`4f8e6d2`).
> **Verification protocol (this branch had a flaky channel):** after every edit run
> `bun run check` via `ctx_execute` and confirm the timestamp INCREMENTS and FILES count
> is current; after every commit confirm with `git show HEAD:<file>`. Never trust a
> repeated/frozen-timestamp result.

---

## File Structure

- **Modify** `src/routes/(app)/+layout.svelte` — drop `AppHeader`; keep OfflineBanner +
  main + tab bar. Provide a scroll context if needed for the collapse observer.
- **Create** `src/lib/components/ui/HouseholdMenu.svelte` — extract the switcher
  `<details>`/menu from `AppHeader.svelte` so it can sit in the NavigationBar title slot.
- **Modify** `src/routes/(app)/garde-manger/+page.svelte` — render `NavigationBar` with
  the household name as large title + `HouseholdMenu` + settings link in trailing slot;
  remove the page's own `<header class="head">`.
- **Modify** `src/routes/(app)/bilan/+page.svelte`, `cuisiner/+page.svelte`,
  `account/+page.svelte` — replace each page's `<h1>` with `NavigationBar` (large title,
  no leading; trailing optional).
- **Modify** pushed pages (`item/[id]`, `households/[id]`, `households/[id]/invite`,
  `scan/[barcode]`) — `NavigationBar` with a leading back button (chevron + prev label).
- **Delete** `src/lib/components/ui/AppHeader.svelte` once nothing imports it.
- **Add** route transition CSS/wrapper (SvelteKit view transitions in
  `src/routes/+layout.svelte` `onNavigate`, gated by reduced-motion).

---

## Task 1: Extract HouseholdMenu from AppHeader

**Files:**
- Create: `src/lib/components/ui/HouseholdMenu.svelte`

- [ ] **Step 1: Re-verify AppHeader's real bytes** (channel was flaky)

Run: `git show HEAD:src/lib/components/ui/AppHeader.svelte | head -50`
Expected: the `<details class="switcher">` block (switcher summary + menu form + manage
link) and the `.settings` link. Copy the switcher markup + its styles verbatim.

- [ ] **Step 2: Create HouseholdMenu.svelte**

Move the `{#if households.length > 0} <details class="switcher">…</details> {:else}
<a class="switcher-empty">…</a> {/if}` block (and its scoped styles) into the new
component. Props: `households: { id: string; name: string }[]`, `activeHouseholdId:
string | null`, `t: Messages`. Keep the POST `/households?/switch` form and the manage
link unchanged.

- [ ] **Step 3: Validate**

Run the Svelte MCP autofixer on the new component (`desired_svelte_version: 5`);
Run: `bun run check` (via ctx_execute) — expect 0 errors, FILES +1, timestamp fresh.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/ui/HouseholdMenu.svelte
git commit -m "feat(hig): extract HouseholdMenu from AppHeader"
```

---

## Task 2: Wire NavigationBar + HouseholdMenu into Home, drop AppHeader from layout

**Files:**
- Modify: `src/routes/(app)/+layout.svelte`
- Modify: `src/routes/(app)/garde-manger/+page.svelte`

- [ ] **Step 1: Re-verify both files' real bytes** (`git show HEAD:<path>`).

- [ ] **Step 2: Remove AppHeader from the layout**

In `+layout.svelte` delete the `AppHeader` import and its `<AppHeader … />` line. Leave
`OfflineBanner`, `<main>{@render children()}</main>`, and `<BottomNav {t} />`. The
`data.households` / `data.activeHouseholdId` props now flow to the home page (already
available via its own load? — if not, confirm the home `+page.server.ts` exposes them;
add to the page load if missing).

- [ ] **Step 3: Render NavigationBar on Home**

In `garde-manger/+page.svelte`, remove `<header class="head"><h1>…</h1><p class="sub">…
</p></header>` and render:

```svelte
<NavigationBar title={data.activeHouseholdName}>
	{#snippet leading()}
		<HouseholdMenu
			households={data.households}
			activeHouseholdId={data.activeHouseholdId}
			{t}
		/>
	{/snippet}
	{#snippet trailing()}
		<a class="settings" href="/account" aria-label={t.nav_settings}>
			<Icon name="settings" size={22} />
		</a>
	{/snippet}
</NavigationBar>
```

Keep the `<p class="sub">` subtitle directly under the large title if desired (move it
below the NavigationBar large-title wrap or pass as a subtitle snippet — decide live).

- [ ] **Step 4: Validate + LIVE VERIFY**

`bun run check` 0 errors. Then dev server + screenshot `/garde-manger` light AND dark on
390×844: confirm large title shows household name, collapses to centered inline title on
scroll, switcher menu opens, settings gear in trailing, tab bar unaffected, no doubled
header, safe-area top respected.

- [ ] **Step 5: Commit** (`feat(hig): wire NavigationBar + HouseholdMenu into Home`)

---

## Task 3: NavigationBar on Bilan, Cuisiner, Account

**Files:** `bilan/+page.svelte`, `cuisiner/+page.svelte`, `account/+page.svelte`

- [ ] For each: re-verify bytes; replace the leading `<h1>{title}</h1>` with
  `<NavigationBar title={…} />` (large, no leading). `bun run check` after each.
- [ ] LIVE VERIFY each route light+dark (large-title collapse, no layout break).
- [ ] Commit per page (or one commit: `feat(hig): NavigationBar on bilan/cuisiner/account`).

---

## Task 4: Pushed views get a back button

**Files:** `item/[id]/+page.svelte`, `households/[id]/+page.svelte`,
`households/[id]/invite/+page.svelte`, `scan/[barcode]/+page.svelte`

- [ ] For each: re-verify bytes; render
  `<NavigationBar title={…}>{#snippet leading()}<a class="back" href={backHref}><Icon
  name="chevron-left" .../> {prevLabel}</a>{/snippet}</NavigationBar>`.
  (Confirm a `chevron-left` icon exists in `Icon.svelte`; if only `chevron-right`, add a
  left variant first.)
- [ ] `bun run check`; LIVE VERIFY back navigation works light+dark.
- [ ] Commit (`feat(hig): back-button NavigationBar on pushed views`).

---

## Task 5: Delete AppHeader; iOS push/pop transitions

**Files:** delete `AppHeader.svelte`; modify `src/routes/+layout.svelte`

- [ ] **Step 1:** Confirm nothing imports AppHeader:
  `grep -rl AppHeader src` → expect no results. Then `git rm
  src/lib/components/ui/AppHeader.svelte`.
- [ ] **Step 2:** Add SvelteKit view transitions in root `+layout.svelte`:

```svelte
<script lang="ts">
	import { onNavigate } from '$app/navigation';
	onNavigate((navigation) => {
		if (!document.startViewTransition) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>
```

Add the horizontal-slide `::view-transition-old/new(root)` keyframes to `app.css`, gated
by `@media not (prefers-reduced-motion: reduce)`.

- [ ] **Step 3:** `bun run check`; `bun test` (full suite green); LIVE VERIFY push/pop
  slide on navigation and that reduced-motion disables it.
- [ ] **Step 4:** Commit (`feat(hig): drop AppHeader; iOS push/pop route transitions`).

---

## Task 6: Final verification

- [ ] `bun test` → full suite green (282+; adjust if tab/header tests changed).
- [ ] `bun run lint` → my files clean (pre-existing `scripts/ui-audit-capture.mjs` eslint
  errors are not in scope).
- [ ] LIVE: full click-through of all five tabs + one pushed view, light AND dark, 390×844;
  capture one screenshot per surface per theme.
- [ ] `graphify update .`; commit graph refresh.

---

## Self-Review

**Spec §2 coverage:** NavigationBar large-title collapse → Tasks 2–4 (component already
built); flat tab bar → already done (`2edc60d`); household switcher into title → Tasks 1–2;
push/pop transitions → Task 5. ✓
**Placeholder scan:** none — each task names exact files and shows the wiring markup.
**Risk:** every task is visually verified live before commit; bytes re-read before edit due
to the prior session's flaky channel.

## After M2: remaining milestones (own plans when reached)
- **M3 finish:** convert home expiry bands to grouped `List`/`ListRow`; wire `Toggle` into
  account (theme/push). (Components already built + verified.)
- **M4 wire:** Add/Edit as `Sheet`; item destructive actions as `ActionSheet`.
- **M5:** build + wire `SwipeActions` on pantry rows (gesture logic — needs live testing).
- **M6:** per-surface polish. **M7:** a11y + Dynamic-Type + full live verification.
