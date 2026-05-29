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
	</defs>
</svg>

{@render children()}
