/**
 * One-shot UI/UX live-evidence capture for the impeccable audit.
 *
 * Why this exists: the interactive browser tooling in the agent session was
 * dropping results, so this runs the whole live pass in a single process:
 *   - signs up (or logs in) a throwaway account to reach protected surfaces
 *   - screenshots every surface in light + dark, at mobile + desktop widths
 *   - injects axe-core and records WCAG violations per surface
 *   - writes PNGs to ./audit-shots/ and a summary to ./audit-shots/axe.json
 *
 * Prereqs (run once):
 *   bunx playwright@latest install chromium
 * Run (dev server must be on http://127.0.0.1:5173):
 *   bunx playwright@latest exec node scripts/ui-audit-capture.mjs
 *   # or, if you have playwright as a dep:  node scripts/ui-audit-capture.mjs
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const BASE = process.env.AUDIT_BASE ?? 'http://127.0.0.1:5173';
const OUT = 'audit-shots';
const EMAIL = `audit_${Date.now()}@local.test`;
const PASSWORD = 'Audit-Passw0rd!';

const VIEWPORTS = [
	{ name: 'mobile', width: 390, height: 844 },
	{ name: 'desktop', width: 1280, height: 900 }
];
const THEMES = ['light', 'dark'];

// Public routes captured before auth, protected routes after.
const PUBLIC_ROUTES = [
	['landing', '/'],
	['login', '/login'],
	['signup', '/signup']
];
const APP_ROUTES = [
	['home', '/garde-manger'],
	['add', '/add'],
	['scan', '/scan'],
	['bilan', '/bilan'],
	['cuisiner', '/cuisiner'],
	['account', '/account']
];

const AXE_CDN = 'https://cdn.jsdelivr.net/npm/axe-core@4/axe.min.js';

async function setTheme(page, theme) {
	// The app persists theme via a cookie/localStorage + data-theme on <html>.
	await page.emulateMedia({ colorScheme: theme });
	await page.evaluate((t) => {
		document.documentElement.setAttribute('data-theme', t);
		try {
			localStorage.setItem('theme', t);
		} catch {}
	}, theme);
}

async function runAxe(page) {
	try {
		await page.addScriptTag({ url: AXE_CDN });
		return await page.evaluate(async () => {
			// eslint-disable-next-line no-undef
			const r = await axe.run(document, {
				runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa']
			});
			return r.violations.map((v) => ({
				id: v.id,
				impact: v.impact,
				help: v.help,
				nodes: v.nodes.length
			}));
		});
	} catch (e) {
		return [{ id: 'axe-load-failed', impact: null, help: String(e), nodes: 0 }];
	}
}

async function capture(page, label, results) {
	for (const vp of VIEWPORTS) {
		await page.setViewportSize({ width: vp.width, height: vp.height });
		for (const theme of THEMES) {
			await setTheme(page, theme);
			await page.waitForTimeout(250);
			const file = `${OUT}/${label}-${theme}-${vp.name}.png`;
			await page.screenshot({ path: file, fullPage: true }).catch(() => {});
		}
	}
	// axe once per surface (mobile/light is representative of the DOM)
	results[label] = await runAxe(page);
	const total = results[label].reduce((n, v) => n + v.nodes, 0);
	console.log(`  ${label}: ${results[label].length} rule violations, ${total} nodes`);
}

async function main() {
	await mkdir(OUT, { recursive: true });
	const browser = await chromium.launch();
	const ctx = await browser.newContext({ locale: 'fr-FR' });
	const page = await ctx.newPage();
	const results = {};

	console.log('Public surfaces:');
	for (const [label, path] of PUBLIC_ROUTES) {
		await page.goto(BASE + path, { waitUntil: 'networkidle' }).catch(() => {});
		await capture(page, label, results);
	}

	// Authenticate: try signup, fall back to login.
	console.log('Authenticating…');
	let authed = false;
	try {
		await page.goto(BASE + '/signup', { waitUntil: 'networkidle' });
		await page.locator('input[type="email"], input[name="email"]').first().fill(EMAIL);
		await page
			.locator('input[type="password"], input[name="password"]')
			.first()
			.fill(PASSWORD);
		// Fill any remaining visible text inputs (e.g. display name), name-agnostic.
		const texts = page.locator(
			'input:not([type="email"]):not([type="password"]):not([type="hidden"]):not([type="checkbox"])'
		);
		const tn = await texts.count();
		for (let i = 0; i < tn; i++) await texts.nth(i).fill('Audit User').catch(() => {});
		await Promise.all([
			page.waitForLoadState('networkidle'),
			page.click('button[type="submit"]')
		]);
		authed = !page.url().includes('/signup') && !page.url().includes('/login');
	} catch {}
	if (!authed) {
		console.log('  signup failed; set AUDIT_EMAIL / AUDIT_PASSWORD and retry login.');
		if (process.env.AUDIT_EMAIL) {
			await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
			await page.fill('input[type="email"]', process.env.AUDIT_EMAIL);
			await page.fill('input[type="password"]', process.env.AUDIT_PASSWORD ?? '');
			await Promise.all([
				page.waitForLoadState('networkidle'),
				page.click('button[type="submit"]')
			]);
			authed = !page.url().includes('/login');
		}
	}

	if (authed) {
		console.log('App surfaces:');
		for (const [label, path] of APP_ROUTES) {
			await page.goto(BASE + path, { waitUntil: 'networkidle' }).catch(() => {});
			await capture(page, label, results);
		}
		// Item detail: follow the first row link if present.
		try {
			await page.goto(BASE + '/garde-manger', { waitUntil: 'networkidle' });
			const href = await page.getAttribute('a[href^="/item/"]', 'href');
			if (href) {
				await page.goto(BASE + href, { waitUntil: 'networkidle' });
				await capture(page, 'item-detail', results);
			}
		} catch {}
	} else {
		console.log('  Could not authenticate; captured public surfaces only.');
	}

	await writeFile(`${OUT}/axe.json`, JSON.stringify(results, null, 2));
	console.log(`\nDone. PNGs + axe.json in ./${OUT}/`);
	await browser.close();
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
