<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">
	<defs>
		<symbol id="gm-home" viewBox="0 0 24 24"><path d="M3 11l9-8 9 8M5 10v10h14V10" /></symbol>
		<symbol id="gm-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></symbol>
		<symbol id="gm-user" viewBox="0 0 24 24"
			><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></symbol
		>
		<symbol id="gm-settings" viewBox="0 0 24 24"
			><circle cx="12" cy="12" r="3" /><path
				d="M19.4 13a7.5 7.5 0 0 0 0-2l2-1.5-2-3.4-2.4 1a7.5 7.5 0 0 0-1.7-1L15 3h-4l-.3 2.6a7.5 7.5 0 0 0-1.7 1l-2.4-1-2 3.4L6.6 11a7.5 7.5 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7.5 7.5 0 0 0 1.7 1L11 21h4l.3-2.6a7.5 7.5 0 0 0 1.7-1l2.4 1 2-3.4z"
			/></symbol
		>
		<symbol id="gm-households" viewBox="0 0 24 24"
			><circle cx="9" cy="8" r="3.2" /><path
				d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5M16 11a3 3 0 0 0 0-6M17.5 20c0-2.6-1-4-2.5-4.7"
			/></symbol
		>
		<symbol id="gm-scan" viewBox="0 0 24 24"
			><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 9v6M11 9v6M15 9v6" /></symbol
		>
		<symbol id="gm-bell" viewBox="0 0 24 24"
			><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></symbol
		>
		<symbol id="gm-key" viewBox="0 0 24 24"
			><circle cx="8" cy="8" r="4" /><path d="M11 11l9 9M17 17l2-2M14 14l2-2" /></symbol
		>
		<symbol id="gm-edit" viewBox="0 0 24 24"><path d="M4 20h4L18 10l-4-4L4 16zM14 6l4 4" /></symbol>
		<symbol id="gm-trash" viewBox="0 0 24 24"
			><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></symbol
		>
		<symbol id="gm-check" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></symbol>
		<symbol id="gm-x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></symbol>
		<symbol id="gm-logout" viewBox="0 0 24 24"
			><path d="M9 21H5V3h4M16 17l5-5-5-5M21 12H9" /></symbol
		>
		<symbol id="gm-chevron-right" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></symbol>
		<symbol id="gm-search" viewBox="0 0 24 24"
			><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></symbol
		>
		<symbol id="gm-sun" viewBox="0 0 24 24"
			><circle cx="12" cy="12" r="4" /><path
				d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"
			/></symbol
		>
		<symbol id="gm-moon" viewBox="0 0 24 24"
			><path d="M21 12.8A8 8 0 1 1 11.2 3a6 6 0 0 0 9.8 9.8z" /></symbol
		>
		<symbol id="gm-monitor" viewBox="0 0 24 24"
			><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></symbol
		>
		<symbol id="gm-stats" viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M21 20H3" /></symbol
		>
		<symbol id="gm-cat-fruit" viewBox="0 0 24 24"
			><path d="M12 8c1-3 4-4 6-3 1 4-1 9-4 11-1 .7-3 .7-4 0C7 14 5 9 6 5c2-1 5 0 6 3z" /><path
				d="M12 8V4"
			/></symbol
		>
		<symbol id="gm-cat-veg" viewBox="0 0 24 24"
			><path d="M5 13c0 4 3 7 7 7s7-3 7-7-3-6-7-6-7 2-7 6z" /><path
				d="M12 7c0-2 1-3 3-4M12 7c0-1-1-2-3-3"
			/></symbol
		>
		<symbol id="gm-cat-herb" viewBox="0 0 24 24"
			><path d="M12 21V9" /><path
				d="M12 12c-3 0-5-2-5-5 3 0 5 2 5 5zM12 10c3 0 5-2 5-5-3 0-5 2-5 5z"
			/></symbol
		>
		<symbol id="gm-cat-charcuterie" viewBox="0 0 24 24"
			><circle cx="12" cy="12" r="8" /><circle cx="9" cy="10" r="1" /><circle
				cx="14"
				cy="13"
				r="1"
			/><circle cx="11" cy="15" r="1" /></symbol
		>
		<symbol id="gm-cat-fish" viewBox="0 0 24 24"
			><path d="M3 12c4-5 11-5 15 0-4 5-11 5-15 0z" /><path
				d="M18 12c1-1 3-2 3-2v4s-2-1-3-2z"
			/><circle cx="8" cy="12" r="1" /></symbol
		>
		<symbol id="gm-cat-dairy" viewBox="0 0 24 24"
			><path d="M8 3h8l-1 4v12a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V7z" /><path d="M9 9h6" /></symbol
		>
		<symbol id="gm-cat-meat" viewBox="0 0 24 24"
			><path
				d="M14 4a5 5 0 0 1 5 5c0 3-3 5-6 6-2 .7-4 2-5 4-1-1-2-3-1-5 1-3 3-5 6-6a5 5 0 0 1 1-4z"
			/><circle cx="7" cy="17" r="2" /></symbol
		>
		<symbol id="gm-cat-poultry" viewBox="0 0 24 24"
			><path d="M6 20c0-5 3-9 8-9 3 0 5 2 5 5 0 4-4 4-4 4z" /><path
				d="M14 11c0-2-1-4-3-4M11 7l-2-2"
			/></symbol
		>
		<symbol id="gm-cat-egg" viewBox="0 0 24 24"
			><path d="M12 3c3 0 6 5 6 9a6 6 0 0 1-12 0c0-4 3-9 6-9z" /></symbol
		>
		<symbol id="gm-cat-bakery" viewBox="0 0 24 24"
			><path d="M4 13c0-3 4-5 8-5s8 2 8 5c0 2-2 3-2 3H6s-2-1-2-3z" /><path
				d="M9 11l1 5M13 11l1 5"
			/></symbol
		>
		<symbol id="gm-cat-pantry" viewBox="0 0 24 24"
			><path d="M6 8h12l-1 12H7z" /><path d="M9 8V5a3 3 0 0 1 6 0v3" /></symbol
		>
		<symbol id="gm-cat-leftovers" viewBox="0 0 24 24"
			><path d="M4 11h16a8 8 0 0 1-16 0z" /><path d="M5 11a7 7 0 0 1 14 0M12 4v3" /><path
				d="M3 20h18"
			/></symbol
		>
	</defs>
</svg>

{@render children()}
