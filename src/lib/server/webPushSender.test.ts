import { describe, it, expect } from 'bun:test';
import { webPushSender } from './webPushSender';

// No network: an empty payload skips encryption and an invalid VAPID subject
// makes `web-push` reject before it opens a connection. This loads the real
// library through the module (web-push 4 is ESM-only, so a default import fails
// at load time) and checks that its own errors reach the caller.
describe('webPushSender', () => {
	it("rethrows web-push's own error when it rejects without a status code", async () => {
		await expect(
			webPushSender.send(
				{ endpoint: 'https://push.example.test/sub', keys: { p256dh: 'p', auth: 'a' } },
				'',
				{ vapid: { subject: 'not a url', publicKey: 'pub', privateKey: 'priv' } }
			)
		).rejects.toThrow('Vapid subject is not a valid URL');
	});
});
