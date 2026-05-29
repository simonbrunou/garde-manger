import { createHash, randomBytes } from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import type { DB } from './db/client';
import { invitations, memberships } from './db/schema';

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

export function acceptInvitation(db: DB, { token, userId }: { token: string; userId: string }) {
	const hash = sha256(token);

	// Look up by tokenHash. We compare as hex strings since Buffer comparison needs care.
	const allInvites = db.select().from(invitations).all();
	const invite = allInvites.find((inv) => {
		const stored = inv.tokenHash as Buffer;
		return stored.length === hash.length && stored.equals(hash);
	});

	if (!invite) {
		throw new InvitationError('not_found');
	}

	if (invite.usedAt !== null) {
		throw new InvitationError('already_used');
	}

	if (invite.expiresAt.getTime() < Date.now()) {
		throw new InvitationError('expired');
	}

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
