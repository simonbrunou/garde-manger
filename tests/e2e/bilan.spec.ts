import { test, expect, setActiveHousehold } from './fixtures/test';
import * as db from './fixtures/db';
import { utcMidnight } from './fixtures/dates';

// Bilan (waste report). The page shows, for the CURRENT calendar month (UTC):
//   - Eaten  = count of items with status='consumed' closed this month
//   - Wasted = count of items with status='discarded' closed this month
//   - a streak line = whole days since the most recent discard, ever
// Intended behaviour comes from the oracle + the EN i18n catalogue:
//   bilan_eaten = 'Eaten', bilan_wasted = 'Wasted'
//   bilan_streak(n) = `${n} day${n>1?'s':''} waste-free`  -> 5 => '5 days waste-free'
//   bilan_streak_none = 'No waste recorded yet 🎉'

const PRIMARY_EMAIL = 'primary@example.com';

/** Read the numeric value shown inside the StatTile whose label is `label`. */
function tileValue(page: import('@playwright/test').Page, label: string) {
	// The tile is a container holding the label text and its big value side by side.
	return page.locator('.tile', { hasText: label }).locator('.value');
}

test('counts consumed and discarded items for the current month', async ({ page }) => {
	const ownerId = db.getUserIdByEmail(PRIMARY_EMAIL)!;
	const { id: hid } = db.seedHousehold(`bilan-counts-${crypto.randomUUID()}`, ownerId);

	// 2 eaten + 1 wasted, all closed today (definitely inside the current month).
	db.seedItem({ householdId: hid, addedBy: ownerId, status: 'consumed', closedAt: utcMidnight(0) });
	db.seedItem({ householdId: hid, addedBy: ownerId, status: 'consumed', closedAt: utcMidnight(0) });
	db.seedItem({
		householdId: hid,
		addedBy: ownerId,
		status: 'discarded',
		closedAt: utcMidnight(0)
	});

	await setActiveHousehold(page.context(), hid);
	await page.goto('/bilan');

	await expect(page.getByText('This month')).toBeVisible();
	await expect(tileValue(page, 'Eaten')).toHaveText('2');
	await expect(tileValue(page, 'Wasted')).toHaveText('1');
});

test('excludes items closed before the 1st of the current month', async ({ page }) => {
	const ownerId = db.getUserIdByEmail(PRIMARY_EMAIL)!;
	const { id: hid } = db.seedHousehold(`bilan-prevmonth-${crypto.randomUUID()}`, ownerId);

	// Two consumed items inside this month.
	db.seedItem({ householdId: hid, addedBy: ownerId, status: 'consumed', closedAt: utcMidnight(0) });
	db.seedItem({ householdId: hid, addedBy: ownerId, status: 'consumed', closedAt: utcMidnight(0) });

	// One consumed item closed definitively BEFORE the 1st of the current month.
	// Compute an offset that lands in the previous month regardless of today's date:
	// go back past the start-of-month plus a 5-day cushion.
	const today = utcMidnight(0);
	const daysIntoMonth = today.getUTCDate(); // 1 on the 1st
	const prevMonthOffset = -(daysIntoMonth + 5); // 5 days before this month's 1st
	const prevMonthClose = utcMidnight(prevMonthOffset);
	expect(prevMonthClose.getUTCMonth()).not.toBe(today.getUTCMonth());
	db.seedItem({
		householdId: hid,
		addedBy: ownerId,
		status: 'consumed',
		closedAt: prevMonthClose
	});

	await setActiveHousehold(page.context(), hid);
	await page.goto('/bilan');

	// Only the two current-month items count; the previous-month one is excluded.
	await expect(tileValue(page, 'Eaten')).toHaveText('2');
});

test('streak shows whole days since the most recent discard', async ({ page }) => {
	const ownerId = db.getUserIdByEmail(PRIMARY_EMAIL)!;
	const { id: hid } = db.seedHousehold(`bilan-streak5-${crypto.randomUUID()}`, ownerId);

	// One discard 5 days ago and nothing discarded since -> 5 whole days waste-free.
	db.seedItem({
		householdId: hid,
		addedBy: ownerId,
		status: 'discarded',
		closedAt: utcMidnight(-5)
	});

	await setActiveHousehold(page.context(), hid);
	await page.goto('/bilan');

	await expect(page.getByText('5 days waste-free')).toBeVisible();
});

test('streak shows the none message when nothing was ever discarded', async ({ page }) => {
	const ownerId = db.getUserIdByEmail(PRIMARY_EMAIL)!;
	const { id: hid } = db.seedHousehold(`bilan-streaknone-${crypto.randomUUID()}`, ownerId);

	// At least one closed item so the page renders the report (not the empty state),
	// but no discards at all -> "No waste recorded yet".
	db.seedItem({ householdId: hid, addedBy: ownerId, status: 'consumed', closedAt: utcMidnight(0) });

	await setActiveHousehold(page.context(), hid);
	await page.goto('/bilan');

	await expect(page.getByText('No waste recorded yet')).toBeVisible();
});

test('trend line shows less waste than last month', async ({ page }) => {
	const ownerId = db.getUserIdByEmail(PRIMARY_EMAIL)!;
	const { id: hid } = db.seedHousehold(`bilan-trend-${crypto.randomUUID()}`, ownerId);

	// 1 discarded this month
	db.seedItem({
		householdId: hid,
		addedBy: ownerId,
		status: 'discarded',
		closedAt: utcMidnight(0)
	});

	// 2 discarded last month — offset past start-of-month by 5 days (mirrors existing pattern)
	const today = utcMidnight(0);
	const daysIntoMonth = today.getUTCDate();
	const prevMonthOffset = -(daysIntoMonth + 5);
	const prevMonthClose = utcMidnight(prevMonthOffset);
	db.seedItem({
		householdId: hid,
		addedBy: ownerId,
		status: 'discarded',
		closedAt: prevMonthClose
	});
	db.seedItem({
		householdId: hid,
		addedBy: ownerId,
		status: 'discarded',
		closedAt: prevMonthClose
	});

	await setActiveHousehold(page.context(), hid);
	await page.goto('/bilan');

	// wasted (1) < prevWasted (2) → better message with prev count
	await expect(page.getByText('Less waste than last month (2)')).toBeVisible();
});
