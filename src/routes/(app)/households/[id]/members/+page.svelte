<script lang="ts">
	import type { PageData } from './$types';
	import { m } from '$lib/i18n';

	let { data }: { data: PageData } = $props();
	const t = $derived(m(data.locale));
</script>

<h1>{data.household.name} {t.members_title_suffix}</h1>

<ul>
	{#each data.members as member (member.id)}
		<li>
			<strong>{member.displayName}</strong>
			<span class="email">{member.email}</span>
			<span class="role-badge">{member.role}</span>
			<span class="joined"
				>{t.members_since}
				{member.joinedAt.toLocaleDateString(data.locale === 'en' ? 'en-GB' : 'fr-FR')}</span
			>
		</li>
	{/each}
</ul>

{#if data.isAdmin}
	<a href="./invite">{t.members_invite_link}</a>
{/if}

<p><a href="/households">{t.members_back}</a></p>
