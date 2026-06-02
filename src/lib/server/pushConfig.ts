import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';

/**
 * Server-only VAPID config for Web Push. Keeps keys out of the pure `push.ts`
 * module (which receives them as args) so that stays unit-testable.
 *
 * In production, all three VAPID values are REQUIRED (we throw otherwise, like
 * the WebAuthn `assertConfig` guard). In dev we fall back to a throwaway keypair
 * so the flow works locally without setup.
 */

export interface Vapid {
	publicKey: string;
	privateKey: string;
	subject: string;
}

// DEV-ONLY throwaway keypair. It can only deliver push to subscriptions created
// with this same public key (i.e. your local browser) and has no bearing on
// production, which MUST set VAPID_* env vars. Generate prod keys with:
//   bunx web-push generate-vapid-keys
const DEV_VAPID_PUBLIC =
	'BPrdp9khG8zONp84LcJv8AauDJ4aHk2dSUL5HbhQKcL7hl7YnfkjaKZdO2-H_ptuZWth0BIKofG6cTOIPhR90NA';
const DEV_VAPID_PRIVATE = 'jKQSbVbgB0Nl-fcSHFT24MBUHoqlH3_Qg1xyH03Z0A4';
const DEV_VAPID_SUBJECT = 'mailto:dev@garde-manger.local';

export function getVapid(): Vapid {
	const publicKey = env.VAPID_PUBLIC_KEY ?? '';
	const privateKey = env.VAPID_PRIVATE_KEY ?? '';
	const subject = env.VAPID_SUBJECT ?? '';

	if (!dev && (!publicKey || !privateKey || !subject)) {
		throw new Error(
			'Web Push requires VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT in production'
		);
	}

	return {
		publicKey: publicKey || DEV_VAPID_PUBLIC,
		privateKey: privateKey || DEV_VAPID_PRIVATE,
		subject: subject || DEV_VAPID_SUBJECT
	};
}

/** The VAPID public key is safe to expose to the browser (needed to subscribe). */
export function vapidPublicKey(): string {
	const publicKey = env.VAPID_PUBLIC_KEY ?? '';
	// Mirror getVapid(): never let the dev key leak into production, where it would
	// silently produce subscriptions the prod private key can't deliver to.
	if (!dev && !publicKey) {
		throw new Error('Web Push requires VAPID_PUBLIC_KEY in production');
	}
	return publicKey || DEV_VAPID_PUBLIC;
}
