import { Agent } from 'node:https';
import { isIP, type LookupFunction } from 'node:net';
import * as webpush from 'web-push';
import type { PushSender } from './push';

/**
 * A DNS lookup that answers `addresses` and never asks the system resolver. An
 * empty list fails as ENOTFOUND. Node and Bun call it in two forms: with
 * `all: true` it answers `[{ address, family }]`, otherwise one `address, family`.
 */
function pinnedLookup(addresses: readonly string[]): LookupFunction {
	const answers = addresses.map((address) => ({ address, family: isIP(address) }));
	return (hostname, options, callback) => {
		if (answers.length === 0) {
			const err: NodeJS.ErrnoException = new Error(`getaddrinfo ENOTFOUND ${hostname}`);
			err.code = 'ENOTFOUND';
			callback(err, '', 0);
		} else if (options.all) {
			callback(null, answers);
		} else {
			callback(null, answers[0].address, answers[0].family);
		}
	};
}

/**
 * Production `PushSender` backed by the `web-push` library. When the send-time
 * SSRF check approved addresses, each send gets its own `https.Agent` whose
 * lookup answers only those addresses, so the request makes no DNS lookup of its
 * own (DNS rebinding) and one send's addresses never serve another. TLS still
 * checks the certificate against the endpoint's hostname, which is also the SNI.
 * `webPushSender.test.ts` checks that pin over a local TCP listener, and that
 * web-push's own errors reach the caller.
 */
export const webPushSender: PushSender = {
	async send(target, payload, { vapid, ttl, addresses }) {
		try {
			const res = await webpush.sendNotification(
				{ endpoint: target.endpoint, keys: target.keys },
				payload,
				{
					vapidDetails: {
						subject: vapid.subject,
						publicKey: vapid.publicKey,
						privateKey: vapid.privateKey
					},
					TTL: ttl ?? 86400,
					contentEncoding: 'aes128gcm',
					// Bound each request so one slow push service can't stall the daily
					// cron fan-out; a timeout surfaces as a thrown error → soft 'failed'.
					timeout: 10_000,
					// web-push uses `agent` only when it is an https.Agent instance.
					...(addresses && { agent: new Agent({ lookup: pinnedLookup(addresses) }) })
				}
			);
			return res.statusCode;
		} catch (e: unknown) {
			// web-push throws WebPushError carrying a numeric statusCode when the
			// push service rejects (404/410/etc) — surface that as the result.
			if (
				e &&
				typeof e === 'object' &&
				'statusCode' in e &&
				typeof (e as { statusCode: unknown }).statusCode === 'number'
			) {
				return (e as { statusCode: number }).statusCode;
			}
			throw e; // truly unexpected (programmer error) — let it surface
		}
	}
};
