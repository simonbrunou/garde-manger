// Single source of truth for the e2e harness environment, shared by
// playwright.config.ts (server port + baseURL + DB path), the DB fixtures (which
// SQLite file to open), and test helpers (cookie URL). Centralising these prevents
// the app-under-test and the test-side raw-SQL helpers from ever pointing at a
// different origin or database.

// The e2e server's port: PORT when set, so checkouts on one host can each run
// the suite on their own port (AGENTS.md « E2E tests »), and 4173 when unset, as
// in CI. Any other value fails loudly instead of falling back to a shared port.
function e2ePort(raw: string | undefined): number {
	if (raw === undefined) return 4173;
	const port = Number(raw);
	if (!/^[0-9]+$/.test(raw) || port < 1 || port > 65535) {
		throw new Error(
			`PORT must be a whole number from 1 to 65535 or unset, got ${JSON.stringify(raw)}`
		);
	}
	return port;
}

export const PORT = e2ePort(process.env.PORT);
export const BASE_URL = `http://localhost:${PORT}`;

// Pinned: never honor an ambient DATABASE_PATH (which may be a developer's real DB).
// playwright.config.ts launches the server against this exact path via webServer.env,
// and the fixtures open the same file — so the two can never diverge.
export const DB_PATH = '.e2e/run.db';

// Cron trigger secret: the server reads it from webServer.env, and the cron spec
// presents it the way the Coolify scheduled task does.
export const CRON_SECRET = 'test-cron-secret';
