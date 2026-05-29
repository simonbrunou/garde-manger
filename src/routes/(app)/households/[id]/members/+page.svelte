<script lang="ts">
	import type { PageServerData } from './$types';

	let { data }: { data: PageServerData } = $props();
</script>

<h1>{data.household.name} — Membres</h1>

<ul>
	{#each data.members as m (m.id)}
		<li>
			<strong>{m.displayName}</strong>
			<span class="email">{m.email}</span>
			<span class="role-badge">{m.role}</span>
			<span class="joined">Membre depuis {m.joinedAt.toLocaleDateString('fr-FR')}</span>
		</li>
	{/each}
</ul>

{#if data.isAdmin}
	<a href="./invite">Inviter un membre</a>
{/if}

<p><a href="/households">← Retour aux foyers</a></p>
