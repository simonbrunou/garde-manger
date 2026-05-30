<script lang="ts">
	import { m } from '$lib/i18n';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/components/ui/Icon.svelte';

	let { data } = $props();
	const t = $derived(m(data.locale));

	const features = $derived<{ icon: IconName; title: string; body: string; tone: string }[]>([
		{
			icon: 'cat-pantry',
			title: t.landing_feature_stock_title,
			body: t.landing_feature_stock_body,
			tone: 'green'
		},
		{
			icon: 'bell',
			title: t.landing_feature_expiry_title,
			body: t.landing_feature_expiry_body,
			tone: 'amber'
		},
		{
			icon: 'scan',
			title: t.landing_feature_scan_title,
			body: t.landing_feature_scan_body,
			tone: 'green'
		},
		{
			icon: 'cook',
			title: t.landing_feature_cook_title,
			body: t.landing_feature_cook_body,
			tone: 'red'
		}
	]);
</script>

<svelte:head>
	<title>Garde-Manger</title>
	<meta name="description" content={t.landing_meta_description} />
</svelte:head>

<main class="landing">
	<section class="hero">
		<p class="brand"><span class="brand-mark" aria-hidden="true">🥕</span> Garde-Manger</p>
		<h1>{t.landing_hero_title}</h1>
		<p class="lede">{t.landing_hero_subtitle}</p>
		<div class="cta">
			<a class="btn btn-primary" href="/signup">{t.landing_cta_signup}</a>
			<a class="btn btn-secondary" href="/login">{t.landing_cta_login}</a>
		</div>
	</section>

	<section class="features">
		{#each features as f (f.title)}
			<div class="card feature">
				<span class="feature-icon tone-{f.tone}"><Icon name={f.icon} size={26} /></span>
				<h2>{f.title}</h2>
				<p>{f.body}</p>
			</div>
		{/each}
	</section>

	<section class="closing">
		<p>{t.landing_closing_prompt}</p>
		<a class="btn btn-primary" href="/signup">{t.landing_cta_signup}</a>
	</section>

	<footer class="foot"><span aria-hidden="true">🥕</span> Garde-Manger</footer>
</main>

<style>
	.landing {
		max-width: 56rem;
		margin: 0 auto;
		padding: 1.5rem 1.25rem 4rem;
	}
	.hero {
		text-align: center;
		padding: 2.5rem 0 2rem;
	}
	.brand {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		margin: 0;
		font-weight: 800;
		letter-spacing: 0.02em;
		color: var(--text-muted);
	}
	.brand-mark {
		font-size: 1.3rem;
	}
	.hero h1 {
		margin: 1rem 0 0;
		font-size: clamp(1.8rem, 6vw, 2.8rem);
		line-height: 1.1;
	}
	.lede {
		max-width: 34rem;
		margin: 1rem auto 0;
		color: var(--text-muted);
		font-size: 1.05rem;
		line-height: 1.5;
	}
	.cta {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.75rem;
		margin-top: 1.75rem;
	}
	.cta .btn {
		min-width: 11rem;
	}
	.features {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
		margin-top: 1rem;
	}
	.feature {
		padding: 1.25rem;
		text-align: left;
	}
	.feature h2 {
		margin: 0.75rem 0 0.35rem;
		font-size: 1.05rem;
	}
	.feature p {
		margin: 0;
		color: var(--text-muted);
		font-size: 0.92rem;
		line-height: 1.45;
	}
	.feature-icon {
		display: inline-grid;
		place-items: center;
		width: 2.75rem;
		height: 2.75rem;
		border-radius: 0.9rem;
		color: var(--green);
		background: color-mix(in srgb, var(--green) 14%, transparent);
	}
	.tone-amber {
		color: var(--amber);
		background: color-mix(in srgb, var(--amber) 16%, transparent);
	}
	.tone-red {
		color: var(--red);
		background: color-mix(in srgb, var(--red) 14%, transparent);
	}
	.closing {
		margin-top: 2.5rem;
		text-align: center;
	}
	.closing p {
		margin: 0 0 1rem;
		font-size: 1.15rem;
		font-weight: 700;
	}
	.foot {
		margin-top: 3rem;
		text-align: center;
		color: var(--text-muted);
		font-size: 0.85rem;
	}
	@media (max-width: 30rem) {
		.features {
			grid-template-columns: 1fr;
		}
		.cta .btn {
			width: 100%;
		}
	}
</style>
