# Household-admin CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give a household admin full CRUD over their household, members, and invitations through a single "Manage household" hub at `households/[id]`.

**Architecture:** A tested data-access layer (`households.ts`, `invitations.ts`) enforces all invariants (last-admin protection, household-scoping, validation) by throwing typed errors. Thin SvelteKit form actions on a new `households/[id]/+page` call that layer after an admin authorization check. The hub replaces the read-only `members` page.

**Tech Stack:** SvelteKit (Svelte 5 runes), Drizzle ORM over bun:sqlite, valibot, bun:test, FR/EN i18n with a TypeScript-enforced `Messages` shape.

**Reference spec:** `docs/superpowers/specs/2026-05-30-household-admin-crud-design.md`

---

## File Structure

**Data layer (unit-tested):**
- Modify `src/lib/server/households.ts` — add `HouseholdError`, `countAdmins`, `updateHousehold`, `deleteHousehold`, `setMemberRole`, `removeMember`.
- Modify `src/lib/server/invitations.ts` — add `listPendingInvitations`, `revokeInvitation`.
- Modify `src/lib/server/households.test.ts` — tests for the new household/member functions.
- Modify `src/lib/server/invitations.test.ts` — tests for the new invitation functions.

**i18n:**
- Modify `src/lib/i18n/messages/fr.ts` — new `manage_*` keys (object + `Messages` interface), update `invite_back`.
- Modify `src/lib/i18n/messages/en.ts` — mirror the new keys, update `invite_back`.

**Routes:**
- Create `src/routes/(app)/households/[id]/+page.server.ts` — load + 5 form actions.
- Create `src/routes/(app)/households/[id]/+page.svelte` — the hub UI (4 cards).
- Delete `src/routes/(app)/households/[id]/members/+page.server.ts` and `…/members/+page.svelte`.
- Modify `src/routes/(app)/households/+page.svelte` — link households to `/households/[id]`.
- Modify `src/routes/(app)/households/[id]/invite/+page.svelte` — back-link to `/households/[id]`.

**Invariants enforced in the data layer:** a household always keeps ≥1 admin; targets are verified to belong to the acting admin's household; name 1–80 chars; warn-days integer 0–30.

---

## Task 1: `HouseholdError` + `updateHousehold`

**Files:**
- Modify: `src/lib/server/households.ts`
- Test: `src/lib/server/households.test.ts`

- [ ] **Step 1: Extend test imports**

In `src/lib/server/households.test.ts`, replace the two import lines:

```ts
import { eq, and } from 'drizzle-orm';
import { users, memberships, households, invitations } from './db/schema';
import {
	createHousehold,
	listForUser,
	requireMembership,
	MembershipError,
	updateHousehold,
	deleteHousehold,
	setMemberRole,
	removeMember,
	HouseholdError
} from './households';
```

(Add `import { eq, and } from 'drizzle-orm';` as a new top line; replace the existing `import { users, memberships } from './db/schema';` and the existing `import { createHousehold, … } from './households';` lines with the versions above.)

- [ ] **Step 2: Add an `addMember` helper + `updateHousehold` tests at the end of the file**

```ts
function addMember(householdId: string, userId: string, role: 'admin' | 'member') {
	db.insert(memberships)
		.values({ id: crypto.randomUUID(), householdId, userId, role, joinedAt: new Date() })
		.run();
}

test('updateHousehold changes name and warnDays', () => {
	const h = createHousehold(db, { name: 'Old', ownerId: OWNER_ID });
	const updated = updateHousehold(db, h.id, { name: 'New', warnDays: 7 });
	expect(updated.name).toBe('New');
	expect(updated.warnDays).toBe(7);
	const row = db.select().from(households).where(eq(households.id, h.id)).get();
	expect(row?.name).toBe('New');
	expect(row?.warnDays).toBe(7);
});

test('updateHousehold trims the name', () => {
	const h = createHousehold(db, { name: 'X', ownerId: OWNER_ID });
	expect(updateHousehold(db, h.id, { name: '  Trimmed  ' }).name).toBe('Trimmed');
});

test('updateHousehold rejects empty and oversized names', () => {
	const h = createHousehold(db, { name: 'X', ownerId: OWNER_ID });
	expect(() => updateHousehold(db, h.id, { name: '   ' })).toThrow(HouseholdError);
	expect(() => updateHousehold(db, h.id, { name: 'a'.repeat(81) })).toThrow(HouseholdError);
});

test('updateHousehold rejects out-of-range warnDays', () => {
	const h = createHousehold(db, { name: 'X', ownerId: OWNER_ID });
	expect(() => updateHousehold(db, h.id, { warnDays: 31 })).toThrow(HouseholdError);
	expect(() => updateHousehold(db, h.id, { warnDays: -1 })).toThrow(HouseholdError);
	expect(() => updateHousehold(db, h.id, { warnDays: 1.5 })).toThrow(HouseholdError);
});

test('updateHousehold throws not_found for an unknown id', () => {
	expect(() => updateHousehold(db, 'nope', { name: 'X' })).toThrow(HouseholdError);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `bun test src/lib/server/households.test.ts`
Expected: FAIL — `updateHousehold`/`HouseholdError` are not exported.

- [ ] **Step 4: Implement `HouseholdError` + `updateHousehold` in `households.ts`**

Add after the existing `MembershipError` class (the imports already include `eq, and` and `households, memberships`):

```ts
export class HouseholdError extends Error {
	code: 'invalid' | 'not_found' | 'last_admin';
	constructor(code: 'invalid' | 'not_found' | 'last_admin') {
		const messages = {
			invalid: 'Invalid household data',
			not_found: 'Household or member not found',
			last_admin: 'A household must keep at least one admin'
		};
		super(messages[code]);
		this.code = code;
		this.name = 'HouseholdError';
	}
}

