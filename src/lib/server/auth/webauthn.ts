import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import { randomBytes } from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import {
	generateRegistrationOptions,
	verifyRegistrationResponse,
	generateAuthenticationOptions,
	verifyAuthenticationResponse
} from '@simplewebauthn/server';
import type {
	RegistrationResponseJSON,
	AuthenticationResponseJSON,
	AuthenticatorTransportFuture
} from '@simplewebauthn/server';
import type { DB } from '../db/client';
import { credentials, users } from '../db/schema';

// ---------------------------------------------------------------------------
// Config — sourced from environment at module load time; safe to tree-shake
// ---------------------------------------------------------------------------
const RP_ID = env.RP_ID ?? 'localhost';
const RP_NAME = env.RP_NAME ?? 'Garde-Manger';
const ORIGIN = env.ORIGIN ?? 'http://localhost:5173';

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type User = typeof users.$inferSelect;

// ---------------------------------------------------------------------------
// Config guard — fails loudly in production when required env vars are missing
// ---------------------------------------------------------------------------

function assertConfig() {
	if (!dev && (!env.RP_ID || !env.ORIGIN)) {
		throw new Error('WebAuthn requires RP_ID and ORIGIN in production');
	}
}

// ---------------------------------------------------------------------------
// 1. Registration options
//    Returns the options object. The caller is responsible for storing
//    options.challenge (e.g. in the session) for single-use verification.
// ---------------------------------------------------------------------------

export async function registrationOptions(db: DB, user: User) {
	assertConfig();
	// Fetch credentials the user already has so we can exclude them
	const existingCredentials = db
		.select({ credentialId: credentials.credentialId, transports: credentials.transports })
		.from(credentials)
		.where(eq(credentials.userId, user.id))
		.all();

	const options = await generateRegistrationOptions({
		rpName: RP_NAME,
		rpID: RP_ID,
		userName: user.email,
		userDisplayName: user.displayName,
		// userID must be a Uint8Array in v13
		userID: new TextEncoder().encode(user.id),
		attestationType: 'none',
		excludeCredentials: existingCredentials.map((c) => ({
			id: c.credentialId,
			transports: c.transports
				? (JSON.parse(c.transports) as AuthenticatorTransportFuture[])
				: undefined
		})),
		authenticatorSelection: {
			residentKey: 'preferred',
			userVerification: 'preferred'
		}
	});

	return options;
}

// ---------------------------------------------------------------------------
// 2. Verify registration response + persist credential row
//    expectedChallenge is the value the caller retrieved from the session.
//    Duplicates are handled gracefully (unique constraint → return not-verified).
// ---------------------------------------------------------------------------

export async function verifyRegistration(
	db: DB,
	{
		user,
		response,
		expectedChallenge,
		deviceLabel
	}: {
		user: User;
		response: RegistrationResponseJSON;
		expectedChallenge: string;
		deviceLabel?: string;
	}
): Promise<{ verified: boolean }> {
	const result = await verifyRegistrationResponse({
		response,
		expectedChallenge,
		expectedOrigin: ORIGIN,
		expectedRPID: RP_ID
	});

	if (!result.verified || !result.registrationInfo) {
		return { verified: false };
	}

	// v13: registrationInfo.credential is a WebAuthnCredential
	// shape: { id: Base64URLString, publicKey: Uint8Array_, counter: number, transports? }
	const { credential, credentialBackedUp } = result.registrationInfo;

	try {
		db.insert(credentials)
			.values({
				id: randomBytes(16).toString('hex'),
				userId: user.id,
				credentialId: credential.id, // Base64URL string
				publicKey: Buffer.from(credential.publicKey), // BLOB buffer
				counter: credential.counter,
				transports: JSON.stringify(response.response.transports ?? []),
				backedUp: credentialBackedUp,
				deviceLabel: deviceLabel ?? null,
				createdAt: new Date(),
				lastUsedAt: null
			})
			.run();
	} catch (err: unknown) {
		// Unique constraint violation on credentialId → duplicate, return gracefully
		const msg = err instanceof Error ? err.message : String(err);
		if (msg.includes('UNIQUE constraint') || msg.includes('unique constraint')) {
			return { verified: false };
		}
		throw err;
	}

	return { verified: true };
}

// ---------------------------------------------------------------------------
// 3. Authentication options (usernameless / discoverable credentials)
//    Returns the options. The caller stores options.challenge for single-use.
// ---------------------------------------------------------------------------

export async function authenticationOptions(_db: DB) {
	assertConfig();
	const options = await generateAuthenticationOptions({
		rpID: RP_ID,
		userVerification: 'preferred',
		allowCredentials: [] // empty → usernameless / resident-key flow
	});

	return options;
}

// ---------------------------------------------------------------------------
// 4. Verify authentication response
//    expectedChallenge is the value the caller retrieved from the session.
//    SimpleWebAuthn already rejects a regressed counter; we do not weaken that.
// ---------------------------------------------------------------------------

export async function verifyAuthentication(
	db: DB,
	{
		response,
		expectedChallenge
	}: {
		response: AuthenticationResponseJSON;
		expectedChallenge: string;
	}
): Promise<{ verified: boolean; userId?: string }> {
	// Look up stored credential by its base64url id
	const cred = db.select().from(credentials).where(eq(credentials.credentialId, response.id)).get();

	if (!cred) {
		return { verified: false };
	}

	let result;
	try {
		result = await verifyAuthenticationResponse({
			response,
			expectedChallenge,
			expectedOrigin: ORIGIN,
			expectedRPID: RP_ID,
			// v13: credential is WebAuthnCredential { id, publicKey, counter, transports }
			credential: {
				id: cred.credentialId,
				publicKey: new Uint8Array(cred.publicKey as Buffer),
				counter: cred.counter,
				transports: JSON.parse(cred.transports ?? '[]')
			}
		});
	} catch (err) {
		// verifyAuthenticationResponse throws on counter regression / verification failure
		console.error('[webauthn] authentication verify failed:', err);
		return { verified: false };
	}

	if (!result.verified) {
		return { verified: false };
	}

	const now = new Date();

	// Update counter + lastUsedAt on success
	db.update(credentials)
		.set({
			counter: result.authenticationInfo.newCounter,
			lastUsedAt: now
		})
		.where(eq(credentials.credentialId, cred.credentialId))
		.run();

	return { verified: true, userId: cred.userId };
}

// ---------------------------------------------------------------------------
// 5. Helpers for the account management page
// ---------------------------------------------------------------------------

export function listCredentials(db: DB, userId: string) {
	return db
		.select({
			id: credentials.id,
			credentialId: credentials.credentialId,
			deviceLabel: credentials.deviceLabel,
			backedUp: credentials.backedUp,
			createdAt: credentials.createdAt,
			lastUsedAt: credentials.lastUsedAt
		})
		.from(credentials)
		.where(eq(credentials.userId, userId))
		.all();
}

/** Only deletes the credential if it belongs to the requesting user. */
export function deleteCredential(db: DB, { id, userId }: { id: string; userId: string }) {
	return db
		.delete(credentials)
		.where(and(eq(credentials.id, id), eq(credentials.userId, userId)))
		.run();
}
