// FR is the canonical source locale. All keys defined here must be mirrored in en.ts.
export const fr: Messages = {
	// --- Navigation ---
	nav_account: 'Compte',
	nav_logout: 'Se déconnecter',
	nav_households: 'Foyers',
	nav_switch_household: 'Changer',
	nav_household_label: 'Foyer :',
	nav_create_household: 'Créer un foyer',

	// --- Auth: Login ---
	auth_login_title: 'Se connecter',
	auth_login_submit: 'Se connecter',
	auth_login_no_account: "Pas encore de compte ? S'inscrire",
	auth_email_label: 'Adresse e-mail',
	auth_password_label: 'Mot de passe',
	auth_invalid_credentials: 'Identifiants invalides',

	// --- Auth: Signup ---
	auth_signup_title: 'Créer un compte',
	auth_signup_submit: 'Créer mon compte',
	auth_signup_have_account: 'Déjà un compte ? Se connecter',
	auth_display_name_label: 'Nom affiché',
	auth_new_password_label: 'Mot de passe',
	auth_email_already_used: 'Un compte existe déjà avec cet email',

	// --- Account page ---
	account_title: 'Mon compte',
	account_profile_section: 'Profil',
	account_passkeys_section: 'Passkeys',
	account_display_name_label: 'Nom affiché',
	account_locale_label: 'Langue',
	account_locale_fr: 'Français',
	account_locale_en: 'English',
	account_save: 'Enregistrer',
	account_profile_updated: 'Profil mis à jour.',
	account_no_passkeys: 'Aucune passkey enregistrée.',
	account_passkey_added: 'ajoutée le',
	account_passkey_last_used: 'dernière utilisation le',
	account_passkey_delete: 'Supprimer',
	account_display_name_required: 'Nom requis',
	account_passkey_id_missing: 'Identifiant manquant',

	// --- Households page ---
	households_title: 'Mes foyers',
	households_no_household: "Vous n'appartenez à aucun foyer. Créez-en un ci-dessous.",
	households_create_section: 'Créer un foyer',
	households_name_label: 'Nom du foyer',
	households_name_placeholder: 'Mon foyer',
	households_create_submit: 'Créer',
	households_name_required: 'Le nom du foyer est requis',
	households_invalid: 'Foyer invalide',
	households_not_member: "Vous n'êtes pas membre de ce foyer",

	// --- Members page ---
	members_title_suffix: '— Membres',
	members_since: 'Membre depuis',
	members_invite_link: 'Inviter un membre',
	members_back: '← Retour aux foyers',

	// --- Invite page ---
	invite_title: 'Inviter un membre',
	invite_role_label: 'Rôle',
	invite_role_member: 'Membre',
	invite_role_admin: 'Administrateur',
	invite_submit: "Générer un lien d'invitation",
	invite_link_section_title: "Lien d'invitation généré",
	invite_link_instructions: 'Partage ce lien avec la personne à inviter :',
	invite_back: '← Retour aux membres',
	invite_admin_only: 'Réservé aux administrateurs',
	invite_access_denied: 'Accès refusé',

	// --- Join page ---
	join_invalid_title: "Lien d'invitation invalide",
	join_joining_title: 'Rejoindre le foyer…',
	join_redirecting: 'Redirection en cours.',
	join_back_home: "← Retour à l'accueil",
	join_error_not_found: "Ce lien d'invitation est invalide ou n'existe pas.",
	join_error_already_used: "Ce lien d'invitation a déjà été utilisé.",
	join_error_expired: "Ce lien d'invitation a expiré.",
	join_error_generic: "Une erreur est survenue avec ce lien d'invitation.",

	// --- Home page ---
	home_greeting: (name: string) => `Bonjour, ${name} 👋`,
	home_active_household: 'Foyer actif :',
	home_no_household: "Vous n'avez pas encore de foyer.",
	home_create_or_join: 'Créer ou rejoindre un foyer →',
	home_inventory_placeholder: '🧺 Ton inventaire arrive bientôt (M2)',

	// --- M2 inventory bands ---
	home_band_urgent: 'À consommer vite',
	home_band_soon: 'Bientôt',
	home_band_ok: 'Encore bon',

	// --- M2 add item ---
	add_title: 'Ajouter un aliment',

	// --- M2 lifecycle ---
	lifecycle_ate: "J'ai mangé",
	lifecycle_tossed: 'Jeté',

	// --- M2 date labels ---
	dlc_label: 'DLC',
	ddm_label: 'DDM',

	// --- M2 item count ---
	items_count: (n: number) => `${n} ${n > 1 ? 'aliments' : 'aliment'}`
};

// Messages interface uses widened types so EN can satisfy it with different string values.
export interface Messages {
	// --- Navigation ---
	nav_account: string;
	nav_logout: string;
	nav_households: string;
	nav_switch_household: string;
	nav_household_label: string;
	nav_create_household: string;
	// --- Auth: Login ---
	auth_login_title: string;
	auth_login_submit: string;
	auth_login_no_account: string;
	auth_email_label: string;
	auth_password_label: string;
	auth_invalid_credentials: string;
	// --- Auth: Signup ---
	auth_signup_title: string;
	auth_signup_submit: string;
	auth_signup_have_account: string;
	auth_display_name_label: string;
	auth_new_password_label: string;
	auth_email_already_used: string;
	// --- Account page ---
	account_title: string;
	account_profile_section: string;
	account_passkeys_section: string;
	account_display_name_label: string;
	account_locale_label: string;
	account_locale_fr: string;
	account_locale_en: string;
	account_save: string;
	account_profile_updated: string;
	account_no_passkeys: string;
	account_passkey_added: string;
	account_passkey_last_used: string;
	account_passkey_delete: string;
	account_display_name_required: string;
	account_passkey_id_missing: string;
	// --- Households page ---
	households_title: string;
	households_no_household: string;
	households_create_section: string;
	households_name_label: string;
	households_name_placeholder: string;
	households_create_submit: string;
	households_name_required: string;
	households_invalid: string;
	households_not_member: string;
	// --- Members page ---
	members_title_suffix: string;
	members_since: string;
	members_invite_link: string;
	members_back: string;
	// --- Invite page ---
	invite_title: string;
	invite_role_label: string;
	invite_role_member: string;
	invite_role_admin: string;
	invite_submit: string;
	invite_link_section_title: string;
	invite_link_instructions: string;
	invite_back: string;
	invite_admin_only: string;
	invite_access_denied: string;
	// --- Join page ---
	join_invalid_title: string;
	join_joining_title: string;
	join_redirecting: string;
	join_back_home: string;
	join_error_not_found: string;
	join_error_already_used: string;
	join_error_expired: string;
	join_error_generic: string;
	// --- Home page ---
	home_greeting: (name: string) => string;
	home_active_household: string;
	home_no_household: string;
	home_create_or_join: string;
	home_inventory_placeholder: string;
	// --- M2 inventory bands ---
	home_band_urgent: string;
	home_band_soon: string;
	home_band_ok: string;
	// --- M2 add item ---
	add_title: string;
	// --- M2 lifecycle ---
	lifecycle_ate: string;
	lifecycle_tossed: string;
	// --- M2 date labels ---
	dlc_label: string;
	ddm_label: string;
	// --- M2 item count ---
	items_count: (n: number) => string;
}
