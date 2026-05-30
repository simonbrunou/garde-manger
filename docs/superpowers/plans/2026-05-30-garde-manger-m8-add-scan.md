# Garde-Manger M8 · Add / Scan flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Add and Scan journeys on the M6/M7 design system and **kill the add-page scroll-trap** — selecting a food now opens a *focused confirm* view (form at the top), instead of appending the form below the entire catalogue list.

**Architecture:** Pure presentation/structure changes to three routes (`(app)/add`, `(app)/scan`, `(app)/scan/[barcode]`). The server loads and form actions (`?/addFresh`, `?/addCustom`, scan `?/add`, the no-JS scan fallback, the camera island, OFF lookup) are **unchanged** — only the templates/CSS change. The add page gains a discriminated render: chooser when no food is selected, focused-confirm when `data.selectedFood` is set.

**Tech Stack:** SvelteKit 2.57 + Svelte 5 (runes), Bun, `bun:test`. `(app)` is `csr=false` (no JS) EXCEPT `/scan` which sets `csr=true` for the camera island. Everything has a no-JS path.

---

## Conventions (read once)
- **Branch:** `redesign/m8` (already checked out). Don't switch/create branches. Dev server already on :5173 — don't start another; for build smoke use port 3000 and kill it.
- **Gate every task:** `bun run format` → `bun run check` → `bun run lint`. Tests: `bun test`.
- **Commit trailer:** end every commit with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- **Components available (M6/M7):** `Icon` (+`IconName` incl. `scan`, `cat-veg`, `edit`, `x`, `search`, `check`), `Button`, `Card`, `Thumb`, `EmptyState`. Tokens in `app.css`.
- **PRESERVE THE DATA CONTRACT:** the add/scan server files and their returned data + form field names + actions must NOT change. When restructuring a page, **lift the existing form fields verbatim** (same `name=`, same `value=`/`data.*` bindings, same `action=`) into the new markup. Read the current `+page.svelte` and `+page.server.ts` before editing so you preserve every binding (especially the add page's per-location DDM estimate logic).

## File map
| File | Responsibility | Action |
|---|---|---|
| `src/lib/i18n/messages/fr.ts`, `en.ts` | add `add_change_food` key | modify |
| `src/routes/(app)/add/+page.svelte` | chooser + focused-confirm (scroll-trap fix), design-system restyle | rewrite |
| `src/routes/(app)/scan/+page.svelte` | restyle scan (island + manual) on design system | rewrite |
| `src/routes/(app)/scan/[barcode]/+page.svelte` | restyle packaged-confirm (Card/Thumb/Button) | rewrite |

No server files change. No new tests (presentational); verified by `check`/`lint`/`build` + visual smoke. Existing 224 tests must stay green.

---

### Task 1: i18n key for "change food"

**Files:** `src/lib/i18n/messages/fr.ts`, `en.ts`.

- [ ] **Step 1:** Add one key near the add keys.
  - `fr.ts`: `add_change_food: '← Changer d’aliment',`
  - `en.ts`: `add_change_food: '← Change food',`
  (Add to BOTH the object and — for `fr.ts` — the `Messages` interface, so `bun run check` stays green via FR/EN parity.)
- [ ] **Step 2:** `bun run check` (0 errors), `bun test src/lib/i18n/i18n.test.ts` (parity green), `bun run format && bun run lint`.
- [ ] **Step 3:** Commit:
```bash
git add src/lib/i18n/
git commit -m "feat(m8): add_change_food i18n key (FR/EN)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Redesign `/add` — chooser + focused confirm (scroll-trap fix)

**Files:** rewrite `src/routes/(app)/add/+page.svelte`.

**FIRST read** the current `src/routes/(app)/add/+page.svelte` AND `src/routes/(app)/add/+page.server.ts` to learn the exact data shape: `data.noHousehold`, `data.selectedFood` (the chosen food, with `id`, `nameFr`/`nameEn`, `subtitleFr`/`subtitleEn`), `data.q` (search string), `data.results` (array of `{ food }`), and the **DDM estimate data** the current fresh form binds to (e.g. `data.defaultEstimate` and any per-location estimate the existing `<select>`/estimate-box uses). You MUST preserve every one of these bindings.

- [ ] **Step 1: Rewrite the page with three render states.** Structure:

```svelte
<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { m } from '$lib/i18n';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	let { data, form }: { data: PageData; form: ActionData } = $props();
	const t = $derived(m(data.locale));
</script>

<svelte:head><title>{t.add_title}</title></svelte:head>

{#if form?.message}<p class="error" role="alert">{form.message}</p>{/if}

{#if data.noHousehold}
	<EmptyState icon="households" title={t.add_no_household}>
		<Button href="/households" variant="primary">{t.nav_create_household}</Button>
	</EmptyState>
{:else if data.selectedFood}
	<!-- ── FOCUSED CONFIRM (scroll-trap fix: form is the whole view) ── -->
	<a class="back" href={`/add?q=${encodeURIComponent(data.q)}`}>{t.add_change_food}</a>
	<h1>{t.add_fresh_form_title}: {data.locale === 'fr' ? data.selectedFood.nameFr : data.selectedFood.nameEn}</h1>
	<Card>
		<!-- LIFT THE EXISTING `<form method="POST" action="?/addFresh">` BLOCK HERE VERBATIM:
		     hidden foodId, the location <select> with its per-location estimate boxes,
		     the DDM date field, the quantity field, the submit button. Keep every name=,
		     value=, and data.* binding identical to the current file. Replace the raw
		     submit/cancel <button>/<a> with <Button> components:
		       submit  → <Button type="submit" variant="primary" full>{t.add_fresh_submit}</Button>
		       (cancel is now the back link above, so the old cancel <a> can be dropped) -->
	</Card>
{:else}
	<!-- ── CHOOSER ── -->
	<h1>{t.add_title}</h1>
	<div class="methods">
		<a class="method" href="/scan">
			<span class="m-icon"><Icon name="scan" size={22} /></span>
			<span class="m-label">{t.add_method_scanner}</span>
			<Icon name="chevron-right" size={18} class="m-chev" />
		</a>

		<details class="method-d" open={data.q !== ''}>
			<summary>
				<span class="m-icon"><Icon name="cat-veg" size={22} /></span>
				<span class="m-label">{t.add_method_fresh}</span>
			</summary>
			<form method="GET" action="/add" class="search">
				<input type="search" name="q" value={data.q} placeholder={t.add_search_placeholder} autocomplete="off" aria-label={t.add_search_label} />
				<Button type="submit" variant="secondary">{t.add_search_submit}</Button>
			</form>
			{#if data.results && data.results.length > 0}
				<ul class="results">
					{#each data.results as { food } (food.id)}
						<li>
							<a href={`/add?food=${food.id}&q=${encodeURIComponent(data.q)}`}>
								<span>{data.locale === 'fr' ? food.nameFr : food.nameEn}</span>
								{#if (data.locale === 'fr' ? food.subtitleFr : food.subtitleEn)}
									<span class="sub">{data.locale === 'fr' ? food.subtitleFr : food.subtitleEn}</span>
								{/if}
							</a>
						</li>
					{/each}
				</ul>
			{:else if data.q !== ''}
				<p class="muted">{t.add_no_results}</p>
			{/if}
		</details>

		<details class="method-d">
			<summary>
				<span class="m-icon"><Icon name="edit" size={22} /></span>
				<span class="m-label">{t.add_method_custom}</span>
			</summary>
			<!-- LIFT THE EXISTING `<form method="POST" action="?/addCustom">` BLOCK HERE VERBATIM
			     (custom name field + quantity + submit). Replace the raw submit <button> with
			     <Button type="submit" variant="primary" full>{t.add_custom_submit}</Button>. -->
		</details>
	</div>
{/if}

<style>
	.back { display: inline-block; margin-bottom: 0.6rem; font-weight: 700; color: var(--text-muted); }
	.methods { display: flex; flex-direction: column; gap: 0.8rem; margin-top: 1rem; }
	.method, .method-d {
		background: var(--surface); border: 1px solid var(--border);
		border-radius: var(--radius); box-shadow: var(--shadow-sm); padding: 0.9rem 1rem;
	}
	.method { display: flex; align-items: center; gap: 0.7rem; color: inherit; }
	.method:hover { text-decoration: none; background: var(--surface-2); }
	.m-icon {
		width: 40px; height: 40px; border-radius: 12px; flex: none; display: grid; place-items: center;
		background: var(--green-tint); color: var(--green-dark);
	}
	.m-label { font-weight: 700; }
	.method :global(.m-chev) { margin-left: auto; color: var(--text-muted); }
	.method-d > summary {
		display: flex; align-items: center; gap: 0.7rem; cursor: pointer; list-style: none; font-weight: 700;
	}
	.method-d > summary::-webkit-details-marker { display: none; }
	.method-d[open] > summary { margin-bottom: 0.9rem; }
	.search { display: flex; gap: 0.5rem; margin-bottom: 0.8rem; }
	.search input { flex: 1; }
	.results { list-style: none; margin: 0; padding: 0; }
	.results li { border-bottom: 1px solid var(--border); }
	.results li a { display: block; padding: 0.7rem 0.2rem; color: inherit; }
	.results li a:hover { text-decoration: none; background: var(--surface-2); }
	.results .sub { display: block; font-size: 0.8rem; color: var(--text-muted); }
</style>
```

**CRITICAL:** the two "LIFT … VERBATIM" comments are not placeholders — they mean: copy the exact existing `<form action="?/addFresh">` and `<form action="?/addCustom">` field markup (including the per-location DDM estimate boxes and all `data.*` bindings) from the current file into these positions. Do NOT invent new field logic; preserve the estimate behavior exactly. Only the surrounding layout/styling and the submit buttons change. The scroll-trap is fixed because the fresh add form now renders ONLY in the focused-confirm branch (when `data.selectedFood` is set), never below the results list.

- [ ] **Step 2:** Verify the fresh + custom add flows still work end-to-end (data bindings intact). `bun run check` (0 errors), `bun run build`. `bun run format && bun run lint`.
- [ ] **Step 3:** Commit:
```bash
git add 'src/routes/(app)/add/+page.svelte'
git commit -m "feat(m8): redesign /add — chooser + focused confirm (kills scroll-trap)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Restyle `/scan`

**Files:** rewrite `src/routes/(app)/scan/+page.svelte`. Read the current file first to preserve: the `{#if browser}<BarcodeScanner locale={data.locale} />{/if}` island, the no-JS manual `<form method="GET" action="/scan">` with `name="code"`, the `data.invalidCode` error, and the `data.noHousehold` branch. KEEP `export const ssr/csr` config (it lives in `+page.ts`, unchanged).

- [ ] **Step 1:** Rewrite the template on the design system — wrap the manual entry in a `Card`, use `Button` for submit, `EmptyState`/`Button` for the no-household branch, keep the camera island and the "Produit sans code-barres ? Saisie libre" link to `/add`. Preserve every form field name and the island import.

```svelte
<script lang="ts">
	import { browser } from '$app/environment';
	import { m } from '$lib/i18n';
	import BarcodeScanner from '$lib/components/BarcodeScanner.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	const t = $derived(m(data.locale));
</script>

<svelte:head><title>{t.scan_title}</title></svelte:head>

{#if data.noHousehold}
	<EmptyState icon="households" title={t.add_no_household}>
		<Button href="/households" variant="primary">{t.nav_create_household}</Button>
	</EmptyState>
{:else}
	<h1>{t.scan_title}</h1>
	<p class="muted">{t.scan_instructions}</p>

	{#if browser}
		<BarcodeScanner locale={data.locale} />
	{/if}

	<Card>
		<h2>{t.scan_manual_title}</h2>
		<form method="GET" action="/scan" class="manual">
			<label for="manual-code">{t.scan_manual_label}</label>
			<input id="manual-code" name="code" inputmode="numeric" autocomplete="off" placeholder={t.scan_manual_placeholder} />
			{#if data.invalidCode}<p class="error" role="alert">{t.scan_manual_invalid}</p>{/if}
			<Button type="submit" variant="primary" full>{t.scan_manual_submit}</Button>
		</form>
	</Card>

	<p class="freetext"><a href="/add">{t.scan_or_freetext}</a></p>
{/if}

<style>
	.muted { color: var(--text-muted); }
	.manual { display: flex; flex-direction: column; gap: 0.5rem; }
	.freetext { margin-top: 1rem; text-align: center; }
</style>
```

- [ ] **Step 2:** `bun run check`, `bun run build`, `bun run format && bun run lint`. (The camera island is unchanged; it still hydrates only in the browser.)
- [ ] **Step 3:** Commit:
```bash
git add 'src/routes/(app)/scan/+page.svelte'
git commit -m "feat(m8): restyle /scan on the design system (island + no-JS intact)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Restyle `/scan/[barcode]` packaged confirm

**Files:** rewrite `src/routes/(app)/scan/[barcode]/+page.svelte`. Read the current file first. PRESERVE exactly: the `<form method="POST" action="?/add">`, the hidden `barcode`, the readonly barcode display, the `name` field (required when no productName), the brand readonly field, the **DLC `useByDate` required date field** + hint, the location `<select>`, the quantity field, the OFF attribution, the `data.offUnavailable`/`!isFound` notices, and the `data.noHousehold` branch. Only restyle with `Card`/`Thumb`/`Button`.

- [ ] **Step 1:** Rewrite the template: use `Thumb` for the product image (pass `imagePath={product.imagePath}` and `barcode={data.barcode}`; category is null for packaged → it falls back to an icon if no photo), wrap the form in a `Card`, use `<Button type="submit" variant="primary" full>` for submit. Keep all field `name=`s and bindings identical. Keep the `<title>`, the notices, the attribution `<p>`, and the back link to `/scan`.
  - For the image, replace the raw `<img src="/products/{data.barcode}/image">` with `<Thumb imagePath={product?.imagePath} barcode={data.barcode} category={null} size={72} alt={productName} />` (Thumb already builds the `/products/<barcode>/image` URL).
- [ ] **Step 2:** `bun run check`, `bun run build`, `bun run format && bun run lint`.
- [ ] **Step 3:** Commit:
```bash
git add 'src/routes/(app)/scan/[barcode]/+page.svelte'
git commit -m "feat(m8): restyle packaged-confirm (Card/Thumb/Button; DLC + actions intact)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Verification + final review

- [ ] **Step 1:** `bun test` — all pass (the 224 from M7; no new tests, none removed).
- [ ] **Step 2:** `bun run check && bun run lint && bun run build` — all clean.
- [ ] **Step 3:** Visual smoke at 390px in both themes (dev server :5173):
  - `/add`: three method cards (real icons, no emoji); open "Fruit/Légume/Frais", search "banane", pick it → a **focused confirm** view appears (form at top, no long catalogue below it); the back link returns to the search; submitting adds the item; "Saisie libre" custom add still works.
  - `/scan`: manual entry card styled; the "Saisie libre" link works; (camera island won't activate headless — that's fine).
  - `/scan/<barcode>`: confirm page styled (Card/Thumb/Button); DLC date is required; adding works.
  - All flows work with JS disabled (the camera island is the only JS, and it's optional).
- [ ] **Step 4:** Confirm the spec's M8 "done when": FAB→/add chooser is clean; the scroll-trap is gone (form in place); scan + confirm restyled; no-JS fallback intact. Fix any gaps.

## Self-review notes
- **Spec coverage:** FAB add-sheet → the no-JS reality is the redesigned `/add` chooser (overlay sheet needs JS; `(app)` is `csr=false`) — documented deviation. Scroll-trap fix → Task 2 focused-confirm state. Scan + confirm redesign → Tasks 3–4. Scan keeps its no-JS manual fallback + island.
- **Data contract preserved:** no server/action/field changes; the plan repeatedly instructs lifting existing form blocks verbatim (esp. the DDM estimate logic and the DLC required field), so add/scan behavior and the 224 tests are unaffected.
- **Deferred (noted):** the M7 Thumb image-presence guard is NOT added here — product images are written to disk at cache time and there is no eviction/pruning, so a set `imagePath` reliably exists; adding a disk-stat per render would be cost for no real benefit (YAGNI). Revisit only if image pruning is introduced.
- **No placeholders:** the two "LIFT VERBATIM" markers are explicit instructions to copy existing, working markup (with a read-first step), not vague TODOs.
