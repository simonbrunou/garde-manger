# Household-admin CRUD — design

- **Date:** 2026-05-30
- **Status:** Approved (design), pending spec review
- **Author:** Simon Brunou (with Claude)

## Goal

Give a **household admin** (`memberships.role = 'admin'`) complete control over the
entities they own — the household itself, its members, and its pending
invitations — through a single "Manage household" screen. Inventory items already
have full CRUD and are out of scope.

## Scope

**In scope** (the gaps a household admin currently cannot perform):

| Entity | New capability |
|---|---|
| Household | Update (rename + warn-days), Delete |
| Members | Update role (promote/demote), Remove |
| Invitations | List pending, Revoke |

**Out of scope:** system/super-admin over all data; editing the shared
`foods`/`shelf_lives` catalogue or `products`; any change to inventory-item CRUD
(already complete); changing the authentication model.

## Decisions (resolved during brainstorming)

1. **Role/scope:** household admin only, scoped to households the user administers.
2. **Last-admin protection (non-negotiable):** a household must always retain at
   least one admin. Demoting or removing the final admin is blocked.
3. **Delete guard:** type-to-confirm — the admin must type the household's exact
   name. After deleting the *active* household, switch the selection to another
   membership or clear it.
4. **Architecture:** Approach B — one consolidated card-sectioned hub at
   `households/[id]`, retiring the standalone read-only `members` page.

## Current state (relevant facts)

- Authorization primitive already exists and is tested:
  `requireMembership(db, householdId, userId, requiredRole?)` returns the
  membership or throws `MembershipError('not_member' | 'forbidden')`.
- `src/lib/server/households.ts` already exports `createHousehold`, `listForUser`,
  `requireMembership`, `MembershipError`.
- Schema FKs cascade on household delete: `memberships`, `inventory_items`, and
  `invitations` all reference `households.id` with `onDelete: 'cascade'`, so
  deleting the household row cleans up its dependents automatically.
- Routing today: `households/+page` (list + create + switch),
  `households/[id]/members/+page` (read-only list), `households/[id]/invite/+page`
  (create invitation). The list links each household to `…/members`.

## Architecture — Approach B

Make `households/[id]/+page.svelte` the **Manage household hub**. It is viewable by
any member (read-only) and fully actionable by admins. The standalone
`households/[id]/members` route is retired; its member list folds into the hub.

### Surface — cards, top to bottom

1. **Settings** — `name` and `warnDays` inputs. Admins can edit and save; members
   see the values read-only. → `updateSettings` action.