export function updateHousehold(
	db: DB,
	householdId: string,
	patch: { name?: string; warnDays?: number }
) {
	const existing = db.select().from(households).where(eq(households.id, householdId)).get();
	if (!existing) throw new HouseholdError('not_found');

	const set: { name?: string; warnDays?: number } = {};
	if (patch.name !== undefined) {
		const name = patch.name.trim();
		if (name.length < 1 || name.length > 80) throw new HouseholdError('invalid');
		set.name = name;
	}
	if (patch.warnDays !== undefined) {
		if (!Number.isInteger(patch.warnDays) || patch.warnDays < 0 || patch.warnDays > 30) {
			throw new HouseholdError('invalid');
		}
		set.warnDays = patch.warnDays;
	}
	if (Object.keys(set).length > 0) {
		db.update(households).set(set).where(eq(households.id, householdId)).run();
	}
	return { ...existing, ...set };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `bun test src/lib/server/households.test.ts`
Expected: PASS (all `updateHousehold` tests green).

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/households.ts src/lib/server/households.test.ts
git commit -m "feat(households): HouseholdError + updateHousehold with validation"
```

---

## Task 2: `deleteHousehold` (with cascade)

**Files:**
- Modify: `src/lib/server/households.ts`
- Test: `src/lib/server/households.test.ts`

- [ ] **Step 1: Add tests at the end of `households.test.ts`**

```ts
test('deleteHousehold removes the household and cascades memberships + invitations', () => {
	const h = createHousehold(db, { name: 'Doomed', ownerId: OWNER_ID });
	addMember(h.id, MEMBER_ID, 'member');
	db.insert(invitations)
		.values({
			id: crypto.randomUUID(),
			householdId: h.id,
			tokenHash: Buffer.from('x'),
			role: 'member',
			createdBy: OWNER_ID,
			expiresAt: new Date(Date.now() + 100000),
			usedAt: null,
			createdAt: new Date()
		})
		.run();

	deleteHousehold(db, h.id);

	expect(db.select().from(households).where(eq(households.id, h.id)).get()).toBeUndefined();
	expect(db.select().from(memberships).where(eq(memberships.householdId, h.id)).all().length).toBe(0);
	expect(db.select().from(invitations).where(eq(invitations.householdId, h.id)).all().length).toBe(0);
});

test('deleteHousehold throws not_found for an unknown id', () => {
	expect(() => deleteHousehold(db, 'nope')).toThrow(HouseholdError);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `bun test src/lib/server/households.test.ts`
Expected: FAIL — `deleteHousehold` is not exported.

- [ ] **Step 3: Implement `deleteHousehold` in `households.ts`**

Add after `updateHousehold`:

```ts
export function deleteHousehold(db: DB, householdId: string) {
	const existing = db.select().from(households).where(eq(households.id, householdId)).get();
	if (!existing) throw new HouseholdError('not_found');
	db.delete(households).where(eq(households.id, householdId)).run();
}
```

(`PRAGMA foreign_keys = ON` is set in `db/client.ts`, and `memberships`/`invitations`/`inventory_items` reference `households.id` with `onDelete: 'cascade'`, so dependents are removed automatically.)

- [ ] **Step 4: Run to verify pass**

Run: `bun test src/lib/server/households.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/households.ts src/lib/server/households.test.ts
git commit -m "feat(households): deleteHousehold (FK cascade removes dependents)"
```

---

## Task 3: `setMemberRole` + last-admin protection

**Files:**
- Modify: `src/lib/server/households.ts`
- Test: `src/lib/server/households.test.ts`

- [ ] **Step 1: Add tests at the end of `households.test.ts`**

```ts
test('setMemberRole promotes a member to admin', () => {
	const h = createHousehold(db, { name: 'H', ownerId: OWNER_ID });
	addMember(h.id, MEMBER_ID, 'member');
	setMemberRole(db, h.id, MEMBER_ID, 'admin');
	const m = db
		.select()
		.from(memberships)
		.where(and(eq(memberships.householdId, h.id), eq(memberships.userId, MEMBER_ID)))
		.get();
	expect(m?.role).toBe('admin');
});

test('setMemberRole blocks demoting the last admin', () => {
	const h = createHousehold(db, { name: 'H', ownerId: OWNER_ID });
	expect(() => setMemberRole(db, h.id, OWNER_ID, 'member')).toThrow(HouseholdError);
});

test('setMemberRole allows demoting one of several admins', () => {
	const h = createHousehold(db, { name: 'H', ownerId: OWNER_ID });
	addMember(h.id, MEMBER_ID, 'admin');
	setMemberRole(db, h.id, OWNER_ID, 'member');
	const m = db
		.select()
		.from(memberships)
		.where(and(eq(memberships.householdId, h.id), eq(memberships.userId, OWNER_ID)))
		.get();
	expect(m?.role).toBe('member');
});

test('setMemberRole throws not_found for a non-member target', () => {
	const h = createHousehold(db, { name: 'H', ownerId: OWNER_ID });
	expect(() => setMemberRole(db, h.id, MEMBER_ID, 'admin')).toThrow(HouseholdError);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `bun test src/lib/server/households.test.ts`
Expected: FAIL — `setMemberRole`/`countAdmins` not exported.

- [ ] **Step 3: Implement `countAdmins` + `setMemberRole` in `households.ts`**

Add after `deleteHousehold`:

```ts
export function countAdmins(db: DB, householdId: string): number {
	return db
		.select({ userId: memberships.userId })
		.from(memberships)
		.where(and(eq(memberships.householdId, householdId), eq(memberships.role, 'admin')))
		.all().length;
}

export function setMemberRole(
	db: DB,
	householdId: string,
	targetUserId: string,
	role: 'admin' | 'member'
) {
	const membership = db
		.select()
		.from(memberships)
		.where(and(eq(memberships.householdId, householdId), eq(memberships.userId, targetUserId)))
		.get();
	if (!membership) throw new HouseholdError('not_found');

	if (membership.role === 'admin' && role === 'member' && countAdmins(db, householdId) <= 1) {
		throw new HouseholdError('last_admin');
	}

	db.update(memberships)
		.set({ role })
		.where(and(eq(memberships.householdId, householdId), eq(memberships.userId, targetUserId)))
		.run();
}
```

- [ ] **Step 4: Run to verify pass**

Run: `bun test src/lib/server/households.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/households.ts src/lib/server/households.test.ts
git commit -m "feat(households): setMemberRole with last-admin protection"
```

---

## Task 4: `removeMember` + last-admin protection

**Files:**
- Modify: `src/lib/server/households.ts`
- Test: `src/lib/server/households.test.ts`

- [ ] **Step 1: Add tests at the end of `households.test.ts`**

```ts
test('removeMember removes a regular member', () => {
	const h = createHousehold(db, { name: 'H', ownerId: OWNER_ID });
	addMember(h.id, MEMBER_ID, 'member');
	removeMember(db, h.id, MEMBER_ID);
	const m = db
		.select()
		.from(memberships)
		.where(and(eq(memberships.householdId, h.id), eq(memberships.userId, MEMBER_ID)))
		.get();
	expect(m).toBeUndefined();
});

test('removeMember blocks removing the last admin', () => {
	const h = createHousehold(db, { name: 'H', ownerId: OWNER_ID });
	expect(() => removeMember(db, h.id, OWNER_ID)).toThrow(HouseholdError);
});

test('removeMember lets an admin leave when another admin remains', () => {
	const h = createHousehold(db, { name: 'H', ownerId: OWNER_ID });
	addMember(h.id, MEMBER_ID, 'admin');
	removeMember(db, h.id, OWNER_ID);
	expect(
		db
			.select()
			.from(memberships)
			.where(and(eq(memberships.householdId, h.id), eq(memberships.userId, OWNER_ID)))
			.get()
	).toBeUndefined();
	expect(countAdmins(db, h.id)).toBe(1);
});

test('removeMember throws not_found for a non-member target', () => {
	const h = createHousehold(db, { name: 'H', ownerId: OWNER_ID });
	expect(() => removeMember(db, h.id, MEMBER_ID)).toThrow(HouseholdError);
});
```

(Add `countAdmins` to the `./households` import list in this test file.)

- [ ] **Step 2: Run to verify failure**

Run: `bun test src/lib/server/households.test.ts`
Expected: FAIL — `removeMember` not exported.

- [ ] **Step 3: Implement `removeMember` in `households.ts`**

Add after `setMemberRole`:

```ts
export function removeMember(db: DB, householdId: string, targetUserId: string) {
	const membership = db
		.select()
		.from(memberships)
		.where(and(eq(memberships.householdId, householdId), eq(memberships.userId, targetUserId)))
		.get();
	if (!membership) throw new HouseholdError('not_found');

	if (membership.role === 'admin' && countAdmins(db, householdId) <= 1) {
		throw new HouseholdError('last_admin');
	}

	db.delete(memberships)
		.where(and(eq(memberships.householdId, householdId), eq(memberships.userId, targetUserId)))
		.run();
}
```

- [ ] **Step 4: Run to verify pass**

Run: `bun test src/lib/server/households.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/households.ts src/lib/server/households.test.ts
git commit -m "feat(households): removeMember with last-admin protection"
```

---

## Task 5: `listPendingInvitations` + `revokeInvitation`

**Files:**
- Modify: `src/lib/server/invitations.ts`
- Test: `src/lib/server/invitations.test.ts`

- [ ] **Step 1: Extend test imports**

In `src/lib/server/invitations.test.ts`, add `import { eq } from 'drizzle-orm';` and extend the invitations import:

```ts
import {
	createInvitation,
	acceptInvitation,
	InvitationError,
	listPendingInvitations,
	revokeInvitation
} from './invitations';
```

- [ ] **Step 2: Add tests at the end of `invitations.test.ts`**

```ts
test('listPendingInvitations returns only unused, unexpired invites, newest first', () => {
	const pendingNew = createInvitation(db, { householdId, role: 'member', createdBy: OWNER_ID });

	db.insert(invitations)
		.values({
			id: 'inv-expired',
			householdId,
			tokenHash: Buffer.from('expired'),
			role: 'member',
			createdBy: OWNER_ID,
			expiresAt: new Date(Date.now() - 1000),
			usedAt: null,
			createdAt: new Date(Date.now() - 5000)
		})
		.run();

	db.insert(invitations)
		.values({
			id: 'inv-used',
			householdId,
			tokenHash: Buffer.from('used'),
			role: 'member',
			createdBy: OWNER_ID,
			expiresAt: new Date(Date.now() + 100000),
			usedAt: new Date(),
			createdAt: new Date(Date.now() - 4000)
		})
		.run();

	const pending = listPendingInvitations(db, householdId, new Date());
	expect(pending.length).toBe(1);
	expect(pending[0].id).toBe(pendingNew.invitation.id);
});

test('listPendingInvitations excludes invites from other households', () => {
	const other = createHousehold(db, { name: 'Other', ownerId: INVITEE_ID });
	createInvitation(db, { householdId: other.id, role: 'member', createdBy: INVITEE_ID });
	expect(listPendingInvitations(db, householdId, new Date()).length).toBe(0);
});

test('revokeInvitation deletes a pending invite scoped to its household', () => {
	const { invitation } = createInvitation(db, { householdId, role: 'member', createdBy: OWNER_ID });
	revokeInvitation(db, invitation.id, householdId);
	expect(db.select().from(invitations).where(eq(invitations.id, invitation.id)).get()).toBeUndefined();
});

test('revokeInvitation refuses an invite from a different household', () => {
	const other = createHousehold(db, { name: 'Other', ownerId: INVITEE_ID });
	const { invitation } = createInvitation(db, {
		householdId: other.id,
		role: 'member',
		createdBy: INVITEE_ID
	});
	expect(() => revokeInvitation(db, invitation.id, householdId)).toThrow(InvitationError);
});
```

- [ ] **Step 3: Run to verify failure**

Run: `bun test src/lib/server/invitations.test.ts`
Expected: FAIL — `listPendingInvitations`/`revokeInvitation` not exported.

- [ ] **Step 4: Implement in `invitations.ts`**

Add at the end (imports already include `eq, and` and `invitations`):

```ts
export function listPendingInvitations(db: DB, householdId: string, now: Date) {
	return db
		.select()
		.from(invitations)
		.where(eq(invitations.householdId, householdId))
		.all()
		.filter((inv) => inv.usedAt === null && inv.expiresAt.getTime() > now.getTime())
		.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function revokeInvitation(db: DB, invitationId: string, householdId: string) {
	const inv = db
		.select()
		.from(invitations)
		.where(and(eq(invitations.id, invitationId), eq(invitations.householdId, householdId)))
		.get();
	if (!inv || inv.usedAt !== null) throw new InvitationError('not_found');
	db.delete(invitations).where(eq(invitations.id, invitationId)).run();
}
```

- [ ] **Step 5: Run to verify pass**

Run: `bun test src/lib/server/invitations.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/invitations.ts src/lib/server/invitations.test.ts
git commit -m "feat(invitations): listPendingInvitations + revokeInvitation"
```

---

## Task 6: i18n keys

**Files:**
- Modify: `src/lib/i18n/messages/fr.ts` (object + `Messages` interface)
- Modify: `src/lib/i18n/messages/en.ts` (object)

- [ ] **Step 1: Add the new `manage_*` keys to the `fr` object**

Insert these in the `fr` object (e.g. just after `members_back: '← Retour aux foyers',`):

```ts
	// --- Manage household (admin hub) ---
	manage_settings_section: 'Paramètres',
	manage_warn_days_label: 'Jours d’alerte avant péremption',
	manage_settings_saved: 'Paramètres enregistrés.',
	manage_settings_invalid: 'Nom ou nombre de jours invalide.',
	manage_members_section: 'Membres',
	manage_promote: 'Promouvoir admin',
	manage_demote: 'Passer membre',
	manage_remove_member: 'Retirer',
	manage_leave: 'Quitter le foyer',
	manage_last_admin: 'Le foyer doit conserver au moins un admin.',
	manage_member_not_found: 'Membre introuvable.',
	manage_invites_section: 'Invitations en attente',
	manage_invites_empty: 'Aucune invitation en attente.',
	manage_invite_expires: 'expire le',
	manage_invite_revoke: 'Révoquer',
	manage_invite_revoke_failed: 'Impossible de révoquer cette invitation.',
	manage_danger_section: 'Zone de danger',
	manage_delete_warning:
		'Supprimer ce foyer effacera définitivement son inventaire, ses membres et ses invitations. Action irréversible.',
	manage_delete_confirm_label: 'Tapez le nom du foyer pour confirmer',
	manage_delete_button: 'Supprimer le foyer',
	manage_delete_name_mismatch: 'Le nom saisi ne correspond pas.',
	manage_forbidden: 'Action réservée aux admins.',
```

- [ ] **Step 2: Update `invite_back` in the `fr` object**

Change:

```ts
	invite_back: '← Retour aux membres',
```

to:

```ts
	invite_back: '← Retour au foyer',
```

- [ ] **Step 3: Add the same keys to the `Messages` interface in `fr.ts`**

Insert in the interface (e.g. after `members_back: string;`):

```ts
	manage_settings_section: string;
	manage_warn_days_label: string;
	manage_settings_saved: string;
	manage_settings_invalid: string;
	manage_members_section: string;
	manage_promote: string;
	manage_demote: string;
	manage_remove_member: string;
	manage_leave: string;
	manage_last_admin: string;
	manage_member_not_found: string;
	manage_invites_section: string;
	manage_invites_empty: string;
	manage_invite_expires: string;
	manage_invite_revoke: string;
	manage_invite_revoke_failed: string;
	manage_danger_section: string;
	manage_delete_warning: string;
	manage_delete_confirm_label: string;
	manage_delete_button: string;
	manage_delete_name_mismatch: string;
	manage_forbidden: string;
```

- [ ] **Step 4: Add the mirrored keys to the `en` object**

Insert in the `en` object (after `members_back: '← Back to households',`):

```ts
	// --- Manage household (admin hub) ---
	manage_settings_section: 'Settings',
	manage_warn_days_label: 'Warning days before expiry',
	manage_settings_saved: 'Settings saved.',
	manage_settings_invalid: 'Invalid name or number of days.',
	manage_members_section: 'Members',
	manage_promote: 'Make admin',
	manage_demote: 'Make member',
	manage_remove_member: 'Remove',
	manage_leave: 'Leave household',
	manage_last_admin: 'The household must keep at least one admin.',
	manage_member_not_found: 'Member not found.',
	manage_invites_section: 'Pending invitations',
	manage_invites_empty: 'No pending invitations.',
	manage_invite_expires: 'expires',
	manage_invite_revoke: 'Revoke',
	manage_invite_revoke_failed: 'Could not revoke this invitation.',
	manage_danger_section: 'Danger zone',
	manage_delete_warning:
		'Deleting this household permanently removes its inventory, members, and invitations. This cannot be undone.',
	manage_delete_confirm_label: 'Type the household name to confirm',
	manage_delete_button: 'Delete household',
	manage_delete_name_mismatch: 'The name you typed does not match.',
	manage_forbidden: 'Admins only.',
```

- [ ] **Step 5: Update `invite_back` in the `en` object**

Change `invite_back: '← Back to members',` to `invite_back: '← Back to household',`.

- [ ] **Step 6: Verify parity + types**

Run: `bun test src/lib/i18n/i18n.test.ts && npm run check`
Expected: parity test PASS (fr/en identical keys), svelte-check 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/i18n/messages/fr.ts src/lib/i18n/messages/en.ts
git commit -m "i18n(manage): add manage_* keys for the household admin hub"
```

---

## Task 7: Hub page server (`households/[id]/+page.server.ts`)

**Files:**
- Create: `src/routes/(app)/households/[id]/+page.server.ts`

- [ ] **Step 1: Create the file with load + actions**

```ts
import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { dev } from '$app/environment';
import { db, households, memberships, users } from '$lib/server/db';
import {
	MembershipError,
	requireMembership,
	listForUser,
	HouseholdError,
	updateHousehold,
	deleteHousehold,
	setMemberRole,
	removeMember
} from '$lib/server/households';
import { listPendingInvitations, revokeInvitation, InvitationError } from '$lib/server/invitations';
import { m } from '$lib/i18n';
import type { Actions, PageServerLoad } from './$types';

const HOUSEHOLD_COOKIE = 'gm_household';

function setHouseholdCookie(cookies: import('@sveltejs/kit').Cookies, id: string) {
	cookies.set(HOUSEHOLD_COOKIE, id, { path: '/', httpOnly: true, sameSite: 'lax', secure: !dev });
}

function fixActiveHousehold(cookies: import('@sveltejs/kit').Cookies, userId: string) {
	const remaining = listForUser(db, userId);
	if (remaining.length > 0) setHouseholdCookie(cookies, remaining[0].id);
	else cookies.delete(HOUSEHOLD_COOKIE, { path: '/' });
}

function ensureAdmin(id: string, userId: string, t: ReturnType<typeof m>) {
	try {
		requireMembership(db, id, userId, 'admin');
	} catch (e) {
		if (e instanceof MembershipError) throw fail(403, { message: t.manage_forbidden });
		throw e;
	}
}

export const load: PageServerLoad = async ({ params, locals }) => {
	let membership: ReturnType<typeof requireMembership>;
	try {
		membership = requireMembership(db, params.id, locals.user!.id);
	} catch (e) {
		if (e instanceof MembershipError) error(403, 'Accès refusé');
		throw e;
	}

	const household = db.select().from(households).where(eq(households.id, params.id)).get();
	if (!household) error(404, 'Foyer introuvable');

	const members = db
		.select({
			id: users.id,
			displayName: users.displayName,
			email: users.email,
			role: memberships.role,
			joinedAt: memberships.joinedAt
		})
		.from(memberships)
		.innerJoin(users, eq(memberships.userId, users.id))
		.where(eq(memberships.householdId, params.id))
		.all();

	const isAdmin = membership.role === 'admin';
	const pendingInvitations = isAdmin ? listPendingInvitations(db, params.id, new Date()) : [];

	return { household, members, isAdmin, currentUserId: locals.user!.id, pendingInvitations };
};

export const actions: Actions = {
	updateSettings: async ({ params, locals, request }) => {
		const t = m(locals.locale);
		ensureAdmin(params.id, locals.user!.id, t);
		const data = await request.formData();
		const name = (data.get('name') as string | null) ?? '';
		const warnDays = Number((data.get('warnDays') as string | null) ?? '');
		try {
			updateHousehold(db, params.id, { name, warnDays });
		} catch (e) {
			if (e instanceof HouseholdError) return fail(400, { message: t.manage_settings_invalid });
			throw e;
		}
		return { settingsSaved: true };
	},

	setRole: async ({ params, locals, request }) => {
		const t = m(locals.locale);
		ensureAdmin(params.id, locals.user!.id, t);
		const data = await request.formData();
		const userId = (data.get('userId') as string | null) ?? '';
		const role: 'admin' | 'member' = data.get('role') === 'admin' ? 'admin' : 'member';
		try {
			setMemberRole(db, params.id, userId, role);
		} catch (e) {
			if (e instanceof HouseholdError) {
				return fail(400, {
					message: e.code === 'last_admin' ? t.manage_last_admin : t.manage_member_not_found
				});
			}
			throw e;
		}
		redirect(303, `/households/${params.id}`);
	},

	removeMember: async ({ params, locals, request, cookies }) => {
		const t = m(locals.locale);
		ensureAdmin(params.id, locals.user!.id, t);
		const data = await request.formData();
		const userId = (data.get('userId') as string | null) ?? '';
		try {
			removeMember(db, params.id, userId);
		} catch (e) {
			if (e instanceof HouseholdError) {
				return fail(400, {
					message: e.code === 'last_admin' ? t.manage_last_admin : t.manage_member_not_found
				});
			}
			throw e;
		}
		if (userId === locals.user!.id) {
			fixActiveHousehold(cookies, locals.user!.id);
			redirect(303, '/households');
		}
		redirect(303, `/households/${params.id}`);
	},

	revokeInvitation: async ({ params, locals, request }) => {
		const t = m(locals.locale);
		ensureAdmin(params.id, locals.user!.id, t);
		const data = await request.formData();
		const id = (data.get('id') as string | null) ?? '';
		try {
			revokeInvitation(db, id, params.id);
		} catch (e) {
			if (e instanceof InvitationError) return fail(400, { message: t.manage_invite_revoke_failed });
			throw e;
		}
		redirect(303, `/households/${params.id}`);
	},

	deleteHousehold: async ({ params, locals, request, cookies }) => {
		const t = m(locals.locale);
		ensureAdmin(params.id, locals.user!.id, t);
		const household = db.select().from(households).where(eq(households.id, params.id)).get();
		if (!household) error(404, 'Foyer introuvable');
		const data = await request.formData();
		const confirmName = ((data.get('confirmName') as string | null) ?? '').trim();
		if (confirmName !== household.name) {
			return fail(400, { message: t.manage_delete_name_mismatch });
		}
		deleteHousehold(db, params.id);
		if (cookies.get(HOUSEHOLD_COOKIE) === params.id) fixActiveHousehold(cookies, locals.user!.id);
		redirect(303, '/households');
	}
};
```

Note: `ensureAdmin` throws the `fail(...)` ActionFailure so the action returns it; this is valid in SvelteKit (throwing an ActionFailure is handled like returning it). If the executor's lint flags throwing a non-Error, change `ensureAdmin` to return the failure and have each action check it — but the throw form keeps actions terse and is supported.

- [ ] **Step 2: Typecheck**

Run: `npm run check`
Expected: 0 errors (note: `+page.svelte` doesn't exist yet, but the server file type-checks on its own; if `./$types` complains, proceed to Task 8 which creates the page, then re-run).

- [ ] **Step 3: Commit**

```bash
git add "src/routes/(app)/households/[id]/+page.server.ts"
git commit -m "feat(households): manage-hub server load + admin actions"
```

---

## Task 8: Hub page UI (`households/[id]/+page.svelte`)

**Files:**
- Create: `src/routes/(app)/households/[id]/+page.svelte`

- [ ] **Step 1: Create the file**

```svelte
<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { m } from '$lib/i18n';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const t = $derived(m(data.locale));
	const dateLocale = $derived(data.locale === 'en' ? 'en-GB' : 'fr-FR');
	const adminCount = $derived(data.members.filter((mem) => mem.role === 'admin').length);
</script>

<h1>{data.household.name} {t.members_title_suffix}</h1>

{#if form?.message}
	<p class="error" role="alert">{form.message}</p>
{/if}
{#if form?.settingsSaved}
	<p class="success" role="status">{t.manage_settings_saved}</p>
{/if}

<section class="card section">
	<h2>{t.manage_settings_section}</h2>
	{#if data.isAdmin}
		<form method="POST" action="?/updateSettings" class="stack">
			<div class="field">
				<label for="name">{t.households_name_label}</label>
				<input type="text" id="name" name="name" value={data.household.name} required maxlength="80" />
			</div>
			<div class="field">
				<label for="warnDays">{t.manage_warn_days_label}</label>
				<input
					type="number"
					id="warnDays"
					name="warnDays"
					value={data.household.warnDays}
					min="0"
					max="30"
					required
				/>
			</div>
			<button type="submit" class="btn btn-primary">{t.account_save}</button>
		</form>
	{:else}
		<p class="readonly"><span class="muted">{t.households_name_label}:</span> {data.household.name}</p>
		<p class="readonly">
			<span class="muted">{t.manage_warn_days_label}:</span>
			{data.household.warnDays}
		</p>
	{/if}
</section>

<section class="card section">
	<h2>{t.manage_members_section}</h2>
	<ul class="member-list">
		{#each data.members as member (member.id)}
			<li>
				<div class="member-main">
					<strong class="member-name">{member.displayName}</strong>
					<span class="role-badge">{member.role}</span>
				</div>
				<span class="email">{member.email}</span>
				<span class="joined"
					>{t.members_since} {member.joinedAt.toLocaleDateString(dateLocale)}</span
				>

				{#if data.isAdmin}
					<div class="member-actions">
						<form method="POST" action="?/setRole">
							<input type="hidden" name="userId" value={member.id} />
							<input type="hidden" name="role" value={member.role === 'admin' ? 'member' : 'admin'} />
							<button
								type="submit"
								class="btn btn-secondary"
								disabled={member.role === 'admin' && adminCount <= 1}
							>
								{member.role === 'admin' ? t.manage_demote : t.manage_promote}
							</button>
						</form>
						<form method="POST" action="?/removeMember">
							<input type="hidden" name="userId" value={member.id} />
							<button
								type="submit"
								class="btn btn-danger"
								disabled={member.role === 'admin' && adminCount <= 1}
							>
								{member.id === data.currentUserId ? t.manage_leave : t.manage_remove_member}
							</button>
						</form>
					</div>
				{/if}
			</li>
		{/each}
	</ul>
	{#if data.isAdmin}
		<a href="./invite" class="btn btn-primary">{t.members_invite_link}</a>
	{/if}
</section>

{#if data.isAdmin}
	<section class="card section">
		<h2>{t.manage_invites_section}</h2>
		{#if data.pendingInvitations.length === 0}
			<p class="muted">{t.manage_invites_empty}</p>
		{:else}
			<ul class="invite-list">
				{#each data.pendingInvitations as inv (inv.id)}
					<li>
						<span class="role-badge">{inv.role}</span>
						<span class="invite-meta"
							>{t.manage_invite_expires} {inv.expiresAt.toLocaleDateString(dateLocale)}</span
						>
						<form method="POST" action="?/revokeInvitation" class="invite-revoke">
							<input type="hidden" name="id" value={inv.id} />
							<button type="submit" class="btn btn-ghost">{t.manage_invite_revoke}</button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section class="card section">
		<h2>{t.manage_danger_section}</h2>
		<p class="muted">{t.manage_delete_warning}</p>
		<form method="POST" action="?/deleteHousehold" class="stack">
			<div class="field">
				<label for="confirmName">{t.manage_delete_confirm_label}</label>
				<input
					type="text"
					id="confirmName"
					name="confirmName"
					autocomplete="off"
					placeholder={data.household.name}
				/>
			</div>
			<button type="submit" class="btn btn-danger delete-button">{t.manage_delete_button}</button>
		</form>
	</section>
{/if}

<p><a href="/households">{t.members_back}</a></p>

<style>
	.section {
		margin-bottom: 1rem;
	}

	.stack {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
		align-items: flex-start;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		width: 100%;
	}

	.readonly {
		margin: 0.25rem 0;
	}

	.member-list,
	.invite-list {
		list-style: none;
		padding: 0;
		margin: 0 0 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.member-list li {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.7rem 0.85rem;
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}

	.member-main {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.member-name {
		font-weight: 700;
	}

	.role-badge {
		padding: 0.18rem 0.55rem;
		border-radius: var(--radius-pill);
		background: var(--surface);
		color: var(--text-muted);
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.email,
	.joined,
	.invite-meta {
		font-size: 0.85rem;
		color: var(--text-muted);
	}

	.member-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 0.5rem;
	}

	.member-actions .btn {
		padding: 0.4rem 0.8rem;
		font-size: 0.85rem;
	}

	.invite-list li {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.6rem 0.75rem;
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}

	.invite-revoke {
		margin-left: auto;
	}

	.delete-button {
		width: 100%;
	}
</style>
```

- [ ] **Step 2: Run the Svelte autofixer** (via the `svelte` MCP `svelte-autofixer` tool) on this component; apply any fixes it returns, then re-run until clean.

- [ ] **Step 3: Typecheck**

Run: `npm run check`
Expected: 0 errors, 0 warnings.

- [ ] **Step 4: Commit**

```bash
git add "src/routes/(app)/households/[id]/+page.svelte"
git commit -m "feat(households): manage-hub UI (settings, members, invites, danger zone)"
```

---

## Task 9: Retire the members page + relink

**Files:**
- Delete: `src/routes/(app)/households/[id]/members/+page.svelte`
- Delete: `src/routes/(app)/households/[id]/members/+page.server.ts`
- Modify: `src/routes/(app)/households/+page.svelte`
- Modify: `src/routes/(app)/households/[id]/invite/+page.svelte`

- [ ] **Step 1: Delete the members route**

```bash
git rm "src/routes/(app)/households/[id]/members/+page.svelte" "src/routes/(app)/households/[id]/members/+page.server.ts"
```

- [ ] **Step 2: Relink the households list**

In `src/routes/(app)/households/+page.svelte`, change:

```svelte
<a href="/households/{h.id}/members" class="household-name">{h.name}</a>
```

to:

```svelte
<a href="/households/{h.id}" class="household-name">{h.name}</a>
```

- [ ] **Step 3: Fix the invite back-link**

In `src/routes/(app)/households/[id]/invite/+page.svelte`, change the back link from `/households/{data.householdId}/members` to `/households/{data.householdId}`.

- [ ] **Step 4: Confirm no dangling references to the members route remain**

Run: `grep -rn "/members" src/routes src/lib --include="*.svelte" --include="*.ts"`
Expected: no results (the `members_*` i18n keys remain, but they are now used by the hub page).

- [ ] **Step 5: Verify keys still referenced (no orphans)**

Run: `grep -rn "members_title_suffix\|members_since\|members_invite_link\|members_back" src/routes --include="*.svelte"`
Expected: all four appear in the hub `households/[id]/+page.svelte`.

- [ ] **Step 6: Typecheck**

Run: `npm run check`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(households): retire members page, relink to manage hub"
```

---

## Task 10: Full verification

- [ ] **Step 1: Run the full suite + lint + typecheck**

Run: `bun test && npm run check && npm run lint`
Expected: all tests pass (existing 228 + the new data-layer tests), svelte-check 0/0, Prettier + ESLint clean. If Prettier flags formatting, run `npm run format` and re-commit.

- [ ] **Step 2: Visual smoke test (optional, harness)**

Because the hub is auth-gated, render it via a self-contained HTML harness against `src/app.css` at a phone width (390px) in light + dark, mirroring the four cards, to confirm the danger-zone delete button and member-action buttons read clearly. (Same technique used for the account page; serve a temp dir over `http.server` since `file://` is blocked, then clean up the temp files and any `.playwright-mcp`/screenshot artifacts.)

- [ ] **Step 3: Final confirmation**

Confirm: settings save shows the success banner; promote/demote and remove are disabled on the last admin; revoke removes a pending invite; delete requires the exact name and redirects to `/households`. Report results; do not push unless the user asks.

---

## Self-review notes

- **Spec coverage:** Household update → Task 1/7/8; delete → Task 2/7/8; member role/remove → Tasks 3/4/7/8; invitations list/revoke → Tasks 5/7/8; authz → Task 7 (`ensureAdmin` + `requireMembership`); last-admin invariant → Tasks 3/4 (data layer) + Task 8 (disabled controls); type-to-confirm delete + cookie fix → Task 7; i18n → Task 6; retire members page → Task 9.
- **Type consistency:** `HouseholdError` codes (`invalid | not_found | last_admin`) used identically across data layer and actions; `setMemberRole`/`removeMember`/`updateHousehold`/`deleteHousehold`/`listPendingInvitations`/`revokeInvitation` signatures match between definition (Tasks 1–5) and call sites (Task 7).
- **No placeholders:** every step contains the actual code or command.
