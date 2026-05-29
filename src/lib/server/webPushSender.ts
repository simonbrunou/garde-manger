import webpush from 'web-push';
import type { PushSender } from './push';

/**
 * Production `PushSender` backed by the `web-push` library. Kept deliberately
 * thin (it just wraps the network lib) and therefore NOT unit-tested — `push.ts`
 * is exercised with a fake sender instead.
 */
export const webPushSender: PushSender = {
	async send(target, payload, { vapid, ttl }) {
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
					contentEncoding: 'aes128gcm'
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
