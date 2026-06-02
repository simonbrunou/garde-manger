import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;

// Valid-format throwaway VAPID keypair (reused from src/lib/server/pushConfig.ts
// DEV_* constants). Test-only; never used against a real push service.
const VAPID_PUBLIC =
	'BPrdp9khG8zONp84LcJv8AauDJ4aHk2dSUL5HbhQKcL7hl7YnfkjaKZdO2-H_ptuZWth0BIKofG6cTOIPhR90NA';
const VAPID_PRIVATE = 'jKQSbVbgB0Nl-fcSHFT24MBUHoqlH3_Qg1xyH03Z0A4';

// Env passed to BOTH the build and the adapter-node server. The built server reads
// process.env at runtime via $env/dynamic/private (no .env files are loaded), so
// every var the production guards require must be set here.
const serverEnv: Record<string, string> = {
	PORT: String(PORT),
	DATABASE_PATH: '.e2e/run.db',
	ORIGIN: BASE_URL,
	RP_ID: 'localhost',
	RP_NAME: 'Garde-Manger',
	OFF_USER_AGENT: 'GardeManger-e2e (test@example.com)',
	VAPID_PUBLIC_KEY: VAPID_PUBLIC,
	VAPID_PRIVATE_KEY: VAPID_PRIVATE,
	VAPID_SUBJECT: 'mailto:e2e@garde-manger.local',
	CRON_SECRET: 'test-cron-secret'
};

export default defineConfig({
	testDir: 'tests/e2e',
	fullyParallel: false,
	retries: 0,
	workers: 1,
	reporter: [['list'], ['html', { open: 'never' }]],
	timeout: 30_000,
	expect: { timeout: 7_500 },
	use: { baseURL: BASE_URL, trace: 'on-first-retry', locale: 'en-US' },
	webServer: {
		// Fresh DB each clean run, then a production build, then the adapter-node server.
		// `bun` must be on PATH (this is a Bun project). The DB file self-provisions:
		// src/lib/server/db/index.ts runs migrations + auto-seeds the foods catalogue.
		command: 'rm -rf .e2e && bun run build && bun ./build/index.js',
		url: BASE_URL,
		timeout: 180_000,
		reuseExistingServer: !process.env.CI,
		env: serverEnv,
		stdout: 'pipe',
		stderr: 'pipe'
	},
	projects: [
		{ name: 'setup', testMatch: /auth\.setup\.ts/ },
		{
			name: 'app',
			dependencies: ['setup'],
			testIgnore: [/auth\.setup\.ts/, /passkey\.spec\.ts/, /auth\.spec\.ts/, /smoke\.spec\.ts/],
			use: { ...devices['Desktop Chrome'], storageState: 'tests/e2e/.auth/user.json' }
		},
		{
			name: 'anon',
			testMatch: /(auth|smoke)\.spec\.ts/,
			use: { ...devices['Desktop Chrome'] }
		},
		{
			name: 'passkey',
			testMatch: /passkey\.spec\.ts/,
			use: { ...devices['Desktop Chrome'] }
		}
	]
});
