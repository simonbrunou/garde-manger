// Single source of truth for the e2e harness environment, shared by
// playwright.config.ts (server port + baseURL + DB path), the DB fixtures (which
// SQLite file to open), and test helpers (cookie URL). Centralising these prevents
// the app-under-test and the test-side raw-SQL helpers from ever pointing at a
// different origin or database.
export const PORT = 4173;
export const BASE_URL = `http://localhost:${PORT}`;

// Pinned: never honor an ambient DATABASE_PATH (which may be a developer's real DB).
// playwright.config.ts launches the server against this exact path via webServer.env,
// and the fixtures open the same file — so the two can never diverge.
export const DB_PATH = '.e2e/run.db';