2. **Members** — list each member with name, email, role badge, joined date. For
   admins, every row (including the admin's own, enabling self-demote / leave) shows
   a promote/demote control (admin ↔ member) and a remove button; controls that
   would violate the last-admin rule are disabled rather than failing on submit. An
   admin-only "Invite" button links to the existing `invite` page. → `setRole`,
   `removeMember` actions.
3. **Pending invitations** *(admin only)* — invitations that are unused
   (`usedAt IS NULL`) and unexpired (`expiresAt > now`), each with role, created
   date, expiry, and a revoke button. Empty-state when none. → `revokeInvitation`
   action.
4. **Danger zone** *(admin only)* — delete the household. A text input requires the
   exact household name; the `btn-danger` submit is the confirmation. → `deleteHousehold`
   action.

### Role visibility

- **Member (non-admin):** sees Settings (read-only) and Members (no controls).
  Does **not** see Pending invitations or Danger zone.
- **Admin:** sees all four cards with controls.

### Routing changes

- New: `households/[id]/+page.svelte` + `+page.server.ts`.
- Remove: `households/[id]/members/+page.svelte` + `+page.server.ts`.
- Relink: the households list (`households/+page.svelte`) links each household to
  `/households/{id}` instead of `/households/{id}/members`.
- Update: the invite page's "back" link points to `/households/{id}` instead of
  `…/members`.

## Data-access layer (`src/lib/server/households.ts`)

New pure, transaction-safe functions. Each verifies its target belongs to the given
household and enforces invariants by throwing a typed error.

- `updateHousehold(db, householdId, { name?, warnDays? })`
  - Validates `name` (trimmed, 1–80 chars) and `warnDays` (integer 0–30) when present.
  - Throws `HouseholdError('invalid')` on bad input; `HouseholdError('not_found')`
    if the household is missing.
- `deleteHousehold(db, householdId)`
  - Deletes the household row inside a transaction; FK cascades handle dependents.
  - Throws `HouseholdError('not_found')` if missing.
- `setMemberRole(db, householdId, targetUserId, role)`
  - Updates the membership's role.
  - Throws `HouseholdError('last_admin')` if changing the final admin to `member`.
  - Throws `HouseholdError('not_found')` if the target is not a member of this household.
- `removeMember(db, householdId, targetUserId)`
  - Deletes the membership.
  - Throws `HouseholdError('last_admin')` if removing the final admin.
  - Throws `HouseholdError('not_found')` if the target is not a member here.
- `listPendingInvitations(db, householdId, now)`
  - Returns invitations where `usedAt IS NULL AND expiresAt > now`, ordered newest first.
- `revokeInvitation(db, invitationId, householdId)`
  - Deletes the invitation, scoped to `householdId` (cannot touch another household's
    invite). Throws `HouseholdError('not_found')` if no matching pending invite.
- Internal helper `countAdmins(db, householdId)` backs the last-admin checks.

### Error type

Introduce `HouseholdError` (mirrors `MembershipError`) with
`code: 'invalid' | 'not_found' | 'last_admin' | 'name_mismatch'`. The data layer
never throws `name_mismatch` (that is an action-level check); it is included so
actions can map all failure codes uniformly.

## Server actions (`households/[id]/+page.server.ts`)

`load`: `requireMembership(db, id, user.id)` (any member; maps `MembershipError` →
`error(403)`); returns `{ household, members, pendingInvitations (admin only),
isAdmin }`.

All mutating actions first call `requireMembership(db, id, user.id, 'admin')` and map
`MembershipError('forbidden')` → `fail(403)`:

- `updateSettings` — parse `name`/`warnDays`, call `updateHousehold`, return success
  flag; map `HouseholdError` codes → `fail(400)` messages.
- `setRole` — parse `userId` + `role`, call `setMemberRole`; `last_admin` →
  `fail(400)` with the protection message.
- `removeMember` — parse `userId`, call `removeMember`; `last_admin` → `fail(400)`.
  If the admin removed *themselves*, fix the active-household cookie and redirect to
  `/households`.
- `revokeInvitation` — parse invite `id`, call `revokeInvitation`.
- `deleteHousehold` — read the typed `confirmName`; if it does not exactly match
  `household.name`, `fail(400)` with the name-mismatch message; otherwise call
  `deleteHousehold`, fix the active-household cookie if it pointed at this household
  (switch to another membership via `listForUser`, else clear), and `redirect(303,
  '/households')`.

## Validation rules

- Household name: trimmed, length 1–80 (matches existing create rule).
- Warn-days: integer, 0–30 inclusive.
- Role: must be one of `admin` | `member`.
- Delete confirmation: exact, case-sensitive match against the current name (after
  trimming surrounding whitespace from the input).

## Error handling & i18n

New message keys (FR canonical, mirrored in EN, added to the `Messages` interface).
Final wording chosen during implementation; the set covers:

- Hub/settings: page/section titles, name label, warn-days label, save button,
  saved confirmation.
- Members: promote label, demote label, remove button, remove confirmation prompt,
  last-admin error.
- Invitations: section title, empty-state, expires-on label, revoke button,
  revoked confirmation.
- Danger zone: section title, delete warning text, type-name prompt/placeholder,
  delete button, name-mismatch error.
- Generic: forbidden error (reuse if one exists).

Reuse existing `members_*` keys where wording still fits.

## Testing (TDD)

Extend `src/lib/server/households.test.ts` with unit tests written before the
implementation, focused on invariants:

- `updateHousehold`: applies name/warn-days; rejects out-of-range warn-days and
  empty/oversized names; `not_found` for unknown id.
- `deleteHousehold`: removes the household **and** cascades memberships, inventory
  items, and invitations.
- `setMemberRole`: promotes/demotes; **blocks demoting the last admin**
  (`last_admin`); allows demoting one of several admins; `not_found` for a
  non-member target.
- `removeMember`: removes a member; **blocks removing the last admin**; allows an
  admin to remove themselves when another admin remains.
- `listPendingInvitations`: includes only unused, unexpired invites; excludes used
  and expired; correct ordering.
- `revokeInvitation`: removes a pending invite; refuses to revoke an invite from a
  different household (`not_found`).

Page actions remain thin wrappers over this tested layer, consistent with the
project's existing "test the server module, keep pages thin" pattern.

## Edge cases / invariants (summary)

- A household always has ≥ 1 admin (enforced on both demote and remove).
- An admin may remove themselves only if another admin remains; otherwise they must
  promote someone first or delete the household.
- Deleting a household removes all shared data for every member (cascade) — guarded
  by type-to-confirm.
- Deleting/leaving the *active* household reassigns or clears the
  `gm_household` cookie so the app never points at a vanished household.
- Cross-household tampering is impossible: every target (member, invitation) is
  verified against the household whose admin is acting.

## Out-of-scope / future

- Transfer-ownership UX, audit log of admin actions, bulk member operations,
  super-admin/back-office, catalogue editing — not part of this work.
