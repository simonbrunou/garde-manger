import { test, expect, setActiveHousehold } from './fixtures/test';
import * as db from './fixtures/db';

const PRIMARY_EMAIL = 'primary@example.com';

function uniqueName(prefix: string): string {
	return `${prefix}-${crypto.randomUUID()}`;
}

function primaryId(): string {
	const id = db.getUserIdByEmail(PRIMARY_EMAIL);
	if (!id) throw new Error('primary user not seeded');
	return id;
}

test.describe('households', () => {
	// 1. Create a household via the UI -> appears in the list; opening it shows admin controls.
	test('create household appears in list and grants admin controls to creator', async ({
		page
	}) => {
		const name = uniqueName('Create');
		await page.goto('/households');
		await page.getByLabel('Household name').fill(name);
		await page.getByRole('button', { name: 'Create' }).click();
		await page.waitForURL('**/households');

		// New household appears in the list as a link.
		const link = page.getByRole('link', { name });
		await expect(link).toBeVisible();

		await link.click();
		// Detail page heading is "<name> — Members".
		await expect(page.getByRole('heading', { name: `${name} — Members` })).toBeVisible();
		// Creator is admin: admin-only controls are present.
		await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Delete household' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Invite a member' })).toBeVisible();
	});

	// 2. Settings: valid update persists ("Settings saved."); out-of-range warnDays is
	//    rejected ("Invalid name or number of days.") and not persisted.
	test('settings: valid warnDays=5 saves; warnDays=31 and -1 are rejected and not persisted', async ({
		page
	}) => {
		const hid = db.seedHousehold(uniqueName('Settings'), primaryId()).id;
		await setActiveHousehold(page.context(), hid);
		await page.goto(`/households/${hid}`);

		const newName = uniqueName('Renamed');
		await page.getByLabel('Household name', { exact: true }).fill(newName);
		await page.getByLabel('Warning days before expiry').fill('5');
		await page.getByRole('button', { name: 'Save' }).click();

		await expect(page.getByText('Settings saved.')).toBeVisible();
		// Out-of-range high value (31). The control caps at max=30 client-side; strip the
		// min/max attributes so the over-range value reaches the SERVER guard under test.
		await page.evaluate(() => {
			const el = document.querySelector<HTMLInputElement>('#warnDays');
			if (el) {
				el.removeAttribute('max');
				el.removeAttribute('min');
			}
		});
		await page.getByLabel('Warning days before expiry').fill('31');
		await page.getByRole('button', { name: 'Save' }).click();
		await expect(page.getByText('Invalid name or number of days.')).toBeVisible();

		// Out-of-range negative value (-1).
		await page.evaluate(() => {
			const el = document.querySelector<HTMLInputElement>('#warnDays');
			if (el) {
				el.removeAttribute('max');
				el.removeAttribute('min');
			}
		});
		await page.getByLabel('Warning days before expiry').fill('-1');
		await page.getByRole('button', { name: 'Save' }).click();
		await expect(page.getByText('Invalid name or number of days.')).toBeVisible();

		// Not persisted: warnDays remains 5 after the rejected attempts. Reload to read fresh.
		await page.goto(`/households/${hid}`);
		await expect(page.getByLabel('Warning days before expiry')).toHaveValue('5');
	});

	// 3. Roles + last-admin guard.
	test('admin can promote a member; last admin cannot be demoted or removed', async ({ page }) => {
		const hid = db.seedHousehold(uniqueName('Roles'), primaryId()).id;
		const member = db.seedUser({ displayName: 'Member User' });
		db.seedMembership(hid, member.id, 'member');
		await setActiveHousehold(page.context(), hid);
		await page.goto(`/households/${hid}`);

		// Locate the member's list row by display name.
		const memberRow = page.locator('.member-list li', { hasText: 'Member User' });
		await expect(memberRow).toBeVisible();

		// Admin promotes the member -> "Make admin" control on that row.
		await memberRow.getByRole('button', { name: 'Make admin' }).click();
		await page.waitForURL(`**/households/${hid}`);

		// DB reflects the promotion: member is now admin -> two admins.
		const adminsAfterPromote = db.getMemberships(hid).filter((m) => m.role === 'admin').length;
		expect(adminsAfterPromote).toBe(2);

		// Now demote the seeded user back to set up the last-admin scenario for the primary.
		const seededRow = page.locator('.member-list li', { hasText: 'Member User' });
		await seededRow.getByRole('button', { name: 'Make member' }).click();
		await page.waitForURL(`**/households/${hid}`);
		expect(db.getMemberships(hid).filter((m) => m.role === 'admin').length).toBe(1);

		// The primary is now the SOLE admin. Its own demote/remove controls must be guarded:
		// either disabled, or the action errors "The household must keep at least one admin."
		const primaryRow = page.locator('.member-list li', { hasText: 'Primary User' });
		await expect(primaryRow).toBeVisible();
		const demoteSelf = primaryRow.getByRole('button', { name: 'Make member' });
		const removeSelf = primaryRow.getByRole('button', { name: 'Leave household' });

		const demoteDisabled = await demoteSelf.isDisabled();
		const removeDisabled = await removeSelf.isDisabled();

		if (demoteDisabled && removeDisabled) {
			// Guarded purely by disabled controls — acceptable. Confirm DB still has 1 admin.
			expect(db.getMemberships(hid).filter((m) => m.role === 'admin').length).toBe(1);
		} else {
			// If a control is enabled, invoking it MUST error and MUST NOT leave zero admins.
			if (!demoteDisabled) {
				await demoteSelf.click();
				await expect(page.getByText('The household must keep at least one admin.')).toBeVisible();
			} else {
				await removeSelf.click();
				await expect(page.getByText('The household must keep at least one admin.')).toBeVisible();
			}
			// Intended invariant: the household must never reach zero admins.
			expect(
				db.getMemberships(hid).filter((m) => m.role === 'admin').length
			).toBeGreaterThanOrEqual(1);
		}
	});

	// 4. Remove member: admin removes the (non-self) member -> gone from memberships.
	test('admin removes a member and the membership is deleted', async ({ page }) => {
		const hid = db.seedHousehold(uniqueName('Remove'), primaryId()).id;
		const member = db.seedUser({ displayName: 'Removable User' });
		db.seedMembership(hid, member.id, 'member');
		await setActiveHousehold(page.context(), hid);
		await page.goto(`/households/${hid}`);

		expect(db.getMemberships(hid).some((m) => m.user_id === member.id)).toBeTruthy();

		const memberRow = page.locator('.member-list li', { hasText: 'Removable User' });
		await memberRow.getByRole('button', { name: 'Remove' }).click();
		await page.waitForURL(`**/households/${hid}`);

		// Member is gone from the DB.
		expect(db.getMemberships(hid).some((m) => m.user_id === member.id)).toBeFalsy();
		// And gone from the rendered list.
		await expect(page.locator('.member-list li', { hasText: 'Removable User' })).toHaveCount(0);
	});

	// 5. Delete household: cascade-deletes its items + memberships and resets active household.
	test('delete household cascades items and memberships', async ({ page }) => {
		const hid = db.seedHousehold(uniqueName('Delete'), primaryId()).id;
		expect(db.getMemberships(hid).length).toBe(1); // sanity: membership exists pre-delete
		// Seed items in this household so we can assert cascade deletion.
		db.seedItem({ householdId: hid, addedBy: primaryId(), customName: 'Doomed Milk' });
		db.seedItem({ householdId: hid, addedBy: primaryId(), customName: 'Doomed Eggs' });
		expect(db.getActiveItems(hid).length).toBe(2);

		await setActiveHousehold(page.context(), hid);
		await page.goto(`/households/${hid}`);

		// The exact household name is the placeholder of the confirm input.
		const confirmInput = page.getByLabel('Type the household name to confirm');
		const exactName = await confirmInput.getAttribute('placeholder');
		expect(exactName).toBeTruthy();
		await confirmInput.fill(exactName!);
		await page.getByRole('button', { name: 'Delete household' }).click();

		// Redirects back to the households list.
		await page.waitForURL('**/households');

		// Cascade: no memberships and no items remain for the deleted household.
		expect(db.getMemberships(hid).length).toBe(0);
		expect(db.getActiveItems(hid).length).toBe(0);
	});

	// 6. Cross-household scoping: the primary user must not be able to view another
	//    household's item.
	test("primary cannot view another household's item", async ({ page }) => {
		const userB = db.seedUser({ displayName: 'Owner B' });
		const hidB = db.seedHousehold(uniqueName('HouseholdB'), userB.id).id;
		const itemB = db.seedItem({
			householdId: hidB,
			addedBy: userB.id,
			customName: 'Secret Item B'
		});

		// Ensure the primary is scoped to their OWN household (not B), then visit B's item.
		const ownHid = db.seedHousehold(uniqueName('PrimaryOwn'), primaryId()).id;
		await setActiveHousehold(page.context(), ownHid);

		const res = await page.goto(`/item/${itemB}`);
		// Intended: forbidden/not-found — the item must NOT be shown to a non-member.
		expect(res?.status()).toBeGreaterThanOrEqual(400);
		await expect(page.getByText('Secret Item B')).toHaveCount(0);
	});
});
