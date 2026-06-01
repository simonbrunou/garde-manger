export interface Idea {
	fr: string;
	en: string;
}

/** Fallback shown when an expiring item has no category-specific idea
 * (e.g. free-text custom items). Keeps the cook screen useful for everything. */
export const GENERIC_IDEA: Idea = { fr: 'À consommer en priorité', en: 'Use it up soon' };

/** Curated, offline use-it-up ideas keyed by foods.category. Draft culinary
 * suggestions only — not food-safety advice. */
export const IDEAS: Record<string, Idea[]> = {
	Fruits: [
		{ fr: 'Smoothie ou compote', en: 'Smoothie or compote' },
		{ fr: 'Cake ou crumble', en: 'Cake or crumble' }
	],
	Légumes: [
		{ fr: 'Soupe ou velouté', en: 'Soup' },
		{ fr: 'Poêlée ou wok', en: 'Stir-fry' }
	],
	Herbes: [
		{ fr: 'Pesto maison', en: 'Homemade pesto' },
		{ fr: 'Huile ou beurre aromatisé', en: 'Flavoured oil or butter' }
	],
	Charcuterie: [
		{ fr: 'Quiche ou cake salé', en: 'Quiche or savoury cake' },
		{ fr: 'Omelette garnie', en: 'Loaded omelette' }
	],
	'Poissons / Fruits de mer': [
		{ fr: 'Poêlée express', en: 'Quick pan-fry' },
		{ fr: 'Congeler le jour même', en: 'Freeze the same day' }
	],
	'Produits laitiers': [
		{ fr: 'Gratin ou béchamel', en: 'Gratin or béchamel' },
		{ fr: 'Pancakes ou gâteau', en: 'Pancakes or cake' }
	],
	Viandes: [
		{ fr: 'Mijoté ou curry', en: 'Stew or curry' },
		{ fr: 'Congeler en portions', en: 'Freeze in portions' }
	],
	Volaille: [
		{ fr: 'Bouillon ou curry', en: 'Broth or curry' },
		{ fr: 'Émincé sauté', en: 'Sautéed strips' }
	],
	Œufs: [
		{ fr: 'Omelette ou frittata', en: 'Omelette or frittata' },
		{ fr: 'Quiche ou flan', en: 'Quiche or custard' }
	],
	'Pain / Boulangerie': [
		{ fr: 'Pain perdu', en: 'French toast' },
		{ fr: 'Croûtons ou chapelure', en: 'Croutons or breadcrumbs' }
	],
	'Placard / Épicerie': [
		{ fr: "Base d'un plat complet", en: 'Base for a one-pot meal' },
		{ fr: 'Bocal ou conserve maison', en: 'Jar or home preserve' }
	],
	'Restes / Plats cuisinés': [
		{ fr: "Réchauffer aujourd'hui", en: 'Reheat today' },
		{ fr: 'Congeler une portion', en: 'Freeze a portion' }
	]
};
