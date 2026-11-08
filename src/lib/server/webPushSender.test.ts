import { describe, it, expect } from 'bun:test';
import { createServer, type AddressInfo } from 'node:net';
import * as webpush from 'web-push';
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

// ── Address pin (DNS rebinding) ─────────────────────────────────────────────

/** The host name a TLS ClientHello record carries in its SNI extension, or null. */
function readSni(rec: Buffer): string | null {
	if (rec[0] !== 0x16 || rec[5] !== 0x01) return null; // handshake record, ClientHello
	let i = 5 + 4 + 2 + 32; // record header, handshake header, version, random
	i += 1 + rec[i]; // session id
	i += 2 + rec.readUInt16BE(i); // cipher suites
	i += 1 + rec[i]; // compression methods
	const end = i + 2 + rec.readUInt16BE(i);
	i += 2;
	while (i + 4 <= end) {
		// server_name: list length (2), name type (1), name length (2), name
		if (rec.readUInt16BE(i) === 0)
			return rec.toString('ascii', i + 9, i + 9 + rec.readUInt16BE(i + 7));
		i += 4 + rec.readUInt16BE(i + 2);
	}
	return null;
}

/**
 * A plain TCP listener (no certificate): records the SNI of each ClientHello it
 * receives, then drops the connection so the send fails at once.
 */
async function sniListener(address: string, port = 0) {
	const snis: (string | null)[] = [];
	const server = createServer((socket) => {
		let buf = Buffer.alloc(0);
		socket.on('error', () => {});
		socket.on('data', (chunk: Buffer) => {
			buf = Buffer.concat([buf, chunk]);
			if (buf.length < 5 || buf.length < 5 + buf.readUInt16BE(3)) return; // record not whole yet
			snis.push(readSni(buf));
			socket.destroy();
		});
	});
	await new Promise<void>((resolve, reject) => {
		server.once('error', reject);
		server.listen(port, address, resolve);
	});
	return {
		port: (server.address() as AddressInfo).port,
		snis,
		close: () => new Promise<void>((resolve) => server.close(() => resolve()))
	};
}

const vapidKeys = webpush.generateVAPIDKeys();
const VAPID = { subject: 'mailto:test@example.test', ...vapidKeys };

/** Send to `endpoint`, pinned to `addresses`; the listener drops it, so it rejects. */
function pinnedSend(endpoint: string, addresses: string[]) {
	return webPushSender.send({ endpoint, keys: { p256dh: 'p', auth: 'a' } }, '', {
		vapid: VAPID,
		addresses
	});
}

// `.test` names never resolve, so a send reaches a listener only through the pin.
describe('webPushSender address pin', () => {
	it('connects to the approved address, with the endpoint hostname as SNI', async () => {
		const listener = await sniListener('127.0.0.1');
		try {
			await expect(
				pinnedSend(`https://pinned-push.test:${listener.port}/sub`, ['127.0.0.1'])
			).rejects.toThrow();
			expect(listener.snis).toEqual(['pinned-push.test']);
		} finally {
			await listener.close();
		}
	});

	it('pins each send to its own addresses, also when two sends run at once', async () => {
		// Same port on two loopback addresses: a pin that leaked from one send to
		// the other would land on the wrong listener.
		const one = await sniListener('127.0.0.1');
		const two = await sniListener('127.0.0.2', one.port);
		try {
			const results = await Promise.allSettled([
				pinnedSend(`https://one-push.test:${one.port}/a`, ['127.0.0.1']),
				pinnedSend(`https://two-push.test:${one.port}/b`, ['127.0.0.2'])
			]);
			expect(results.map((r) => r.status)).toEqual(['rejected', 'rejected']);
			expect(one.snis).toEqual(['one-push.test']);
			expect(two.snis).toEqual(['two-push.test']);
		} finally {
			await Promise.all([one.close(), two.close()]);
		}
	});

	it('connects nowhere when the approved list is empty', async () => {
		// `localhost` resolves, so a send that fell back to the system resolver
		// would reach the listener or fail with another error than ENOTFOUND.
		const listener = await sniListener('127.0.0.1');
		try {
			await expect(pinnedSend(`https://localhost:${listener.port}/sub`, [])).rejects.toThrow(
				'ENOTFOUND'
			);
			expect(listener.snis).toEqual([]);
		} finally {
			await listener.close();
		}
	});
});
