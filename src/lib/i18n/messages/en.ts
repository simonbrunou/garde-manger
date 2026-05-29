import type { Messages } from './fr';

// EN mirrors every key from FR. TypeScript enforces identical shapes.
export const en: Messages = {
	// --- Navigation ---
	nav_account: 'Account',
	nav_logout: 'Log out',
	nav_households: 'Households',
	nav_switch_household: 'Switch',
	nav_household_label: 'Household:',
	nav_create_household: 'Create a household',

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

	// --- Invite page ---
	invite_title: 'Invite a member',
	invite_role_label: 'Role',
	invite_role_member: 'Member',
	invite_role_admin: 'Administrator',
	invite_submit: 'Generate an invitation link',
	invite_link_section_title: 'Invitation link generated',
	invite_link_instructions: 'Share this link with the person you want to invite:',
	invite_back: '← Back to members',
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
	home_greeting: (name: string) => `Hello, ${name} 👋`,
	home_active_household: 'Active household:',
	home_no_household: 'You do not have a household yet.',
	home_create_or_join: 'Create or join a household →',
	home_inventory_placeholder: '🧺 Your inventory is coming soon (M2)',

	// --- M2 inventory bands ---
	home_band_urgent: 'Consume soon',
	home_band_soon: 'Coming up',
	home_band_ok: 'Still good',

	// --- M2 home screen ---
	home_empty: 'Your pantry is empty. Add your first item!',
	home_add_item: '＋ Add',
	home_filter_all: 'All',

	// --- M2 add item ---
	add_title: 'Add a food item',
	add_no_household: 'No active household. Create or join a household to add items.',
	add_method_scanner: 'Scanner',
	add_method_scanner_soon: 'coming soon (M3)',
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
	add_cancel: 'Cancel',
	add_food_not_found: 'Food not found.',
	add_error_generic: 'An error occurred.',

	// --- M2 lifecycle ---
	lifecycle_ate: 'Eaten',
	lifecycle_tossed: 'Tossed',

	// --- M2 date labels ---
	dlc_label: 'Use by',
	ddm_label: 'Best before',

	// --- M2 item count ---
	items_count: (n: number) => `${n} ${n === 1 ? 'item' : 'items'}`,

	// --- M3 scan ---
	scan_title: 'Scan a product',
	scan_instructions: 'Point the camera at the product barcode.',
	scan_starting: 'Starting the camera…',
	scan_searching: 'Looking for a barcode…',
	scan_detected: 'Barcode detected, opening…',
	scan_camera_denied: 'Camera denied or unavailable. Enter the barcode below.',
	scan_camera_unsupported: 'The camera is not available here. Enter the barcode below.',
	scan_enable_camera: 'Enable the camera',
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
	scan_name_required: 'The product name is required.',
	scan_error_generic: 'Something went wrong.'
};
