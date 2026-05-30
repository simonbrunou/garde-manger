<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { m } from '$lib/i18n';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const t = $derived(m(data.locale));
	const dateLocale = $derived(data.locale === 'en' ? 'en-GB' : 'fr-FR');
	const adminCount = $derived(data.members.filter((mem) => mem.role === 'admin').length);
</script>

<h1>{data.household.name} {t.members_title_suffix}</h1>

{#if form?.message}
	<p class="error" role="alert">{form.message}</p>
{/if}
{#if form?.settingsSaved}
	<p class="success" role="status">{t.manage_settings_saved}</p>
{/if}

<section class="card section">
	<h2>{t.manage_settings_section}</h2>
	{#if data.isAdmin}
		<form method="POST" action="?/updateSettings" class="stack">
			<div class="field">
				<label for="name">{t.households_name_label}</label>
				<input
					type="text"
					id="name"
					name="name"
					value={data.household.name}
					required
					maxlength="80"
				/>
			</div>
			<div class="field">
				<label for="warnDays">{t.manage_warn_days_label}</label>
				<input
					type="number"
					id="warnDays"
					name="warnDays"
					value={data.household.warnDays}
					min="0"
					max="30"
					required
				/>
			</div>
			<button type="submit" class="btn btn-primary">{t.account_save}</button>
		</form>
	{:else}
		<p class="readonly">
			<span class="muted">{t.households_name_label}:</span>
			{data.household.name}
		</p>
		<p class="readonly">
			<span class="muted">{t.manage_warn_days_label}:</span>
			{data.household.warnDays}
		</p>
	{/if}
</section>

<section class="card section">
	<h2>{t.manage_members_section}</h2>
	<ul class="member-list">
		{#each data.members as member (member.id)}
			<li>
				<div class="member-main">
					<strong class="member-name">{member.displayName}</strong>
					<span class="role-badge">{member.role}</span>
				</div>
				<span class="email">{member.email}</span>
				<span class="joined"
					>{t.members_since} {member.joinedAt.toLocaleDateString(dateLocale)}</span
				>

				{#if data.isAdmin}
					<div class="member-actions">
						<form method="POST" action="?/setRole">
							<input type="hidden" name="userId" value={member.id} />
							<input
								type="hidden"
								name="role"
								value={member.role === 'admin' ? 'member' : 'admin'}
							/>
							<button
								type="submit"
								class="btn btn-secondary"
								disabled={member.role === 'admin' && adminCount <= 1}
							>
								{member.role === 'admin' ? t.manage_demote : t.manage_promote}
							</button>
						</form>
						<form method="POST" action="?/removeMember">
							<input type="hidden" name="userId" value={member.id} />
							<button
								type="submit"
								class="btn btn-danger"
								disabled={member.role === 'admin' && adminCount <= 1}
							>
								{member.id === data.currentUserId ? t.manage_leave : t.manage_remove_member}
							</button>
						</form>
					</div>
				{/if}
			</li>
		{/each}
	</ul>
	{#if data.isAdmin}
		<a href="./invite" class="btn btn-primary">{t.members_invite_link}</a>
	{/if}
</section>

{#if data.isAdmin}
	<section class="card section">
		<h2>{t.manage_invites_section}</h2>
		{#if data.pendingInvitations.length === 0}
			<p class="muted">{t.manage_invites_empty}</p>
		{:else}
			<ul class="invite-list">
				{#each data.pendingInvitations as inv (inv.id)}
					<li>
						<span class="role-badge">{inv.role}</span>
						<span class="invite-meta"
							>{t.manage_invite_expires} {inv.expiresAt.toLocaleDateString(dateLocale)}</span
						>
						<form method="POST" action="?/revokeInvitation" class="invite-revoke">
							<input type="hidden" name="id" value={inv.id} />
							<button type="submit" class="btn btn-ghost">{t.manage_invite_revoke}</button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section class="card section">
		<h2>{t.manage_danger_section}</h2>
		<p class="muted">{t.manage_delete_warning}</p>
		<form method="POST" action="?/deleteHousehold" class="stack">
			<div class="field">
				<label for="confirmName">{t.manage_delete_confirm_label}</label>
				<input
					type="text"
					id="confirmName"
					name="confirmName"
					autocomplete="off"
					placeholder={data.household.name}
				/>
			</div>
			<button type="submit" class="btn btn-danger delete-button">{t.manage_delete_button}</button>
		</form>
	</section>
{/if}

<p><a href="/households">{t.members_back}</a></p>

<style>
	.section {
		margin-bottom: 1rem;
	}

	.stack {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
		align-items: flex-start;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		width: 100%;
	}

	.readonly {
		margin: 0.25rem 0;
	}

	.member-list,
	.invite-list {
		list-style: none;
		padding: 0;
		margin: 0 0 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.member-list li {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.7rem 0.85rem;
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}

	.member-main {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.member-name {
		font-weight: 700;
	}

	.role-badge {
		padding: 0.18rem 0.55rem;
		border-radius: var(--radius-pill);
		background: var(--surface);
		color: var(--text-muted);
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.email,
	.joined,
	.invite-meta {
		font-size: 0.85rem;
		color: var(--text-muted);
	}

	.member-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 0.5rem;
	}

	.member-actions .btn {
		padding: 0.4rem 0.8rem;
		font-size: 0.85rem;
	}

	.invite-list li {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.6rem 0.75rem;
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}

	.invite-revoke {
		margin-left: auto;
	}

	.delete-button {
		width: 100%;
	}
</style>
