import { test, expect, mock, spyOn, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
	SimpleWebAuthnError,
	verifyAuthenticationResponse,
	verifyRegistrationResponse
} from '@simplewebauthn/server';
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/server';
import { isoBase64URL, isoCBOR, isoUint8Array, toHash } from '@simplewebauthn/server/helpers';
import type { Database } from 'bun:sqlite';
import { createDb, runMigrations, type DB } from '../db/client';
import { credentials, users } from '../db/schema';
import { webauthnFailureCategory, type WebauthnFailureCategory } from './webauthnFailure';

// webauthn.ts reads its config from $app/env/private, which only SvelteKit
// provides, so stub both $app modules before importing it.
const RP_ID = 'localhost';
const ORIGIN = 'http://localhost:5173';
mock.module('$app/env/private', () => ({ RP_ID, ORIGIN }));
mock.module('$app/env', () => ({ dev: true }));
const { verifyRegistration, verifyAuthentication } = await import('./webauthn');

const CHALLENGE = 'expected-challenge-SECRET';
const CREDENTIAL_ID = 'AQIDBA';
const UP = 0x01;
const UV = 0x04;

function clientDataJSON(type: string, fields: Record<string, unknown> = {}) {
	return isoBase64URL.fromUTF8String(
		JSON.stringify({ type, challenge: CHALLENGE, origin: ORIGIN, ...fields })
	);
}

// Authenticator data: SHA-256 of the RP ID, the flags byte, a 4-byte counter.
async function authData({ rpId = RP_ID, flags = UP | UV, counter = 1 } = {}) {
	const count = new Uint8Array(4);
	new DataView(count.buffer).setUint32(0, counter);
	return isoUint8Array.concat([
		await toHash(isoUint8Array.fromASCIIString(rpId)),
		Uint8Array.of(flags),
		count
	]);
}

type ResponseFields = {
	clientData?: Record<string, unknown>;
	rpId?: string;
	flags?: number;
	counter?: number;
};

async function registrationResponse({
	clientData,
	...data
}: ResponseFields = {}): Promise<RegistrationResponseJSON> {
	const attestationObject = isoCBOR.encode(
		new Map<string, Parameters<typeof isoCBOR.encode>[0]>([
			['fmt', 'none'],
			['attStmt', new Map()],
			['authData', await authData(data)]
		])
	);
	return {
		id: CREDENTIAL_ID,
		rawId: CREDENTIAL_ID,
		type: 'public-key',
		response: {
			clientDataJSON: clientDataJSON('webauthn.create', clientData),
			attestationObject: isoBase64URL.fromBuffer(attestationObject)
		},
		clientExtensionResults: {}
	};
}

async function authenticationResponse({
	clientData,
	...data
}: ResponseFields = {}): Promise<AuthenticationResponseJSON> {
	return {
		id: CREDENTIAL_ID,
		rawId: CREDENTIAL_ID,
		type: 'public-key',
		response: {
			clientDataJSON: clientDataJSON('webauthn.get', clientData),
			authenticatorData: isoBase64URL.fromBuffer(await authData(data)),
			signature: 'AQID'
		},
		clientExtensionResults: {}
	};
}

// What the real library throws for a response, so a release that rewords a
// message or drops an error code turns these tests red instead of logging `other`.
async function thrown(call: () => Promise<unknown>): Promise<unknown> {
	try {
		await call();
	} catch (err) {
		return err;
	}
	throw new Error('expected @simplewebauthn/server to reject the response');
}

const verifyOptions = {
	expectedChallenge: CHALLENGE,
	expectedOrigin: ORIGIN,
	expectedRPID: RP_ID,
	requireUserVerification: true
};

async function registrationError(fields: ResponseFields) {
	const response = await registrationResponse(fields);
	return thrown(() => verifyRegistrationResponse({ ...verifyOptions, response }));
}

async function authenticationError(fields: ResponseFields, storedCounter = 0) {
	const response = await authenticationResponse(fields);
	return thrown(() =>
		verifyAuthenticationResponse({
			...verifyOptions,
			response,
			credential: { id: CREDENTIAL_ID, publicKey: Uint8Array.of(1), counter: storedCounter }
		})
	);
}

