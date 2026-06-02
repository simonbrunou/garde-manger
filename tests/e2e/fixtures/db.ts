// Test-side database access. Runs in the Node (Playwright) process via the built-in
// `node:sqlite` driver, opening the SAME SQLite file the running adapter-node server
// uses (WAL + busy_timeout let the two processes coexist). We use raw SQL — not the
// app's drizzle/bun:sqlite client — because the test runner is Node, not Bun.
//
// Timestamp columns use drizzle's `mode: 'timestamp'` == Unix SECONDS. Sessions are
// minted by replicating src/lib/server/auth/session.ts exactly so the cookie validates.
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, createHash } from 'node:crypto';

// Pinned to the same path playwright.config.ts gives the server via webServer.env.
// Do NOT honor an ambient DATABASE_PATH: the runner process may have one exported
// (a dev's real DB) while the app is always on .e2e/run.db — that mismatch would seed
// the wrong database and could mutate non-test data.
const DB_PATH = '.e2e/run.db';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days (matches session.ts)

function withDb<T>(fn: (d: DatabaseSync) => T): T {
	const d = new DatabaseSync(DB_PATH);
	try {
		d.exec('PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;');
		return fn(d);
	} finally {
		d.close();
	}
}

const toSec = (d: Date | null | undefined): number | null =>
	d == null ? null : Math.floor(d.getTime() / 1000);
const rid = (prefix: string) => `${prefix}_${randomBytes(8).toString('hex')}`;

export interface SeededUser {
	id: string;
	email: string;
	displayName: string;
}

/** Insert a passkey-only user (password_hash NULL). Use mintSessionToken + loginAs to
 *  authenticate them without the UI. Idempotent on email. */
export function seedUser(
	opts: { email?: string; displayName?: string; locale?: 'fr' | 'en' } = {}
): SeededUser {
	const email = opts.email ?? `${rid('user')}@example.com`;
	const displayName = opts.displayName ?? 'Seed User';
	return withDb((d) => {
		const existing = d.prepare('SELECT id FROM users WHERE email = ?').get(email) as
			| { id: string }
			| undefined;
		if (existing) return { id: existing.id, email, displayName };
		const id = rid('user');
		d.prepare(
			'INSERT INTO users (id, email, display_name, locale, password_hash, created_at) VALUES (?, ?, ?, ?, NULL, ?)'
		).run(id, email, displayName, opts.locale ?? 'en', toSec(new Date())!);
		return { id, email, displayName };
	});
}

export function getUserIdByEmail(email: string): string | undefined {
	return withDb(
		(d) =>
			(d.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined)
				?.id
	);
}

/** Force a user's stored locale (hooks.server.ts prioritises user.locale over cookies). */
export function setUserLocale(userId: string, locale: 'fr' | 'en'): void {
	withDb((d) => {
		d.prepare('UPDATE users SET locale = ? WHERE id = ?').run(locale, userId);
	});
}

/** Create a household with `ownerId` as its sole admin. */
export function seedHousehold(name: string, ownerId: string): { id: string } {
	return withDb((d) => {
		const id = rid('hh');
		const now = toSec(new Date())!;
		d.prepare('INSERT INTO households (id, name, warn_days, created_at) VALUES (?, ?, 3, ?)').run(
			id,
			name,
			now
		);
		d.prepare(
			'INSERT INTO memberships (id, household_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)'
		).run(rid('mem'), id, ownerId, 'admin', now);
		return { id };
	});
}

export function seedMembership(
	householdId: string,
	userId: string,
	role: 'admin' | 'member'
): void {
	withDb((d) => {
		d.prepare(
			'INSERT OR IGNORE INTO memberships (id, household_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)'
		).run(rid('mem'), householdId, userId, role, toSec(new Date())!);
	});
}

/** Direct insert so tests can set EXACT past/boundary dates and terminal states the UI
 *  cannot express. `effective_date` is a generated column and is never written. */
