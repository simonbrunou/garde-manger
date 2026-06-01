<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		large = true,
		leading,
		trailing
	}: {
		title: string;
		large?: boolean;
		leading?: Snippet;
		trailing?: Snippet;
	} = $props();

	// The inline (collapsed) title fades in once the large title scrolls out of
	// view. A zero-height sentinel sits just below the large title; an
	// IntersectionObserver toggles `collapsed` when it leaves the viewport top.
	let collapsed = $state(false);
	let sentinel: HTMLElement | undefined = $state();

	$effect(() => {
		if (!large || !sentinel) return;
		const io = new IntersectionObserver(
			([entry]) => {
				collapsed = !entry.isIntersecting;
			},
			{ rootMargin: '-1px 0px 0px 0px', threshold: 0 }
		);
		io.observe(sentinel);
		return () => io.disconnect();
	});
</script>

<header
	class="nav-bar"
	class:collapsed={large ? collapsed : true}
	class:hairline={!large || collapsed}
>
	<div class="slot leading">{@render leading?.()}</div>
	{#if large}
		<!-- On large bars the big title below is the page <h1>; this inline copy
		     just fades in on scroll, so it's a presentational div. -->
		<div class="inline-title" aria-hidden={!collapsed}>{title}</div>
	{:else}
		<!-- On inline bars this IS the page's sole heading. -->
		<h1 class="inline-title">{title}</h1>
	{/if}
	<div class="slot trailing">{@render trailing?.()}</div>
</header>

{#if large}
	<div class="large-wrap">
		<h1 class="t-large-title">{title}</h1>
	</div>
	<div class="sentinel" bind:this={sentinel} aria-hidden="true"></div>
{/if}

<style>
	.nav-bar {
		position: sticky;
		top: 0;
		z-index: 10;
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 0.5rem;
		min-height: var(--nav-bar-h);
		padding: calc(0.4rem + env(safe-area-inset-top)) var(--layout-margin) 0.4rem;
		max-width: var(--container);
		margin: 0 auto;
		background: var(--material-bar);
		backdrop-filter: saturate(140%) blur(12px);
		-webkit-backdrop-filter: saturate(140%) blur(12px);
		border-bottom: 1px solid transparent;
		transition: border-color var(--dur-fast);
	}
	.nav-bar.hairline {
		border-bottom-color: var(--separator);
	}
	.slot {
		display: flex;
		align-items: center;
	}
	.leading {
		justify-content: flex-start;
	}
	.trailing {
		justify-content: flex-end;
	}
	.inline-title {
		margin: 0;
		font-size: var(--text-headline);
		font-weight: 600;
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		opacity: 1;
		transition: opacity var(--dur-fast);
	}
	.nav-bar:not(.collapsed) .inline-title {
		opacity: 0;
	}
	.large-wrap {
		max-width: var(--container);
		margin: 0 auto;
		padding: 0.2rem var(--layout-margin) 0.4rem;
	}
	.large-wrap h1 {
		margin: 0;
	}
	.sentinel {
		height: 0;
	}
</style>
