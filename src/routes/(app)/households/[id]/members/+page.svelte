<script lang="ts">
	import type { PageData } from './$types';
	import { m } from '$lib/i18n';

	let { data }: { data: PageData } = $props();
	const t = $derived(m(data.locale));
</script>

<h1>{data.household.name} {t.members_title_suffix}</h1>

<ul class="member-list">
	{#each data.members as member (member.id)}
		<li>
			<div class="member-main">
				<strong class="member-name">{member.displayName}</strong>
				<span class="role-badge">{member.role}</span>
			</div>
			<span class="email">{member.email}</span>
			<span class="joined"
				>{t.members_since}
				{member.joinedAt.toLocaleDateString(data.locale === 'en' ? 'en-GB' : 'fr-FR')}</span
			>
		</li>
	{/each}
</ul>

{#if data.isAdmin}
	<a href="./invite" class="btn btn-primary">{t.members_invite_link}</a>
{/if}

<p><a href="/households">{t.members_back}</a></p>

<style>
	.member-list {
		list-style: none;
		padding: 0;
		margin: 0 0 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.member-list li {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.7rem 0.85rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		box-shadow: var(--shadow-sm);
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
		background: var(--surface-2);
		color: var(--text-muted);
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.email,
	.joined {
		font-size: 0.85rem;
		color: var(--text-muted);
	}
</style>
