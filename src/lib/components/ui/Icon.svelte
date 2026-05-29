<script lang="ts">
	export type IconName =
		| 'home'
		| 'plus'
		| 'user'
		| 'settings'
		| 'households'
		| 'scan'
		| 'bell'
		| 'key'
		| 'edit'
		| 'trash'
		| 'check'
		| 'x'
		| 'logout'
		| 'chevron-right'
		| 'search'
		| 'sun'
		| 'moon'
		| 'monitor'
		| 'cat-fruit'
		| 'cat-veg'
		| 'cat-herb'
		| 'cat-charcuterie'
		| 'cat-fish'
		| 'cat-dairy'
		| 'cat-meat'
		| 'cat-poultry'
		| 'cat-egg'
		| 'cat-bakery'
		| 'cat-pantry'
		| 'cat-leftovers';

	let {
		name,
		size = 24,
		class: klass = ''
	}: { name: IconName; size?: number; class?: string } = $props();
</script>

<svg
	class="icon {klass}"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	aria-hidden="true"
	focusable="false"
>
	<use href={`#gm-${name}`} />
</svg>

<style>
	.icon {
		display: inline-block;
		flex: none;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
		vertical-align: middle;
	}
</style>
