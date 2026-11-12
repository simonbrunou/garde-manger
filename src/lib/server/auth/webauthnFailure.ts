// What a failed passkey verify logs. @simplewebauthn/server puts the expected
// challenge and fields of the request in its error messages, so the verify catch
// blocks in webauthn.ts log one of these categories and never the error (#108).
export type WebauthnFailureCategory =
	'challenge' | 'origin' | 'rp-id' | 'user-verification' | 'counter' | 'other';

// Apart from origin and RP ID mismatches, which throw a SimpleWebAuthnError with
// a code, the failures throw a plain Error that only its message tells apart. Each
// prefix is fixed library text that ends before any request field, so a request
// cannot choose its category. Messages as of @simplewebauthn/server 14.1.0.
const MESSAGE_PREFIXES: [string, WebauthnFailureCategory][] = [
	['Unexpected registration response challenge "', 'challenge'],
	['Unexpected authentication response challenge "', 'challenge'],
	['Detected cross-origin authentication response from top origin of "', 'origin'],
	['Unexpected top origin of "', 'origin'],
	['User presence was required, but user was not present', 'user-verification'],
	['User verification was required, but user could not be verified', 'user-verification'],
	['User not present during authentication', 'user-verification'],
	['User verification required, but user could not be verified', 'user-verification'],
	['Response counter value ', 'counter']
];

export function webauthnFailureCategory(err: unknown): WebauthnFailureCategory {
	if (!(err instanceof Error)) return 'other';
	const code = (err as { code?: unknown }).code;
	if (code === 'UNEXPECTED_ORIGIN') return 'origin';
	if (code === 'UNEXPECTED_RP_ID') return 'rp-id';
	const match = MESSAGE_PREFIXES.find(([prefix]) => err.message.startsWith(prefix));
	return match ? match[1] : 'other';
}
