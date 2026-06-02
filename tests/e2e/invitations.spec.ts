import { test, expect, loginAs, setActiveHousehold } from './fixtures/test';
import * as db from './fixtures/db';

// Oracle intent: invitations are single-use, role inherited, and a mere PREVIEW
// (GET) of /join/<token> must NOT consume the invitation. Acceptance happens only
// on POST. The primary user is the inviter/admin.

const PRIMARY_EMAIL = 'primary@example.com';

/** Extract the join token from an absolute /join/<token> link. */
function tokenFromLink(link: string): string {
	const m = link.match(/\/join\/([^/?#]+)/);
	if (!m) throw new Error(`No /join/<token> in link: ${link}`);
	return m[1];
}

test('invitation link lifecycle: create, preview-no-consume, accept, single-use', async ({
	page,
	browser
}) => {
	const primaryId = db.getUserIdByEmail(PRIMARY_EMAIL);
	expect(primaryId, 'primary user must exist').toBeTruthy();

	// Dedicated household owned (admin) by the primary user for isolation.
	const hid = db.seedHousehold(`invite-${crypto.randomUUID()}`, primaryId!).id;
	await setActiveHousehold(page.context(), hid);

	// 1. Create link: pick the 'member' role and generate the invitation link.
	await page.goto(`/households/${hid}/invite`);
	await expect(page.getByRole('heading', { name: 'Invite a member' })).toBeVisible();

	await page.getByLabel('Role').selectOption('member');
	await page.getByRole('button', { name: 'Generate an invitation link' }).click();

	// The generated link is shown in a readonly text input.
	await expect(page.getByRole('heading', { name: 'Invitation link generated' })).toBeVisible();
	const linkInput = page.locator('input[readonly]');
	const link = await linkInput.inputValue();
	expect(link).toContain('/join/');
	const token = tokenFromLink(link);

	// Exactly one invitation row should now exist for this household, unused.
	let invitations = db.getInvitationsForHousehold(hid);
	expect(invitations.length).toBe(1);
	expect(invitations[0].used_at == null, 'freshly created invitation must be unused').toBeTruthy();

	// 2. PREVIEW must NOT consume. A DIFFERENT logged-in user (B) GETs /join/<token>.
	const userB = db.seedUser({ displayName: 'Invitee B', locale: 'en' });
	const ctxB = await browser.newContext();
	await loginAs(ctxB, userB.id);
	const pageB = await ctxB.newPage();

	await pageB.goto(`/join/${token}`);

	// The confirm screen is shown (not an error / not auto-joined).
	await expect(pageB.getByRole('heading', { name: /Join household/ })).toBeVisible();
	await expect(pageB.getByText('You have been invited to join')).toBeVisible();
	await expect(pageB.getByRole('button', { name: 'Join this household' })).toBeVisible();

	// BEHAVIORAL ASSERTION: the mere GET must not have burned the token.
	invitations = db.getInvitationsForHousehold(hid);
	expect(invitations.length).toBe(1);
	expect(
		invitations[0].used_at == null,
		'a GET preview of /join/<token> must NOT consume the invitation (used_at must stay null)'
	).toBeTruthy();

	// User B must not be a member yet (preview alone must not add membership).
	let members = db.getMemberships(hid);
	expect(
		members.some((mrow) => mrow.user_id === userB.id),
		'preview alone must not create a membership'
	).toBeFalsy();

	// 3. Accept: user B submits "Join this household".
	await pageB.getByRole('button', { name: 'Join this household' }).click();

	// Redirected to the household page after acceptance.
	await pageB.waitForURL(`**/households/${hid}`);

	// User B is now a member with the INVITED role ('member').
	members = db.getMemberships(hid);
	const bMembership = members.find((mrow) => mrow.user_id === userB.id);
	expect(bMembership, 'user B must be a member after accepting').toBeTruthy();
	expect(bMembership!.role, 'role must be inherited from the invitation (member)').toBe('member');

	// used_at is now set on the invitation.
	invitations = db.getInvitationsForHousehold(hid);
	expect(invitations[0].used_at != null, 'used_at must be set after acceptance').toBeTruthy();

	// 4. Single-use: visiting + submitting the same token again is rejected.
	await pageB.goto(`/join/${token}`);
	// After consumption the page (preview) should report the already-used error.
	// Submitting again must also surface "already used".
	const reJoinBtn = pageB.getByRole('button', { name: 'Join this household' });
	if (await reJoinBtn.isVisible().catch(() => false)) {
		await reJoinBtn.click();
	}
	await expect(pageB.getByText('This invitation link has already been used.')).toBeVisible();

	await ctxB.close();
});

test('bogus token shows the invalid-invitation message', async ({ browser }) => {
	const userC = db.seedUser({ displayName: 'Invitee C', locale: 'en' });
	const ctxC = await browser.newContext();
	await loginAs(ctxC, userC.id);
	const pageC = await ctxC.newPage();

	await pageC.goto(`/join/this-token-does-not-exist-${crypto.randomUUID()}`);

	await expect(pageC.getByText('This invitation link is invalid or does not exist.')).toBeVisible();
	await expect(pageC.getByRole('button', { name: 'Join this household' })).toHaveCount(0);

	await ctxC.close();
});
