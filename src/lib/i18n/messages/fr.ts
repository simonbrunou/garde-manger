// FR is the canonical source locale. All keys defined here must be mirrored in en.ts.
export const fr: Messages = {
	// --- Navigation ---
	nav_create_household: 'Créer un foyer',

	// --- Navigation (bottom nav) ---
	nav_home: 'Garde-manger',
	nav_back: 'Retour',
	nav_add: 'Ajouter',
	nav_settings: 'Réglages',
	nav_household_switcher: 'Changer de foyer',
	nav_primary: 'Navigation principale',
	action_cancel: 'Annuler',

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

	// --- Theme ---
	account_theme_section: 'Thème',
	theme_auto: 'Auto',
	theme_light: 'Clair',
	theme_dark: 'Sombre',

	// --- Account extras ---
	account_households_section: 'Mes foyers',
	account_manage_households: 'Gérer les foyers',
	account_session_section: 'Session',
	account_logout: 'Se déconnecter',

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

	// --- Manage household (admin hub) ---
	manage_settings_section: 'Paramètres',
	manage_warn_days_label: 'Jours d’alerte avant péremption',
	manage_settings_saved: 'Paramètres enregistrés.',
	manage_settings_invalid: 'Nom ou nombre de jours invalide.',
	manage_members_section: 'Membres',
	manage_promote: 'Promouvoir admin',
	manage_demote: 'Passer membre',
	manage_remove_member: 'Retirer',
	manage_leave: 'Quitter le foyer',
	manage_last_admin: 'Le foyer doit conserver au moins un admin.',
	manage_member_not_found: 'Membre introuvable.',
	manage_invites_section: 'Invitations en attente',
	manage_invites_empty: 'Aucune invitation en attente.',
	manage_invite_expires: 'expire le',
	manage_invite_revoke: 'Révoquer',
	manage_invite_revoke_failed: 'Impossible de révoquer cette invitation.',
	manage_danger_section: 'Zone de danger',
	manage_delete_warning:
		'Supprimer ce foyer effacera définitivement son inventaire, ses membres et ses invitations. Action irréversible.',
	manage_delete_confirm_label: 'Tapez le nom du foyer pour confirmer',
	manage_delete_button: 'Supprimer le foyer',
	manage_delete_name_mismatch: 'Le nom saisi ne correspond pas.',
	manage_forbidden: 'Action réservée aux admins.',

	// --- Invite page ---
	invite_title: 'Inviter un membre',
	invite_role_label: 'Rôle',
	invite_role_member: 'Membre',
	invite_role_admin: 'Administrateur',
	invite_submit: "Générer un lien d'invitation",
	invite_link_section_title: "Lien d'invitation généré",
	invite_link_instructions: 'Partage ce lien avec la personne à inviter :',
	invite_back: '← Retour au foyer',
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
	join_confirm_title: 'Rejoindre le foyer',
	join_confirm_prompt: 'Vous avez été invité à rejoindre',
	join_confirm_button: 'Rejoindre ce foyer',

	// --- Home page ---
	home_no_household: "Vous n'avez pas encore de foyer.",
	home_create_or_join: 'Créer ou rejoindre un foyer →',

	// --- M2 inventory bands ---
	home_band_urgent: 'À consommer vite',
	home_band_soon: 'Bientôt',
	home_band_ok: 'Encore bon',

	// --- M2 home screen ---
	home_filter_all: 'Tout',

	// --- M2 add item ---
	add_title: 'Ajouter un aliment',
	add_no_household: 'Aucun foyer actif. Créez ou rejoignez un foyer pour ajouter des aliments.',
	add_method_scanner: 'Scanner',
	add_method_fresh: 'Fruit / Légume / Frais',
	add_method_custom: 'Saisie libre',
	add_search_label: 'Rechercher un aliment',
	add_search_placeholder: 'ex. pomme, tomate…',
	add_search_submit: 'Rechercher',
	add_no_results: 'Aucun résultat.',
	add_fresh_form_title: 'Ajouter',
	add_location_label: 'Emplacement',
	add_location_pantry: 'Placard',
	add_location_fridge: 'Réfrigérateur',
	add_location_freezer: 'Congélateur',
	add_estimate_prefix: '≈',
	add_estimate_note: 'Estimation DDM — source ADEME / SpF, modifiable',
	add_estimate_guidance: 'Stockage non recommandé à cet emplacement.',
	add_bestby_label: 'DDM (date limite de consommation recommandée)',
	add_useby_label: 'DLC (date limite de consommation)',
	add_quantity_label: 'Quantité',
	add_optional: 'facultatif',
	add_fresh_submit: 'Ajouter au garde-manger',
	add_custom_name_label: 'Nom',
	add_custom_name_placeholder: 'ex. Confiture maison…',
	add_custom_submit: 'Ajouter',
	add_change_food: "← Changer d'aliment",
	add_food_not_found: 'Aliment introuvable.',
	add_error_generic: 'Une erreur est survenue.',

	// --- M2 lifecycle ---
	lifecycle_ate: "J'ai mangé",
	lifecycle_tossed: 'Jeté',

	// --- M2 date labels ---
	dlc_label: 'DLC',
	ddm_label: 'DDM',

	// --- M3 scan ---
	scan_title: 'Scanner un produit',
	scan_instructions: 'Visez le code-barres du produit avec la caméra.',
	scan_starting: 'Démarrage de la caméra…',
	scan_searching: 'Recherche du code-barres…',
	scan_detected: 'Code détecté, ouverture…',
	scan_camera_denied: 'Caméra refusée ou indisponible. Saisissez le code-barres ci-dessous.',
	scan_camera_unsupported:
		"La caméra n'est pas disponible ici. Saisissez le code-barres ci-dessous.",
	scan_manual_title: 'Saisir le code-barres',
	scan_manual_label: 'Code-barres (EAN / UPC)',
	scan_manual_placeholder: 'ex. 3017620422003',
	scan_manual_submit: 'Rechercher',
	scan_manual_invalid: 'Code-barres invalide.',
	scan_or_freetext: 'Produit sans code-barres ? Saisie libre',
	scan_confirm_title: 'Confirmer le produit',
	scan_barcode_label: 'Code-barres',
	scan_name_label: 'Nom du produit',
	scan_brand_label: 'Marque',
	scan_product_unknown: 'Produit inconnu dans Open Food Facts. Saisissez son nom.',
	scan_off_unavailable:
		'Open Food Facts est indisponible pour le moment. Vous pouvez saisir le produit manuellement.',
	scan_dlc_label: 'DLC — date limite de consommation',
	scan_dlc_hint: 'Date imprimée sur l’emballage (« à consommer jusqu’au »).',
	scan_dlc_required: 'La DLC est obligatoire pour un produit emballé.',
	scan_add_submit: 'Ajouter au garde-manger',
	scan_attribution: 'Données © Open Food Facts (ODbL) · photo CC-BY-SA 3.0',
	scan_back: 'Scanner un autre produit',
	scan_error_generic: 'Une erreur est survenue.',

	// --- Day badge / item detail (M7) ---
	day_today: 'Auj.',
	day_overdue: 'En retard',
	day_unit: 'j',
	home_subtitle: (n: number, urgent: number) =>
		`${n} ${n > 1 ? 'aliments' : 'aliment'}${urgent > 0 ? ` · ${urgent} à consommer vite` : ''}`,
	home_empty_title: 'Garde-manger vide',
	home_empty_body: 'Ajoutez un premier aliment avec le bouton +.',
	item_detail_title: "Détail de l'aliment",
	item_added_on: 'Ajouté le',
	item_notes_label: 'Notes',
	item_notes_placeholder: 'Entamé, à finir…',
	item_save: 'Enregistrer',
	item_delete: "Supprimer l'aliment",
	item_delete_confirm: 'Confirmer la suppression',
	item_back: '← Retour',

	// --- M4 notifications & PWA ---
	notif_section_title: 'Notifications',
	notif_explainer: 'Recevez un rappel quotidien des aliments à consommer bientôt.',
	notif_enable: 'Activer les notifications',
	notif_disable: 'Désactiver les notifications',
	notif_enabled: 'Notifications activées sur cet appareil.',
	notif_denied:
		'Les notifications sont bloquées. Autorisez-les dans les réglages de votre navigateur.',
	notif_unsupported: 'Cet appareil ne prend pas en charge les notifications push.',
	notif_ios_install_title: "Installez l'app pour activer les notifications",
	notif_ios_install_steps:
		"Sur iPhone : touchez Partager, puis « Sur l'écran d'accueil ». Ouvrez ensuite l'app installée pour activer les notifications.",
	notif_reconnect: 'Reconnecter les notifications',
	notif_working: 'Veuillez patienter…',
	notif_error: 'Impossible de modifier les notifications. Réessayez.',
	offline_banner: 'Hors-ligne — lecture seule',

	// --- Bilan (M9) ---
	nav_bilan: 'Bilan',
	bilan_title: 'Bilan anti-gaspi',
	bilan_month_subtitle: 'Ce mois-ci',
	bilan_eaten: 'Consommés',
	bilan_wasted: 'Jetés',
	bilan_streak: (n: number) => `${n} jour${n > 1 ? 's' : ''} sans gaspillage`,
	bilan_streak_none: 'Aucun gaspillage enregistré 🎉',
	bilan_empty_title: 'Pas encore de bilan',
	bilan_empty_body: 'Marquez des aliments comme mangés ou jetés pour suivre votre anti-gaspi.',

	// --- Cuisiner (M10) ---
	nav_cuisiner: 'Cuisiner',
	cuisiner_title: 'Cuisiner',
	cuisiner_subtitle: 'Idées pour vos aliments à consommer vite',
	cuisiner_empty_title: 'Rien ne presse',
	cuisiner_empty_body: "Aucun aliment à consommer rapidement pour l'instant.",
	cuisiner_view_item: 'Voir le produit',
	bilan_streak_zero: "Reparti·e à zéro — c'est reparti !",

	// --- Landing (public) ---
	landing_hero_title: 'Ne gaspillez plus. Cuisinez ce que vous avez.',
	landing_hero_subtitle:
		'Suivez votre garde-manger, soyez alerté avant péremption, et trouvez quoi cuisiner — en quelques secondes.',
	landing_cta_signup: 'Créer un compte',
	landing_cta_login: 'Se connecter',
	landing_feature_stock_title: 'Suivi du stock',
	landing_feature_stock_body: "Sachez en un coup d'œil ce qu'il vous reste.",
	landing_feature_expiry_title: 'Alertes de péremption',
	landing_feature_expiry_body: 'Soyez prévenu avant que ça ne périme.',
	landing_feature_scan_title: 'Scan code-barres',
	landing_feature_scan_body: 'Ajoutez un produit en le scannant.',
	landing_feature_cook_title: 'Idées recettes',
	landing_feature_cook_body: 'Cuisinez à partir de ce que vous avez déjà.',
	landing_closing_prompt: 'Prêt à arrêter le gaspillage ?',
	landing_meta_description:
		'Garde-Manger — suivez votre stock alimentaire, évitez le gaspillage et cuisinez malin.'
};