test.each<[string, WebauthnFailureCategory, () => Promise<unknown>]>([
	['registration', 'challenge', () => registrationError({ clientData: { challenge: 'other' } })],
	[
		'authentication',
		'challenge',
		() => authenticationError({ clientData: { challenge: 'other' } })
	],
	[
		'registration',
		'origin',
		() => registrationError({ clientData: { origin: 'https://evil.test' } })
	],
	[
		'authentication',
		'origin',
		() => authenticationError({ clientData: { origin: 'https://evil.test' } })
	],
	[
		'authentication (cross-origin top origin)',
		'origin',
		() => authenticationError({ clientData: { crossOrigin: true, topOrigin: 'https://evil.test' } })
	],
	[
		'authentication (same-origin top origin)',
		'origin',
		() => authenticationError({ clientData: { topOrigin: 'https://evil.test' } })
	],
	['registration', 'rp-id', () => registrationError({ rpId: 'evil.test' })],
	['authentication', 'rp-id', () => authenticationError({ rpId: 'evil.test' })],
	['registration (no presence)', 'user-verification', () => registrationError({ flags: 0 })],
	['registration (no verification)', 'user-verification', () => registrationError({ flags: UP })],
	['authentication (no presence)', 'user-verification', () => authenticationError({ flags: 0 })],
	[
		'authentication (no verification)',
		'user-verification',
		() => authenticationError({ flags: UP })
	],
	['authentication', 'counter', () => authenticationError({ counter: 4 }, 5)]
])('a library %s failure maps to %s', async (_, category, failure) => {
	expect(webauthnFailureCategory(await failure())).toBe(category);
});

test('a challenge mismatch with a newline in the sent challenge maps to challenge', () => {
	const err = new Error('Unexpected registration response challenge "a\nb", expected "SECRET"');
	expect(webauthnFailureCategory(err)).toBe('challenge');
});

test('an error with code UNEXPECTED_ORIGIN maps to origin', () => {
	const err = new SimpleWebAuthnError({ message: 'anything', code: 'UNEXPECTED_ORIGIN' });
	expect(webauthnFailureCategory(err)).toBe('origin');
});

test.each([
	['an unrecognised message', new Error('Unsupported Attestation Format: x')],
	['another error code', new SimpleWebAuthnError({ message: 'x', code: 'BAD_ARGUMENT' })],
	['a thrown string', 'Unexpected registration response challenge "a", expected "b"'],
	['a thrown object with a code', { code: 'UNEXPECTED_ORIGIN' }]
])('%s maps to other', (_, err) => {
	expect(webauthnFailureCategory(err)).toBe('other');
});

// The verify catch blocks in webauthn.ts log a fixed prefix and the category,
// never the library's error, which holds the expected challenge (#108).

let dir: string;
let db: DB;
let sqlite: Database;
let consoleError: ReturnType<typeof spyOn<Console, 'error'>>;
const user = {
	id: 'user-1',
	email: 'alice@example.com',
	displayName: 'Alice',
	locale: 'fr' as const,
	createdAt: new Date()
};

beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), 'gm-webauthn-'));
	({ db, sqlite } = createDb(join(dir, 'test.db')));
	runMigrations(db);
	db.insert(users).values(user).run();
	db.insert(credentials)
		.values({
			id: 'cred-1',
			userId: user.id,
			credentialId: CREDENTIAL_ID,
			publicKey: Buffer.from([1]),
			counter: 0,
			createdAt: new Date()
		})
		.run();
	consoleError = spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	consoleError.mockRestore();
	sqlite.close();
	rmSync(dir, { recursive: true, force: true });
});

const forged = { challenge: 'sent\nFORGED LOG LINE' };

test('a failed registration verify logs the category alone', async () => {
	const row = db.select().from(users).get()!;
	const result = await verifyRegistration(db, {
		user: row,
		response: await registrationResponse({ clientData: forged }),
		expectedChallenge: 'cookie-challenge-SECRET'
	});
	expect(result).toEqual({ verified: false });
	expect(consoleError.mock.calls).toEqual([['[webauthn] registration verify failed: challenge']]);
});

test('a failed authentication verify logs the category alone', async () => {
	const result = await verifyAuthentication(db, {
		response: await authenticationResponse({ clientData: forged }),
		expectedChallenge: 'cookie-challenge-SECRET'
	});
	expect(result).toEqual({ verified: false });
	expect(consoleError.mock.calls).toEqual([['[webauthn] authentication verify failed: challenge']]);
});
