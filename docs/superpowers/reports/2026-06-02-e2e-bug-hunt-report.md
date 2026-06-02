# E2E Blind Bug Hunt — Run Report

**Date:** 2026-06-02
**Branch:** `test/e2e-suite`
**Suite:** Playwright (Chromium) against a production adapter-node build on an isolated SQLite DB.
**Result:** **47 passed, 1 failed** on the blind sweep — the single failure pinpointed one real, reproducible bug (fixed below; suite is now **48/48 green**).

## The bug — pantry-list "Eaten" / "Tossed" actions do nothing

**Action:** Consuming or discarding an item directly from the pantry list (`/garde-manger`) — via the inline "Eaten"/"Tossed" buttons **or** the swipe gesture.

**Intended:** the action flips the item's status (`consumed`/`discarded`) so it leaves the active list and feeds the waste stats.

**Actual:** nothing happens — the item stays active. The server rejects the POST.

### Root cause
`src/lib/components/ui/ItemRow.svelte` hardcodes the lifecycle forms to an **absolute root path**:

```svelte
src/lib/components/ui/ItemRow.svelte:56  <form ... method="POST" action="/?/consume" ...>
src/lib/components/ui/ItemRow.svelte:59  <form ... method="POST" action="/?/discard" ...>
```

`action="/?/consume"` targets the **root route** `/` (`src/routes/+page.server.ts`), which defines **no form actions** (its `load` merely redirects authenticated users to `/garde-manger`). The real `consume`/`discard` actions live on the current route, `src/routes/(app)/garde-manger/+page.server.ts:155-213`. The leading `/` misroutes the POST. The correct value is the **relative** `?/consume` / `?/discard` (which resolves to `/garde-manger?/…`).

`ItemRow` is used only on `/garde-manger` (`+page.svelte:79`), and these are the only `action="/?/…"` forms in the codebase.

### Evidence
- Authoritative full-suite run, server log on the failing test:
  `POST method not allowed. No form actions exist for this page`
- Direct HTTP reproduction (identical session/Origin/payload, only the path differs):

  | POST path | HTTP | item |
  |---|---|---|
  | `/garde-manger?/consume` (correct) | 200 | **consumed** |
  | `/?/consume` (what `ItemRow` posts) | **405** | unchanged |

- Failing assertion: `tests/e2e/inventory.spec.ts:198` — `expect(page.getByText(name)).toHaveCount(0)`.

### Impact
Both the inline buttons and the swipe gesture submit these same forms, so the **entire one-tap lifecycle from the pantry list is dead** — a core user story. The item **detail** page (`/item/[id]`) uses correctly-routed forms and works, which is why the bug is easy to miss and why unit tests didn't catch it.

### Fix (applied)
Changed the two `action` attributes in `ItemRow.svelte:56,59` from the absolute
`/?/consume` · `/?/discard` to the relative `?/consume` · `?/discard`, so the POST
targets the current `garde-manger` route's actions instead of the actionless root.
`tests/e2e/inventory.spec.ts:173` ("consume from the list…") now passes; the full
suite is **48 passed / 0 failed**.

## What else the suite covered (all green)
auth + route guards · add fresh/custom (incl. quantity ≥ 1) · scan manual entry + packaged add (offline cache) · inventory bands/boundary/sort/NULLs-last/day-badge/location filter · item detail update/lifecycle/remove · households create/switch/settings/roles/last-admin/remove/delete-cascade/cross-household-scoping · invitations create/preview-no-consume/accept/single-use · account profile/theme/passkey-remove/push · bilan month counts + waste streak · passkey enroll + login (virtual authenticator).

**Notable non-bugs (intended behavior held):** the invitation join link is **not** consumed by mere navigation/preview (only by submitting accept); quantity `0` is rejected server-side; the last admin cannot be demoted/removed; a non-member cannot view/act on another household's item; monthly stats exclude items closed before the 1st.

**Minor observations (not functional bugs, not filed):**
- The passkey enroll/login button labels in `PasskeyEnroll.svelte`/`PasskeyLogin.svelte` are hardcoded French strings, bypassing the i18n catalogue.
- `/item/[id]` has no UI control to switch a date between Use-by (DLC) and Best-before (DDM); the invariant (only one date set) is enforced, but the kind cannot be flipped from that page.

## Reproduce
```bash
bunx playwright install chromium      # once
bun run test:e2e                      # full suite (fresh build + isolated DB)
bun run test:e2e -- --project=app inventory.spec   # just the failing case
```
