<script lang="ts">
	import type { PageData } from './$types';
	import { m } from '$lib/i18n';

	let { data }: { data: PageData } = $props();
	const t = $derived(m(data.locale));
</script>

<svelte:head><title>Garde-Manger</title></svelte:head>

{#snippet thumb(
	item: { name: string; barcode: string | null; imagePath: string | null },
	emoji: string
)}
	{#if item.imagePath && item.barcode}
		<img
			class="item-thumb-img"
			src="/products/{item.barcode}/image"
			alt={item.name}
			loading="lazy"
			width="32"
			height="32"
		/>
	{:else}
		<span class="item-thumb" aria-hidden="true">{emoji}</span>
	{/if}
{/snippet}

{#if data.noHousehold}
	<!-- ── No household state ─────────────────────────────────────────────── -->
	<h1>Garde-Manger</h1>
	<p>{t.home_no_household}</p>
	<p><a href="/households">{t.home_create_or_join}</a></p>
{:else}
	<!-- ── Header ────────────────────────────────────────────────────────── -->
	<header class="home-header">
		<div class="home-header-left">
			<h1 class="home-title">{data.activeHouseholdName}</h1>
		</div>
		<a href="/add" class="btn-add">{t.home_add_item}</a>
	</header>

	<!-- ── Location filter chips ─────────────────────────────────────────── -->
	<nav class="location-filter" aria-label="Filtrer par emplacement">
		<a href="/" class="chip" class:chip-active={data.locationFilter === null}>{t.home_filter_all}</a
		>
		<a href="/?location=fridge" class="chip" class:chip-active={data.locationFilter === 'fridge'}
			>{t.add_location_fridge}</a
		>
		<a href="/?location=pantry" class="chip" class:chip-active={data.locationFilter === 'pantry'}
			>{t.add_location_pantry}</a
		>
		<a href="/?location=freezer" class="chip" class:chip-active={data.locationFilter === 'freezer'}
			>{t.add_location_freezer}</a
		>
	</nav>

	{@const allEmpty =
		data.groups.urgent.length === 0 && data.groups.soon.length === 0 && data.groups.ok.length === 0}

	{#if allEmpty}
		<!-- ── Empty state ────────────────────────────────────────────────── -->
		<div class="empty-state">
			<p>{t.home_empty}</p>
			<a href="/add" class="btn-add">{t.home_add_item}</a>
		</div>
	{:else}
		<!-- ── Urgent band ─────────────────────────────────────────────────── -->
		{#if data.groups.urgent.length > 0}
			<section class="band band-urgent">
				<h2 class="band-title">
					<span class="band-dot" aria-hidden="true"></span>
					{t.home_band_urgent}
				</h2>
				<ul class="item-list">
					{#each data.groups.urgent as item (item.id)}
						<li class="item-row">
							{@render thumb(item, '🍽️')}
							<div class="item-info">
								<span class="item-name">{item.name}</span>
								<span class="item-sub">
									{#if item.location === 'fridge'}
										{t.add_location_fridge}
									{:else if item.location === 'freezer'}
										{t.add_location_freezer}
									{:else}
										{t.add_location_pantry}
									{/if}
									{#if item.dateKind && item.effectiveDate}
										·
										{item.dateKind === 'DLC' ? t.dlc_label : t.ddm_label}
										{new Intl.DateTimeFormat(data.locale, { dateStyle: 'short' }).format(
											new Date(item.effectiveDate)
										)}
									{/if}
								</span>
							</div>
							<span class="pill pill-urgent">{t.home_band_urgent}</span>
							<div class="item-actions">
								<form method="POST" action="?/consume" class="action-form">
									<input type="hidden" name="id" value={item.id} />
									<button type="submit" class="btn-action btn-consume">{t.lifecycle_ate}</button>
								</form>
								<form method="POST" action="?/discard" class="action-form">
									<input type="hidden" name="id" value={item.id} />
									<button type="submit" class="btn-action btn-discard">{t.lifecycle_tossed}</button>
								</form>
							</div>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<!-- ── Soon band ───────────────────────────────────────────────────── -->
		{#if data.groups.soon.length > 0}
			<section class="band band-soon">
				<h2 class="band-title">
					<span class="band-dot" aria-hidden="true"></span>
					{t.home_band_soon}
				</h2>
				<ul class="item-list">
					{#each data.groups.soon as item (item.id)}
						<li class="item-row">
							{@render thumb(item, '🕐')}
							<div class="item-info">
								<span class="item-name">{item.name}</span>
								<span class="item-sub">
									{#if item.location === 'fridge'}
										{t.add_location_fridge}
									{:else if item.location === 'freezer'}
										{t.add_location_freezer}
									{:else}
										{t.add_location_pantry}
									{/if}
									{#if item.dateKind && item.effectiveDate}
										·
										{item.dateKind === 'DLC' ? t.dlc_label : t.ddm_label}
										{new Intl.DateTimeFormat(data.locale, { dateStyle: 'short' }).format(
											new Date(item.effectiveDate)
										)}
									{/if}
								</span>
							</div>
							<span class="pill pill-soon">{t.home_band_soon}</span>
							<div class="item-actions">
								<form method="POST" action="?/consume" class="action-form">
									<input type="hidden" name="id" value={item.id} />
									<button type="submit" class="btn-action btn-consume">{t.lifecycle_ate}</button>
								</form>
								<form method="POST" action="?/discard" class="action-form">
									<input type="hidden" name="id" value={item.id} />
									<button type="submit" class="btn-action btn-discard">{t.lifecycle_tossed}</button>
								</form>
							</div>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<!-- ── OK band (hidden when the push deep-link asks for expiring-only) ─ -->
		{#if data.groups.ok.length > 0 && !data.expiringOnly}
			<section class="band band-ok">
				<h2 class="band-title">
					<span class="band-dot" aria-hidden="true"></span>
					{t.home_band_ok}
				</h2>
				<ul class="item-list">
					{#each data.groups.ok as item (item.id)}
						<li class="item-row">
							{@render thumb(item, '✅')}
							<div class="item-info">
								<span class="item-name">{item.name}</span>
								<span class="item-sub">
									{#if item.location === 'fridge'}
										{t.add_location_fridge}
									{:else if item.location === 'freezer'}
										{t.add_location_freezer}
									{:else}
										{t.add_location_pantry}
									{/if}
									{#if item.dateKind && item.effectiveDate}
										·
										{item.dateKind === 'DLC' ? t.dlc_label : t.ddm_label}
										{new Intl.DateTimeFormat(data.locale, { dateStyle: 'short' }).format(
											new Date(item.effectiveDate)
										)}
									{/if}
								</span>
							</div>
							<span class="pill pill-ok">{t.home_band_ok}</span>
							<div class="item-actions">
								<form method="POST" action="?/consume" class="action-form">
									<input type="hidden" name="id" value={item.id} />
									<button type="submit" class="btn-action btn-consume">{t.lifecycle_ate}</button>
								</form>
								<form method="POST" action="?/discard" class="action-form">
									<input type="hidden" name="id" value={item.id} />
									<button type="submit" class="btn-action btn-discard">{t.lifecycle_tossed}</button>
								</form>
							</div>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	{/if}
{/if}

<style>
	/* ── Header ──────────────────────────────────────────────────────────── */
	.home-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.home-title {
		font-size: 1.5rem;
		font-weight: 800;
		letter-spacing: -0.01em;
		margin: 0;
	}

	/* ── Add button ──────────────────────────────────────────────────────── */
	.btn-add {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		flex-shrink: 0;
		padding: 0.6rem 1.1rem;
		background: var(--green);
		color: #fff;
		border-radius: var(--radius-pill);
		text-decoration: none;
		font-weight: 700;
		font-size: 0.98rem;
		box-shadow: var(--shadow-sm);
		transition: background 0.15s;
	}

	.btn-add:hover {
		background: var(--green-dark);
		text-decoration: none;
	}

	/* ── Location filter chips ───────────────────────────────────────────── */
	.location-filter {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-bottom: 1.5rem;
	}

	.chip {
		display: inline-block;
		padding: 0.35rem 0.85rem;
		border-radius: var(--radius-pill);
		border: 1px solid var(--border-strong);
		background: var(--surface);
		color: var(--text);
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 600;
		transition:
			background 0.1s,
			border-color 0.1s;
	}

	.chip:hover {
		background: var(--surface-2);
		text-decoration: none;
	}

	.chip-active {
		background: var(--green);
		color: #fff;
		border-color: var(--green);
	}

	.chip-active:hover {
		background: var(--green-dark);
	}

	/* ── Empty state ─────────────────────────────────────────────────────── */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.25rem;
		padding: 3.5rem 1rem;
		text-align: center;
		color: var(--text-muted);
	}

	/* ── Bands ───────────────────────────────────────────────────────────── */
	.band {
		margin-bottom: 2rem;
	}

	.band-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin-bottom: 0.6rem;
	}

	.band-dot {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		display: inline-block;
	}

	.band-urgent .band-dot {
		background: var(--red);
	}
	.band-urgent .band-title {
		color: var(--red-dark);
	}

	.band-soon .band-dot {
		background: var(--amber);
	}
	.band-soon .band-title {
		color: var(--amber-dark);
	}

	.band-ok .band-dot {
		background: var(--green);
	}
	.band-ok .band-title {
		color: var(--green-dark);
	}

	/* ── Item list ───────────────────────────────────────────────────────── */
	.item-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.item-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.7rem 0.85rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		box-shadow: var(--shadow-sm);
	}

	.item-thumb {
		font-size: 1.5rem;
		flex-shrink: 0;
		width: 2.25rem;
		height: 2.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--surface-2);
		border-radius: var(--radius-sm);
	}

	.item-thumb-img {
		flex-shrink: 0;
		width: 2.25rem;
		height: 2.25rem;
		object-fit: cover;
		border-radius: var(--radius-sm);
		background: var(--surface-2);
	}

	.item-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.item-name {
		font-weight: 700;
		font-size: 0.97rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.item-sub {
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	/* ── Pills ───────────────────────────────────────────────────────────── */
	.pill {
		flex-shrink: 0;
		padding: 0.22rem 0.6rem;
		border-radius: var(--radius-pill);
		font-size: 0.72rem;
		font-weight: 700;
		white-space: nowrap;
	}

	.pill-urgent {
		background: var(--red-tint);
		color: var(--red-dark);
	}
	.pill-soon {
		background: var(--amber-tint);
		color: var(--amber-dark);
	}
	.pill-ok {
		background: var(--green-tint);
		color: var(--green-dark);
	}

	/* ── Action buttons ──────────────────────────────────────────────────── */
	.item-actions {
		display: flex;
		gap: 0.4rem;
		flex-shrink: 0;
	}

	.action-form {
		display: contents;
	}

	.btn-action {
		padding: 0.35rem 0.6rem;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-pill);
		background: var(--surface);
		color: var(--text);
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
		transition: background 0.1s;
	}

	.btn-consume:hover {
		background: var(--green-tint);
		border-color: var(--green);
		color: var(--green-dark);
	}

	.btn-discard:hover {
		background: var(--red-tint);
		border-color: var(--red);
		color: var(--red-dark);
	}
</style>