export function seedItem(opts: {
	householdId: string;
	addedBy: string;
	customName?: string;
	location?: 'pantry' | 'fridge' | 'freezer';
	useByDate?: Date | null;
	bestByDate?: Date | null;
	quantity?: number;
	status?: 'active' | 'consumed' | 'discarded';
	closedAt?: Date | null;
}): string {
	const id = rid('item');
	withDb((d) => {
		d.prepare(
			`INSERT INTO inventory_items
				(id, household_id, added_by, kind, custom_name, quantity, location, added_at,
				 use_by_date, best_by_date, is_estimate, status, closed_at)
			 VALUES (?, ?, ?, 'fresh', ?, ?, ?, ?, ?, ?, 0, ?, ?)`
		).run(
			id,
			opts.householdId,
			opts.addedBy,
			opts.customName ?? 'Seeded item',
			opts.quantity ?? 1,
			opts.location ?? 'fridge',
			toSec(new Date())!,
			toSec(opts.useByDate),
			toSec(opts.bestByDate),
			opts.status ?? 'active',
			toSec(opts.closedAt)
		);
	});
	return id;
}

/** Seed the OFF cache so scan lookups are cache hits (zero network). */
export function seedProduct(opts: {
	barcode: string;
	name?: string;
	brand?: string;
	status?: 'found' | 'not_found';
}): void {
	withDb((d) => {
		d.prepare(
			`INSERT INTO products (barcode, name, brand, status, fetched_at)
			 VALUES (?, ?, ?, ?, ?)
			 ON CONFLICT(barcode) DO UPDATE SET name = excluded.name, brand = excluded.brand, status = excluded.status`
		).run(
			opts.barcode,
			opts.name ?? null,
			opts.brand ?? null,
			opts.status ?? 'found',
			toSec(new Date())!
		);
	});
}

/** Seed a credential row for a user (for the account passkey-removal spec). */
export function seedCredential(opts: {
	userId: string;
	credentialId?: string;
	deviceLabel?: string;
}): string {
	const id = rid('cred');
	const credentialId = opts.credentialId ?? rid('credid');
	withDb((d) => {
		d.prepare(
			`INSERT INTO credentials
				(id, user_id, credential_id, public_key, counter, transports, backed_up, device_label, created_at)
			 VALUES (?, ?, ?, ?, 0, '[]', 0, ?, ?)`
		).run(
			id,
			opts.userId,
			credentialId,
			Buffer.from('test-public-key'),
			opts.deviceLabel ?? 'Test Passkey',
			toSec(new Date())!
		);
	});
	return id;
}

/** Mint a valid session and return the cookie token. Replicates session.createSession. */
export function mintSessionToken(userId: string): string {
	const id = randomBytes(18).toString('base64url');
	const secret = randomBytes(24).toString('base64url');
	const secretHash = createHash('sha256').update(secret).digest();
	const now = new Date();
	withDb((d) => {
		d.prepare(
			'INSERT INTO sessions (id, secret_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?)'
		).run(id, secretHash, userId, toSec(now)!, toSec(new Date(now.getTime() + SESSION_TTL_MS))!);
	});
	return `${id}.${secret}`;
}

// --- read helpers ---------------------------------------------------------------

type Row = Record<string, unknown>;

export function getActiveItems(householdId: string): Row[] {
	return withDb(
		(d) =>
			d
				.prepare("SELECT * FROM inventory_items WHERE household_id = ? AND status = 'active'")
				.all(householdId) as Row[]
	);
}

export function getItem(id: string): Row | undefined {
	return withDb(
		(d) => d.prepare('SELECT * FROM inventory_items WHERE id = ?').get(id) as Row | undefined
	);
}

export function getHouseholdIdForUser(userId: string): string | undefined {
	return withDb(
		(d) =>
			(
				d.prepare('SELECT household_id FROM memberships WHERE user_id = ? LIMIT 1').get(userId) as
					| { household_id: string }
					| undefined
			)?.household_id
	);
}

export function getInvitationsForHousehold(householdId: string): Row[] {
	return withDb(
		(d) => d.prepare('SELECT * FROM invitations WHERE household_id = ?').all(householdId) as Row[]
	);
}

export function getMemberships(householdId: string): Row[] {
	return withDb(
		(d) => d.prepare('SELECT * FROM memberships WHERE household_id = ?').all(householdId) as Row[]
	);
}
