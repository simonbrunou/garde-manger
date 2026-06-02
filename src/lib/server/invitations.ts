import { createHash, randomBytes } from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import type { DB } from './db/client';
import { invitations, memberships, households } from './db/schema';

const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function sha256(s: string): Buffer {
	return createHash('sha256').update(s).digest();
}

function randomToken(): string {
	return randomBytes(24).toString('base64url');
}

export class InvitationError extends Error {
	code: 'not_found' | 'already_used' | 'expired';
	constructor(code: 'not_found' | 'already_used' | 'expired') {
		const messages = {
			not_found: 'Invitation not found',
			already_used: 'Invitation has already been used',
			expired: 'Invitation has expired'
		};
		super(messages[code]);
		this.code = code;
		this.name = 'InvitationError';
	}
}

export function createInvitation(
	db: DB,
	{
		householdId,
		role,
		createdBy
	}: { householdId: string; role: 'admin' | 'member'; createdBy: string }
) {
	const token = randomToken();
	const now = new Date();
	const invitation = {
		id: crypto.randomUUID(),
		householdId,
		tokenHash: sha256(token),
		role,
		createdBy,
		expiresAt: new Date(now.getTime() + INVITE_TTL_MS),
		usedAt: null as Date | null,
		createdAt: now
	};

	db.insert(invitations).values(invitation).run();

	return { token, invitation };
}

/** Look up an invitation by its raw token via the indexed token_hash column. */
function findByToken(db: DB, token: string) {
	return (
		db
			.select()
			.from(invitations)
			.where(eq(invitations.tokenHash, sha256(token)))
			.get() ?? null
	);
}

/** Validate an invitation without consuming it. Throws InvitationError if unusable. */
function requireUsableInvitation(db: DB, token: string) {
	const invite = findByToken(db, token);
	if (!invite) throw new InvitationError('not_found');
	if (invite.usedAt !== null) throw new InvitationError('already_used');
	if (invite.expiresAt.getTime() < Date.now()) throw new InvitationError('expired');
	return invite;
}

/**
 * Read-only preview of a pending invitation for the confirmation screen.
 * Does NOT consume the token — acceptance happens via {@link acceptInvitation}
 * from a POST action so the single-use token cannot be burned by a GET/prefetch.
 */
export function previewInvitation(db: DB, token: string) {
	const invite = requireUsableInvitation(db, token);
	const household = db
		.select({ name: households.name })
		.from(households)
		.where(eq(households.id, invite.householdId))
		.get();
	return {
		householdId: invite.householdId,
		householdName: household?.name ?? '',
		role: invite.role
	};
}

export function acceptInvitation(db: DB, { token, userId }: { token: string; userId: string }) {
	const invite = requireUsableInvitation(db, token);

	return db.transaction((tx) => {
		const now = new Date();

		// Check if the user is already a member of this household.
		const existing = tx
			.select()
			.from(memberships)
			.where(and(eq(memberships.householdId, invite.householdId), eq(memberships.userId, userId)))
			.get();

		if (existing) {
			// Idempotent: mark invite used but don't insert a duplicate membership.
			tx.update(invitations).set({ usedAt: now }).where(eq(invitations.id, invite.id)).run();
			return existing;
		}

		// Insert the membership with the invite's role.
		const membership = {
			id: crypto.randomUUID(),
			householdId: invite.householdId,
			userId,
			role: invite.role,
			joinedAt: now
		};
		tx.insert(memberships).values(membership).run();

		// Mark the invitation as used.
		tx.update(invitations).set({ usedAt: now }).where(eq(invitations.id, invite.id)).run();

		return membership;
	});
}

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