// Messages interface uses widened types so EN can satisfy it with different string values.
export interface Messages {
	// --- Navigation ---
	nav_create_household: string;
	// --- Navigation (bottom nav) ---
	nav_home: string;
	nav_back: string;
	nav_add: string;
	nav_settings: string;
	nav_household_switcher: string;
	nav_primary: string;
	action_cancel: string;
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
	// --- Theme ---
	account_theme_section: string;
	theme_auto: string;
	theme_light: string;
	theme_dark: string;
	// --- Account extras ---
	account_households_section: string;
	account_manage_households: string;
	account_session_section: string;
	account_logout: string;
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
	// --- Manage household (admin hub) ---
	manage_settings_section: string;
	manage_warn_days_label: string;
	manage_settings_saved: string;
	manage_settings_invalid: string;
	manage_members_section: string;
	manage_promote: string;
	manage_demote: string;
	manage_remove_member: string;
	manage_leave: string;
	manage_last_admin: string;
	manage_member_not_found: string;
	manage_invites_section: string;
	manage_invites_empty: string;
	manage_invite_expires: string;
	manage_invite_revoke: string;
	manage_invite_revoke_failed: string;
	manage_danger_section: string;
	manage_delete_warning: string;
	manage_delete_confirm_label: string;
	manage_delete_button: string;
	manage_delete_name_mismatch: string;
	manage_forbidden: string;
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
	join_confirm_title: string;
	join_confirm_prompt: string;
	join_confirm_button: string;
	// --- Home page ---
	home_no_household: string;
	home_create_or_join: string;
	// --- M2 inventory bands ---
	home_band_urgent: string;
	home_band_soon: string;
	home_band_ok: string;
	// --- M2 home screen ---
	home_filter_all: string;
	// --- M2 add item ---
	add_title: string;
	add_no_household: string;
	add_method_scanner: string;
	add_method_fresh: string;
	add_method_custom: string;
	add_search_label: string;
	add_search_placeholder: string;
	add_search_submit: string;
	add_no_results: string;
	add_fresh_form_title: string;
	add_location_label: string;
	add_location_pantry: string;
	add_location_fridge: string;
	add_location_freezer: string;
	add_estimate_prefix: string;
	add_estimate_note: string;
	add_estimate_guidance: string;
	add_bestby_label: string;
	add_useby_label: string;
	add_quantity_label: string;
	add_optional: string;
	add_fresh_submit: string;
	add_custom_name_label: string;
	add_custom_name_placeholder: string;
	add_custom_submit: string;
	add_change_food: string;
	add_food_not_found: string;
	add_error_generic: string;
	// --- M2 lifecycle ---
	lifecycle_ate: string;
	lifecycle_tossed: string;
	// --- M2 date labels ---
	dlc_label: string;
	ddm_label: string;
	// --- M3 scan ---
	scan_title: string;
	scan_instructions: string;
	scan_starting: string;
	scan_searching: string;
	scan_detected: string;
	scan_camera_denied: string;
	scan_camera_unsupported: string;
	scan_manual_title: string;
	scan_manual_label: string;
	scan_manual_placeholder: string;
	scan_manual_submit: string;
	scan_manual_invalid: string;
	scan_or_freetext: string;
	scan_confirm_title: string;
	scan_barcode_label: string;
	scan_name_label: string;
	scan_brand_label: string;
	scan_product_unknown: string;
	scan_off_unavailable: string;
	scan_dlc_label: string;
	scan_dlc_hint: string;
	scan_dlc_required: string;
	scan_add_submit: string;
	scan_attribution: string;
	scan_back: string;
	scan_error_generic: string;
	// --- Day badge / item detail (M7) ---
	day_today: string;
	day_overdue: string;
	day_unit: string;
	home_subtitle: (n: number, urgent: number) => string;
	home_empty_title: string;
	home_empty_body: string;
	item_detail_title: string;
	item_added_on: string;
	item_notes_label: string;
	item_notes_placeholder: string;
	item_save: string;
	item_delete: string;
	item_delete_confirm: string;
	item_back: string;
	// --- M4 notifications & PWA ---
	notif_section_title: string;
	notif_explainer: string;
	notif_enable: string;
	notif_disable: string;
	notif_enabled: string;
	notif_denied: string;
	notif_unsupported: string;
	notif_ios_install_title: string;
	notif_ios_install_steps: string;
	notif_reconnect: string;
	notif_working: string;
	notif_error: string;
	offline_banner: string;
	// --- Bilan (M9) ---
	nav_bilan: string;
	bilan_title: string;
	bilan_month_subtitle: string;
	bilan_eaten: string;
	bilan_wasted: string;
	bilan_streak: (n: number) => string;
	bilan_streak_none: string;
	bilan_empty_title: string;
	bilan_empty_body: string;
	// --- Cuisiner (M10) ---
	nav_cuisiner: string;
	cuisiner_title: string;
	cuisiner_subtitle: string;
	cuisiner_empty_title: string;
	cuisiner_empty_body: string;
	cuisiner_view_item: string;
	bilan_streak_zero: string;
	// --- Landing (public) ---
	landing_hero_title: string;
	landing_hero_subtitle: string;
	landing_cta_signup: string;
	landing_cta_login: string;
	landing_feature_stock_title: string;
	landing_feature_stock_body: string;
	landing_feature_expiry_title: string;
	landing_feature_expiry_body: string;
	landing_feature_scan_title: string;
	landing_feature_scan_body: string;
	landing_feature_cook_title: string;
	landing_feature_cook_body: string;
	landing_closing_prompt: string;
	landing_meta_description: string;
}
