import type { Messages } from './fr';

// EN mirrors every key from FR. TypeScript enforces identical shapes.
export const en: Messages = {
	// --- Navigation ---
	nav_create_household: 'Create a household',

	// --- Navigation (bottom nav) ---
	nav_home: 'Pantry',
	nav_add: 'Add',
	nav_settings: 'Settings',
	nav_household_switcher: 'Switch household',
	nav_primary: 'Main navigation',

	// --- Auth: Login ---
	auth_login_title: 'Log in',
	auth_login_submit: 'Log in',
	auth_login_no_account: "Don't have an account? Sign up",
	auth_email_label: 'Email address',
	auth_password_label: 'Password',
	auth_invalid_credentials: 'Invalid credentials',

	// --- Auth: Signup ---
	auth_signup_title: 'Create an account',
	auth_signup_submit: 'Create my account',
	auth_signup_have_account: 'Already have an account? Log in',
	auth_display_name_label: 'Display name',
	auth_new_password_label: 'Password',
	auth_email_already_used: 'An account already exists with this email',

	// --- Account page ---
	account_title: 'My account',
	account_profile_section: 'Profile',
	account_passkeys_section: 'Passkeys',
	account_display_name_label: 'Display name',
	account_locale_label: 'Language',
	account_locale_fr: 'Français',
	account_locale_en: 'English',
	account_save: 'Save',
	account_profile_updated: 'Profile updated.',
	account_no_passkeys: 'No passkeys registered.',
	account_passkey_added: 'added on',
	account_passkey_last_used: 'last used on',
	account_passkey_delete: 'Delete',
	account_display_name_required: 'Name required',
	account_passkey_id_missing: 'Missing identifier',

	// --- Theme ---
	account_theme_section: 'Theme',
	theme_auto: 'Auto',
	theme_light: 'Light',
	theme_dark: 'Dark',

	// --- Account extras ---
	account_households_section: 'My households',
	account_manage_households: 'Manage households',
	account_session_section: 'Session',
	account_logout: 'Log out',

	// --- Households page ---
	households_title: 'My households',
	households_no_household: 'You do not belong to any household. Create one below.',
	households_create_section: 'Create a household',
	households_name_label: 'Household name',
	households_name_placeholder: 'My household',
	households_create_submit: 'Create',
	households_name_required: 'Household name is required',
	households_invalid: 'Invalid household',
	households_not_member: 'You are not a member of this household',

	// --- Members page ---
	members_title_suffix: '— Members',
	members_since: 'Member since',
	members_invite_link: 'Invite a member',
	members_back: '← Back to households',

	// --- Manage household (admin hub) ---
	manage_settings_section: 'Settings',
	manage_warn_days_label: 'Warning days before expiry',
	manage_settings_saved: 'Settings saved.',
	manage_settings_invalid: 'Invalid name or number of days.',
	manage_members_section: 'Members',
	manage_promote: 'Make admin',
	manage_demote: 'Make member',
	manage_remove_member: 'Remove',
	manage_leave: 'Leave household',
	manage_last_admin: 'The household must keep at least one admin.',
	manage_member_not_found: 'Member not found.',
	manage_invites_section: 'Pending invitations',
	manage_invites_empty: 'No pending invitations.',
	manage_invite_expires: 'expires',
	manage_invite_revoke: 'Revoke',
	manage_invite_revoke_failed: 'Could not revoke this invitation.',
	manage_danger_section: 'Danger zone',
	manage_delete_warning:
		'Deleting this household permanently removes its inventory, members, and invitations. This cannot be undone.',
	manage_delete_confirm_label: 'Type the household name to confirm',
	manage_delete_button: 'Delete household',
	manage_delete_name_mismatch: 'The name you typed does not match.',
	manage_forbidden: 'Admins only.',

	// --- Invite page ---
	invite_title: 'Invite a member',
	invite_role_label: 'Role',
	invite_role_member: 'Member',
	invite_role_admin: 'Administrator',
	invite_submit: 'Generate an invitation link',
	invite_link_section_title: 'Invitation link generated',
	invite_link_instructions: 'Share this link with the person you want to invite:',
	invite_back: '← Back to household',
	invite_admin_only: 'Administrators only',
	invite_access_denied: 'Access denied',

	// --- Join page ---
	join_invalid_title: 'Invalid invitation link',
	join_joining_title: 'Joining household…',
	join_redirecting: 'Redirecting…',
	join_back_home: '← Back to home',
	join_error_not_found: 'This invitation link is invalid or does not exist.',
	join_error_already_used: 'This invitation link has already been used.',
	join_error_expired: 'This invitation link has expired.',
	join_error_generic: 'An error occurred with this invitation link.',

	// --- Home page ---
	home_no_household: 'You do not have a household yet.',
	home_create_or_join: 'Create or join a household →',

	// --- M2 inventory bands ---
	home_band_urgent: 'Consume soon',
	home_band_soon: 'Coming up',
	home_band_ok: 'Still good',

	// --- M2 home screen ---
	home_filter_all: 'All',

	// --- M2 add item ---
	add_title: 'Add a food item',
	add_no_household: 'No active household. Create or join a household to add items.',
	add_method_scanner: 'Scanner',
	add_method_fresh: 'Fruit / Vegetable / Fresh produce',
	add_method_custom: 'Free entry',
	add_search_label: 'Search for a food',
	add_search_placeholder: 'e.g. apple, tomato…',
	add_search_submit: 'Search',
	add_no_results: 'No results.',
	add_fresh_form_title: 'Add',
	add_location_label: 'Location',
	add_location_pantry: 'Pantry',
	add_location_fridge: 'Refrigerator',
	add_location_freezer: 'Freezer',
	add_estimate_prefix: '≈',
	add_estimate_note: 'Estimated best-before — ADEME / SpF source, editable',
	add_estimate_guidance: 'Storage not recommended at this location.',
	add_bestby_label: 'Best before (BBD)',
	add_useby_label: 'Use by (expiry)',
	add_quantity_label: 'Quantity',
	add_optional: 'optional',
	add_fresh_submit: 'Add to pantry',
	add_custom_name_label: 'Name',
	add_custom_name_placeholder: 'e.g. Homemade jam…',
	add_custom_submit: 'Add',
	add_change_food: '← Change food',
	add_food_not_found: 'Food not found.',
	add_error_generic: 'An error occurred.',

	// --- M2 lifecycle ---
	lifecycle_ate: 'Eaten',
	lifecycle_tossed: 'Tossed',

	// --- M2 date labels ---
	dlc_label: 'Use by',
	ddm_label: 'Best before',

	// --- M3 scan ---
	scan_title: 'Scan a product',
	scan_instructions: 'Point the camera at the product barcode.',
	scan_starting: 'Starting the camera…',
	scan_searching: 'Looking for a barcode…',
	scan_detected: 'Barcode detected, opening…',
	scan_camera_denied: 'Camera denied or unavailable. Enter the barcode below.',
	scan_camera_unsupported: 'The camera is not available here. Enter the barcode below.',
	scan_manual_title: 'Enter the barcode',
	scan_manual_label: 'Barcode (EAN / UPC)',
	scan_manual_placeholder: 'e.g. 3017620422003',
	scan_manual_submit: 'Look up',
	scan_manual_invalid: 'Invalid barcode.',
	scan_or_freetext: 'No barcode? Add it manually',
	scan_confirm_title: 'Confirm the product',
	scan_barcode_label: 'Barcode',
	scan_name_label: 'Product name',
	scan_brand_label: 'Brand',
	scan_product_unknown: 'Unknown product in Open Food Facts. Enter its name.',
	scan_off_unavailable:
		'Open Food Facts is unavailable right now. You can enter the product manually.',
	scan_dlc_label: 'Use-by date',
	scan_dlc_hint: 'The date printed on the packaging (“use by”).',
	scan_dlc_required: 'A use-by date is required for a packaged product.',
	scan_add_submit: 'Add to the pantry',
	scan_attribution: 'Data © Open Food Facts (ODbL) · photo CC-BY-SA 3.0',
	scan_back: 'Scan another product',
	scan_error_generic: 'Something went wrong.',

	// --- Day badge / item detail (M7) ---
	day_today: 'Today',
	day_overdue: 'Overdue',
	day_unit: 'd',
	home_subtitle: (n: number, urgent: number) =>
		`${n} ${n > 1 ? 'items' : 'item'}${urgent > 0 ? ` · ${urgent} to eat soon` : ''}`,
	home_empty_title: 'Pantry is empty',
	home_empty_body: 'Add your first item with the + button.',
	item_detail_title: 'Item detail',
	item_added_on: 'Added on',
	item_notes_label: 'Notes',
	item_notes_placeholder: 'Opened, finish soon…',
	item_save: 'Save',
	item_delete: 'Delete item',
	item_delete_confirm: 'Confirm deletion',
	item_back: '← Back',

	// --- M4 notifications & PWA ---
	notif_section_title: 'Notifications',
	notif_explainer: 'Get a daily reminder of items to use up soon.',
	notif_enable: 'Enable notifications',
	notif_disable: 'Disable notifications',
	notif_enabled: 'Notifications enabled on this device.',
	notif_denied: 'Notifications are blocked. Allow them in your browser settings.',
	notif_unsupported: 'This device does not support push notifications.',
	notif_ios_install_title: 'Install the app to enable notifications',
	notif_ios_install_steps:
		'On iPhone: tap Share, then “Add to Home Screen”. Then open the installed app to enable notifications.',
	notif_reconnect: 'Reconnect notifications',
	notif_working: 'Please wait…',
	notif_error: 'Could not change notifications. Please try again.',
	offline_banner: 'Offline — view only',

	// --- Bilan (M9) ---
	nav_bilan: 'Stats',
	bilan_title: 'Waste report',
	bilan_month_subtitle: 'This month',
	bilan_eaten: 'Eaten',
	bilan_wasted: 'Wasted',
	bilan_streak: (n: number) => `${n} day${n > 1 ? 's' : ''} waste-free`,
	bilan_streak_none: 'No waste recorded yet 🎉',
	bilan_empty_title: 'Nothing to report yet',
	bilan_empty_body: 'Mark items as eaten or thrown away to track your waste.',

	// --- Cuisiner (M10) ---
	nav_cuisiner: 'Cook',
	cuisiner_title: 'Cook',
	cuisiner_subtitle: 'Ideas for items to use up soon',
	cuisiner_empty_title: 'Nothing to use up',
	cuisiner_empty_body: 'No items need using up right now.',
	bilan_streak_zero: 'Back to zero — fresh start!',

	// --- Landing (public) ---
	landing_hero_title: 'Stop wasting food. Cook what you have.',
	landing_hero_subtitle:
		'Track your pantry, get alerted before things expire, and find what to cook — in seconds.',
	landing_cta_signup: 'Create account',
	landing_cta_login: 'Log in',
	landing_feature_stock_title: 'Track your stock',
	landing_feature_stock_body: 'See at a glance what you have left.',
	landing_feature_expiry_title: 'Expiry alerts',
	landing_feature_expiry_body: 'Get notified before food goes bad.',
	landing_feature_scan_title: 'Barcode scan',
	landing_feature_scan_body: 'Add a product just by scanning it.',
	landing_feature_cook_title: 'Recipe ideas',
	landing_feature_cook_body: "Cook from what's already in your kitchen.",
	landing_closing_prompt: 'Ready to stop wasting food?',
	landing_meta_description: 'Garde-Manger — track your food stock, cut waste, and cook smart.'
};
