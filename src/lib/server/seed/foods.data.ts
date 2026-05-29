// DRAFT shelf-life data — best-effort from ADEME / Santé publique France / ANSES guidance + the EU DLC (use-by) vs DDM (best-before) framework.
// REQUIRES human food-safety review before production use. Be CONSERVATIVE for risk foods.

export type ShelfLifeSeed = {
	location: 'pantry' | 'fridge' | 'freezer';
	basis: 'purchase' | 'opened' | 'unspecified';
	min: number;
	max: number;
	unit: 'hours' | 'days' | 'weeks' | 'months' | 'years';
	notRecommended?: boolean;
	tipsFr?: string;
	tipsEn?: string;
};

export type FoodSeed = {
	key: string;
	nameFr: string;
	nameEn: string;
	subtitleFr?: string;
	subtitleEn?: string;
	keywordsFr?: string;
	keywordsEn?: string;
	category: string;
	defaultLocation: 'pantry' | 'fridge' | 'freezer';
	shelfLives: ShelfLifeSeed[];
};

export const FOOD_SEED: FoodSeed[] = [
	// ── FRUITS ────────────────────────────────────────────────────────────────
	{
		key: 'pomme',
		nameFr: 'Pomme',
		nameEn: 'Apple',
		keywordsFr: 'pommes, fruit, croquant',
		keywordsEn: 'apples, fruit, crisp',
		category: 'Fruits',
		defaultLocation: 'fridge',
		shelfLives: [
			{ location: 'pantry', basis: 'purchase', min: 1, max: 3, unit: 'weeks' },
			{ location: 'fridge', basis: 'purchase', min: 4, max: 8, unit: 'weeks' },
			{
				location: 'freezer',
				basis: 'purchase',
				min: 8,
				max: 12,
				unit: 'months',
				tipsFr: 'Éplucher et couper avant congélation.',
				tipsEn: 'Peel and slice before freezing.'
			}
		]
	},
	{
		key: 'poire',
		nameFr: 'Poire',
		nameEn: 'Pear',
		keywordsFr: 'poires, fruit',
		keywordsEn: 'pears, fruit',
		category: 'Fruits',
		defaultLocation: 'fridge',
		shelfLives: [
			{
				location: 'pantry',
				basis: 'purchase',
				min: 3,
				max: 5,
				unit: 'days',
				tipsFr: 'Laisser mûrir à température ambiante.',
				tipsEn: 'Ripen at room temperature.'
			},
			{ location: 'fridge', basis: 'purchase', min: 1, max: 3, unit: 'weeks' },
			{ location: 'freezer', basis: 'purchase', min: 6, max: 12, unit: 'months' }
		]
	},
	{
		key: 'fraises',
		nameFr: 'Fraises',
		nameEn: 'Strawberries',
		keywordsFr: 'fraise, baies',
		keywordsEn: 'strawberry, berries',
		category: 'Fruits',
		defaultLocation: 'fridge',
		shelfLives: [
			{ location: 'pantry', basis: 'purchase', min: 1, max: 2, unit: 'days' },
			{ location: 'fridge', basis: 'purchase', min: 3, max: 7, unit: 'days' },
			{ location: 'freezer', basis: 'purchase', min: 8, max: 12, unit: 'months' }
		]
	},
	{
		key: 'raisins',
		nameFr: 'Raisins',
		nameEn: 'Grapes',
		keywordsFr: 'raisin, baies',
		keywordsEn: 'grape, berries',
		category: 'Fruits',
		defaultLocation: 'fridge',
		shelfLives: [
			{ location: 'pantry', basis: 'purchase', min: 1, max: 2, unit: 'days' },
			{ location: 'fridge', basis: 'purchase', min: 5, max: 10, unit: 'days' },
			{ location: 'freezer', basis: 'purchase', min: 3, max: 5, unit: 'months' }
		]
	},
	{
		key: 'banane',
		nameFr: 'Banane',
		nameEn: 'Banana',
		keywordsFr: 'bananes',
		keywordsEn: 'bananas',
		category: 'Fruits',
		defaultLocation: 'pantry',
		shelfLives: [
			{ location: 'pantry', basis: 'purchase', min: 3, max: 7, unit: 'days' },
			{
				location: 'fridge',
				basis: 'purchase',
				min: 7,
				max: 14,
				unit: 'days',
				tipsFr: 'La peau noircit mais la chair reste bonne.',
				tipsEn: 'Skin darkens but flesh stays good.'
			},
			{ location: 'freezer', basis: 'purchase', min: 2, max: 3, unit: 'months' }
		]
	},
	{
		key: 'citron',
		nameFr: 'Citron',
		nameEn: 'Lemon',
		keywordsFr: 'citrons, agrume',
		keywordsEn: 'lemons, citrus',
		category: 'Fruits',
		defaultLocation: 'fridge',
		shelfLives: [
			{ location: 'pantry', basis: 'purchase', min: 1, max: 2, unit: 'weeks' },
			{ location: 'fridge', basis: 'purchase', min: 3, max: 5, unit: 'weeks' }
		]
	},
	{
		key: 'orange',
		nameFr: 'Orange',
		nameEn: 'Orange',
		keywordsFr: 'oranges, agrume, mandarine, clémentine',
		keywordsEn: 'oranges, citrus, mandarin, clementine',
		category: 'Fruits',
		defaultLocation: 'fridge',
		shelfLives: [
			{ location: 'pantry', basis: 'purchase', min: 1, max: 2, unit: 'weeks' },
			{ location: 'fridge', basis: 'purchase', min: 3, max: 5, unit: 'weeks' }
		]
	},

	// ── LÉGUMES ───────────────────────────────────────────────────────────────
	{
		key: 'epinards-frais',
		nameFr: 'Épinards frais',
		nameEn: 'Fresh spinach',
		keywordsFr: 'épinards, feuilles vertes',
		keywordsEn: 'spinach, leafy greens',
		category: 'Légumes',
		defaultLocation: 'fridge',
		shelfLives: [
			{ location: 'fridge', basis: 'purchase', min: 3, max: 5, unit: 'days' },
			{
				location: 'freezer',
				basis: 'purchase',
				min: 10,
				max: 12,
				unit: 'months',
				tipsFr: 'Blanchir 1 minute avant congélation.',
				tipsEn: 'Blanch 1 minute before freezing.'
			}
		]
	},
	{
		key: 'carottes',
		nameFr: 'Carottes',
		nameEn: 'Carrots',
		keywordsFr: 'carotte, légume racine',
		keywordsEn: 'carrot, root vegetable',
		category: 'Légumes',
		defaultLocation: 'fridge',
		shelfLives: [
			{ location: 'pantry', basis: 'purchase', min: 3, max: 5, unit: 'days' },
			{ location: 'fridge', basis: 'purchase', min: 3, max: 5, unit: 'weeks' },
			{ location: 'freezer', basis: 'purchase', min: 10, max: 12, unit: 'months' }
		]
	},
	{
		key: 'tomates',
		nameFr: 'Tomates',
		nameEn: 'Tomatoes',
		keywordsFr: 'tomate, légume fruit',
		keywordsEn: 'tomato, fruit vegetable',
		category: 'Légumes',
		defaultLocation: 'pantry',
		shelfLives: [
			{
				location: 'pantry',
				basis: 'purchase',
				min: 3,
				max: 7,
				unit: 'days',
				tipsFr: 'Ne pas réfrigérer les tomates non coupées : altère texture et goût.',
				tipsEn: 'Do not refrigerate uncut tomatoes: damages texture and flavour.'
			},
			{
				location: 'fridge',
				basis: 'purchase',
				min: 7,
				max: 10,
				unit: 'days',
				tipsFr: 'Seulement si déjà très mûres.',
				tipsEn: 'Only if very ripe.'
			},
			{ location: 'freezer', basis: 'purchase', min: 2, max: 3, unit: 'months' }
		]
	},
	{
		key: 'courgettes',
		nameFr: 'Courgettes',
		nameEn: 'Courgettes',
		subtitleFr: 'Zucchinis',
		subtitleEn: 'Zucchini',
		keywordsFr: 'courgette, zucchini',
		keywordsEn: 'courgette, zucchini',
		category: 'Légumes',
		defaultLocation: 'fridge',
		shelfLives: [
			{ location: 'fridge', basis: 'purchase', min: 4, max: 7, unit: 'days' },
			{ location: 'freezer', basis: 'purchase', min: 10, max: 12, unit: 'months' }
		]
	},
	{
		key: 'brocoli',
		nameFr: 'Brocoli',
		nameEn: 'Broccoli',
		keywordsFr: 'brocoli, choux',
		keywordsEn: 'broccoli, cruciferous',
		category: 'Légumes',
		defaultLocation: 'fridge',
		shelfLives: [
			{ location: 'fridge', basis: 'purchase', min: 3, max: 5, unit: 'days' },
			{ location: 'freezer', basis: 'purchase', min: 10, max: 12, unit: 'months' }
		]
	},
	{
		key: 'poivron',
		nameFr: 'Poivron',
		nameEn: 'Bell pepper',
		keywordsFr: 'poivron, capsicum, piment doux',
		keywordsEn: 'bell pepper, capsicum, sweet pepper',
		category: 'Légumes',
		defaultLocation: 'fridge',
		shelfLives: [
			{ location: 'fridge', basis: 'purchase', min: 1, max: 2, unit: 'weeks' },
			{ location: 'freezer', basis: 'purchase', min: 10, max: 12, unit: 'months' }
		]
	},
	{
		key: 'oignon',
		nameFr: 'Oignon',
		nameEn: 'Onion',
		keywordsFr: 'oignons, échalote',
		keywordsEn: 'onions, shallot',
		category: 'Légumes',
		defaultLocation: 'pantry',
		shelfLives: [
			{
				location: 'pantry',
				basis: 'purchase',
				min: 1,
				max: 3,
				unit: 'months',
				tipsFr: 'Conserver dans un endroit frais, sombre et bien ventilé.',
				tipsEn: 'Store in a cool, dark, well-ventilated place.'
			},
			{ location: 'fridge', basis: 'purchase', min: 2, max: 3, unit: 'months' }
		]
	},
	{
		key: 'ail',
		nameFr: 'Ail',
		nameEn: 'Garlic',
		keywordsFr: 'ail, gousse',
		keywordsEn: 'garlic, clove',
		category: 'Légumes',
		defaultLocation: 'pantry',
		shelfLives: [
			{
				location: 'pantry',
				basis: 'purchase',
				min: 3,
				max: 6,
				unit: 'months',
				tipsFr: 'Tête entière. Conserver dans un endroit frais et sec.',
				tipsEn: 'Whole bulb. Keep in a cool, dry place.'
			},
			{ location: 'fridge', basis: 'purchase', min: 1, max: 2, unit: 'months' }
		]
	},
	{
		key: 'pommes-de-terre',
		nameFr: 'Pommes de terre',
		nameEn: 'Potatoes',
		keywordsFr: 'pomme de terre, patate',
		keywordsEn: 'potato, spud',
		category: 'Légumes',
		defaultLocation: 'pantry',
		shelfLives: [
			{
				location: 'pantry',
				basis: 'purchase',
				min: 3,
				max: 5,
				unit: 'weeks',
				tipsFr: 'Conserver dans un endroit frais, sombre et sec. Ne pas réfrigérer.',
				tipsEn: 'Store in a cool, dark, dry place. Do not refrigerate.'
			},
			{
				location: 'freezer',
				basis: 'purchase',
				min: 10,
				max: 12,
				unit: 'months',
				tipsFr: 'Blanchir ou cuire avant congélation.',
				tipsEn: 'Blanch or cook before freezing.'
			}
		]
	},
	{
		key: 'salade-feuille',
		nameFr: 'Salade (feuilles)',
		nameEn: 'Lettuce (leaves)',
		keywordsFr: 'laitue, roquette, mâche, mesclun, salade verte',
		keywordsEn: "lettuce, rocket, arugula, lamb's lettuce, mixed salad",
		category: 'Légumes',
		defaultLocation: 'fridge',
		shelfLives: [{ location: 'fridge', basis: 'purchase', min: 3, max: 7, unit: 'days' }]
	},
	{
		key: 'champignons-frais',
		nameFr: 'Champignons frais',
		nameEn: 'Fresh mushrooms',
		keywordsFr: 'champignons de Paris, shiitake, pleurotes',
		keywordsEn: 'button mushrooms, shiitake, oyster mushrooms',
		category: 'Légumes',
		defaultLocation: 'fridge',
		shelfLives: [
			{ location: 'fridge', basis: 'purchase', min: 5, max: 7, unit: 'days' },
			{
				location: 'freezer',
				basis: 'purchase',
				min: 10,
				max: 12,
				unit: 'months',
				tipsFr: 'Faire revenir à la poêle avant congélation.',
				tipsEn: 'Sauté before freezing.'
			}
		]
	},

	// ── HERBES ────────────────────────────────────────────────────────────────
	{
		key: 'persil-frais',
		nameFr: 'Persil frais',
		nameEn: 'Fresh parsley',
		keywordsFr: 'persil, herbes fraîches',
		keywordsEn: 'parsley, fresh herbs',
		category: 'Herbes',
		defaultLocation: 'fridge',
		shelfLives: [
			{
				location: 'fridge',
				basis: 'purchase',
				min: 7,
				max: 14,
				unit: 'days',
				tipsFr: "Conserver les tiges dans un verre d'eau.",
				tipsEn: 'Store stems in a glass of water.'
			},
			{
				location: 'freezer',
				basis: 'purchase',
				min: 6,
				max: 12,
				unit: 'months',
				tipsFr: 'Hacher et congeler en glaçons.',
				tipsEn: 'Chop and freeze in ice cube trays.'
			}
		]
	},
	{
		key: 'basilic-frais',
		nameFr: 'Basilic frais',
		nameEn: 'Fresh basil',
		keywordsFr: 'basilic, herbes fraîches',
		keywordsEn: 'basil, fresh herbs',
		category: 'Herbes',
		defaultLocation: 'pantry',
		shelfLives: [
			{
				location: 'pantry',
				basis: 'purchase',
				min: 3,
				max: 7,
				unit: 'days',
				tipsFr: "Conserver à température ambiante dans un verre d'eau, loin du froid.",
				tipsEn: 'Keep at room temperature in a glass of water, away from cold.'
			},
			{
				location: 'fridge',
				basis: 'purchase',
				min: 1,
				max: 2,
				unit: 'weeks',
				tipsFr: 'Emballer dans un linge humide.',
				tipsEn: 'Wrap in a damp cloth.'
			}
		]
	},
	{
		key: 'ciboulette-fraiche',
		nameFr: 'Ciboulette fraîche',
		nameEn: 'Fresh chives',
		keywordsFr: 'ciboulette, herbes fraîches',
		keywordsEn: 'chives, fresh herbs',
		category: 'Herbes',
		defaultLocation: 'fridge',
		shelfLives: [
			{ location: 'fridge', basis: 'purchase', min: 7, max: 14, unit: 'days' },
			{ location: 'freezer', basis: 'purchase', min: 6, max: 12, unit: 'months' }
		]
	},

	// ── PRODUITS LAITIERS ──────────────────────────────────────────────────────
	{
		key: 'lait-frais',
		nameFr: 'Lait frais',
		nameEn: 'Fresh milk',
		keywordsFr: 'lait entier, demi-écrémé, écrémé',
		keywordsEn: 'whole milk, semi-skimmed, skimmed',
		category: 'Produits laitiers',
		defaultLocation: 'fridge',
		shelfLives: [
			{ location: 'fridge', basis: 'purchase', min: 5, max: 7, unit: 'days' },
			{
				location: 'fridge',
				basis: 'opened',
				min: 2,
				max: 3,
				unit: 'days',
				tipsFr: 'Consommer rapidement après ouverture.',
				tipsEn: 'Consume promptly after opening.'
			},
			{ location: 'freezer', basis: 'purchase', min: 1, max: 3, unit: 'months' }
		]
	},
	{
		key: 'lait-uht',
		nameFr: 'Lait UHT',
		nameEn: 'UHT milk',
		subtitleFr: 'Longue conservation',
		subtitleEn: 'Long-life milk',
		keywordsFr: 'lait stérilisé, longue conservation',
		keywordsEn: 'sterilised milk, long-life',
		category: 'Produits laitiers',
		defaultLocation: 'pantry',
		shelfLives: [
			{
				location: 'pantry',
				basis: 'purchase',
				min: 6,
				max: 12,
				unit: 'months',
				tipsFr: 'Vérifier la DDM sur la brique.',
				tipsEn: 'Check the best-before date on the carton.'
			},
			{ location: 'fridge', basis: 'opened', min: 3, max: 5, unit: 'days' }
		]
	},
	{
		key: 'beurre',
		nameFr: 'Beurre',
		nameEn: 'Butter',
		keywordsFr: 'beurre doux, beurre demi-sel',
		keywordsEn: 'unsalted butter, salted butter',
		category: 'Produits laitiers',
		defaultLocation: 'fridge',
		shelfLives: [
			{
				location: 'pantry',
				basis: 'purchase',
				min: 1,
				max: 2,
				unit: 'days',
				tipsFr: "Seulement sous cloche beurrier, à l'abri de la chaleur.",
				tipsEn: 'Only in a butter dish, away from heat.'
			},
			{ location: 'fridge', basis: 'purchase', min: 1, max: 2, unit: 'months' },
			{ location: 'freezer', basis: 'purchase', min: 6, max: 9, unit: 'months' }
		]
	},
	{
		key: 'creme-fraiche',
		nameFr: 'Crème fraîche',
		nameEn: 'Crème fraîche',
		subtitleFr: 'Épaisse ou liquide',
		subtitleEn: 'Thick or pouring',
		keywordsFr: 'crème épaisse, crème liquide, fleurette',
		keywordsEn: 'sour cream, double cream, single cream',
		category: 'Produits laitiers',
		defaultLocation: 'fridge',
		shelfLives: [
			{ location: 'fridge', basis: 'purchase', min: 7, max: 14, unit: 'days' },
			{ location: 'fridge', basis: 'opened', min: 3, max: 5, unit: 'days' }
		]
	},
	{
		key: 'yaourt',
		nameFr: 'Yaourt',
		nameEn: 'Yoghurt',
		keywordsFr: 'yaourt, yogourt, yaourt nature, yaourt aux fruits',
		keywordsEn: 'yogurt, natural yoghurt, fruit yoghurt',
		category: 'Produits laitiers',
		defaultLocation: 'fridge',
		shelfLives: [
			{
				location: 'fridge',
				basis: 'purchase',
				min: 7,
				max: 28,
				unit: 'days',
				tipsFr:
					'Vérifier la DLC. Les yaourts nature se consomment généralement 7–10 jours après DLC.',
				tipsEn: 'Check DLC. Plain yoghurts are generally safe 7–10 days past the date.'
			}
		]
	},
	{
		key: 'fromage-a-pate-dure',
		nameFr: 'Fromage à pâte dure',
		nameEn: 'Hard cheese',
		subtitleFr: 'Emmental, Comté, Parmesan…',
		subtitleEn: 'Emmental, Comté, Parmesan…',
		keywordsFr: 'emmental, comté, gruyère, parmesan, mimolette',
		keywordsEn: 'emmental, comté, gruyère, parmesan, mimolette',
		category: 'Produits laitiers',
		defaultLocation: 'fridge',
		shelfLives: [
			{ location: 'fridge', basis: 'purchase', min: 3, max: 6, unit: 'weeks' },
			{
				location: 'fridge',
				basis: 'opened',
				min: 2,
				max: 4,
				unit: 'weeks',
				tipsFr: "Envelopper dans du papier ciré ou d'alu.",
				tipsEn: 'Wrap in waxed or foil paper.'
			},
			{ location: 'freezer', basis: 'purchase', min: 2, max: 3, unit: 'months' }
		]
	},
	{
		key: 'fromage-a-pate-molle',
		nameFr: 'Fromage à pâte molle',
		nameEn: 'Soft cheese',
		subtitleFr: 'Camembert, Brie, Coulommiers…',
		subtitleEn: 'Camembert, Brie, Coulommiers…',
		keywordsFr: 'camembert, brie, coulommiers, munster',
		keywordsEn: 'camembert, brie, coulommiers, munster',
		category: 'Produits laitiers',
		defaultLocation: 'fridge',
		shelfLives: [
			{ location: 'fridge', basis: 'purchase', min: 5, max: 10, unit: 'days' },
			{ location: 'fridge', basis: 'opened', min: 3, max: 5, unit: 'days' }
		]
	},
	{
		key: 'fromage-blanc',
		nameFr: 'Fromage blanc',
		nameEn: 'Fromage blanc',
		subtitleFr: 'Faisselle, cottage',
		subtitleEn: 'Quark, cottage cheese',
		keywordsFr: 'faisselle, cottage, petit-suisse',
		keywordsEn: 'quark, fromage frais, cottage cheese',
		category: 'Produits laitiers',
		defaultLocation: 'fridge',
		shelfLives: [
			{ location: 'fridge', basis: 'purchase', min: 5, max: 10, unit: 'days' },
			{ location: 'fridge', basis: 'opened', min: 2, max: 3, unit: 'days' }
		]
	},

	// ── ŒUFS ──────────────────────────────────────────────────────────────────
	{
		key: 'oeufs-crus',
		nameFr: 'Œufs crus (en coquille)',
		nameEn: 'Raw eggs (in shell)',
		keywordsFr: 'œufs, oeufs frais',
		keywordsEn: 'eggs, fresh eggs',
		category: 'Œufs',
		defaultLocation: 'fridge',
		shelfLives: [
			{
				location: 'pantry',
				basis: 'purchase',
				min: 1,
				max: 2,
				unit: 'weeks',
				tipsFr: 'Acceptable si achetés très frais, mais préférer le réfrigérateur.',
				tipsEn: 'Acceptable if very fresh, but refrigerator is preferred.'
			},
			{
				location: 'fridge',
				basis: 'purchase',
				min: 3,
				max: 4,
				unit: 'weeks',
				tipsFr: 'Conserver tête en bas, loin des aliments à forte odeur.',
				tipsEn: 'Store point-down, away from strong-smelling foods.'
			}
		]
	},
	{
		key: 'oeufs-durs',
		nameFr: 'Œufs durs (écalés)',
		nameEn: 'Hard-boiled eggs (peeled)',
		keywordsFr: 'œufs cuits, oeufs durs',
		keywordsEn: 'boiled eggs, hard-boiled',
		category: 'Œufs',
		defaultLocation: 'fridge',
		shelfLives: [
			{
				location: 'fridge',
				basis: 'purchase',
				min: 1,
				max: 1,
				unit: 'days',
				tipsFr: 'À consommer dans la journée une fois écalés.',
				tipsEn: 'Consume within the day once peeled.'
			},
			{
				location: 'fridge',
				basis: 'unspecified',
				min: 5,
				max: 7,
				unit: 'days',
				tipsFr: 'Non écalés dans leur coquille cuite.',
				tipsEn: 'Unpeeled in their cooked shell.'
			}
		]
	},

	// ── VIANDES ───────────────────────────────────────────────────────────────
	{
		key: 'boeuf-hache-cru',
		nameFr: 'Bœuf haché cru',
		nameEn: 'Raw minced beef',
		subtitleFr: 'Steak haché, farce',
		subtitleEn: 'Ground beef, mince',
		keywordsFr: 'steak haché, bœuf haché, farce bovine',
		keywordsEn: 'ground beef, minced beef, hamburger meat',
		category: 'Viandes',
		defaultLocation: 'fridge',
		shelfLives: [
			{
				location: 'fridge',
				basis: 'purchase',
				min: 1,
				max: 2,
				unit: 'days',
				tipsFr:
					'La viande hachée est particulièrement sensible. Consommer dans les 24 h idéalement.',
				tipsEn: 'Minced meat is especially perishable. Consume within 24 h ideally.'
			},
			{ location: 'freezer', basis: 'purchase', min: 2, max: 4, unit: 'months' }
		]
	},
	{
		key: 'boeuf-piece',
		nameFr: 'Bœuf (pièce entière)',
		nameEn: 'Beef (whole cut)',
		subtitleFr: 'Steak, rôti, côte',
		subtitleEn: 'Steak, roast, rib',
		keywordsFr: 'steak, rôti de bœuf, entrecôte, côte de bœuf',
		keywordsEn: 'beef steak, roast beef, ribeye',
		category: 'Viandes',
		defaultLocation: 'fridge',
		shelfLives: [
			{ location: 'fridge', basis: 'purchase', min: 3, max: 5, unit: 'days' },
			{ location: 'freezer', basis: 'purchase', min: 6, max: 12, unit: 'months' }
		]
	},
	{
		key: 'porc-cru',
		nameFr: 'Porc cru',
		nameEn: 'Raw pork',
		subtitleFr: 'Côtelette, filet, rôti',
		subtitleEn: 'Chop, loin, roast',
		keywordsFr: 'côte de porc, filet mignon de porc, rôti de porc',
		keywordsEn: 'pork chop, pork loin, pork roast',
		category: 'Viandes',
		defaultLocation: 'fridge',
		shelfLives: [
			{ location: 'fridge', basis: 'purchase', min: 3, max: 5, unit: 'days' },
			{ location: 'freezer', basis: 'purchase', min: 4, max: 6, unit: 'months' }
		]
	},
	{
		key: 'agneau-cru',
		nameFr: 'Agneau cru',
		nameEn: 'Raw lamb',
		keywordsFr: "côtelette d'agneau, gigot d'agneau, souris d'agneau",
		keywordsEn: 'lamb chop, leg of lamb, lamb shank',
		category: 'Viandes',
		defaultLocation: 'fridge',
		shelfLives: [
			{ location: 'fridge', basis: 'purchase', min: 3, max: 5, unit: 'days' },
			{ location: 'freezer', basis: 'purchase', min: 6, max: 9, unit: 'months' }
		]
	},

	// ── VOLAILLE ──────────────────────────────────────────────────────────────
	{
		key: 'poulet-cru',
		nameFr: 'Poulet cru',
		nameEn: 'Raw chicken',
		subtitleFr: 'Entier ou morceaux',
		subtitleEn: 'Whole or pieces',
		keywordsFr: 'poulet entier, cuisses, blancs de poulet, ailes',
		keywordsEn: 'whole chicken, chicken thighs, chicken breast, wings',
		category: 'Volaille',
		defaultLocation: 'fridge',
		shelfLives: [
			{
				location: 'fridge',
				basis: 'purchase',
				min: 1,
				max: 2,
				unit: 'days',
				tipsFr:
					'Aliment à risque élevé. Conserver dans la partie la plus froide du réfrigérateur, bien emballé.',
				tipsEn: 'High-risk food. Store in the coldest part of the fridge, tightly wrapped.'
			},
			{ location: 'freezer', basis: 'purchase', min: 9, max: 12, unit: 'months' }
		]
	},
	{
		key: 'dinde-crue',
		nameFr: 'Dinde crue',
		nameEn: 'Raw turkey',
		keywordsFr: 'dinde, escalope de dinde, rôti de dinde',
		keywordsEn: 'turkey, turkey breast, turkey roast',
		category: 'Volaille',
		defaultLocation: 'fridge',
		shelfLives: [
			{
				location: 'fridge',
				basis: 'purchase',
				min: 1,
				max: 2,
				unit: 'days',
				tipsFr: 'Aliment à risque élevé — mêmes précautions que le poulet.',
				tipsEn: 'High-risk food — same precautions as chicken.'
			},
			{ location: 'freezer', basis: 'purchase', min: 9, max: 12, unit: 'months' }
		]
	},

	// ── POISSONS / FRUITS DE MER ───────────────────────────────────────────────
	{
		key: 'poisson-frais',
		nameFr: 'Poisson frais',
		nameEn: 'Fresh fish',
		subtitleFr: 'Cabillaud, saumon, dorade…',
		subtitleEn: 'Cod, salmon, sea bream…',
		keywordsFr: 'cabillaud, saumon, dorade, sole, bar, merlan',
		keywordsEn: 'cod, salmon, sea bream, sole, sea bass, whiting',
		category: 'Poissons / Fruits de mer',
		defaultLocation: 'fridge',
		shelfLives: [
			{
				location: 'fridge',
				basis: 'purchase',
				min: 1,
				max: 2,
				unit: 'days',
				tipsFr: 'Aliment très périssable. Conserver sur glace idéalement.',
				tipsEn: 'Very perishable. Ideally store on ice.'
			},
			{ location: 'freezer', basis: 'purchase', min: 2, max: 6, unit: 'months' }
		]
	},
	{
		key: 'crevettes-crues',
		nameFr: 'Crevettes crues',
		nameEn: 'Raw prawns',
		keywordsFr: 'crevettes, gambas, crevettes roses',
		keywordsEn: 'prawns, shrimp, king prawns',
		category: 'Poissons / Fruits de mer',
		defaultLocation: 'fridge',
		shelfLives: [
			{
				location: 'fridge',
				basis: 'purchase',
				min: 1,
				max: 2,
				unit: 'days',
				tipsFr: 'Très périssable.',
				tipsEn: 'Very perishable.'
			},
			{ location: 'freezer', basis: 'purchase', min: 3, max: 6, unit: 'months' }
		]
	},
	{
		key: 'saumon-fume',
		nameFr: 'Saumon fumé',
		nameEn: 'Smoked salmon',
		keywordsFr: 'saumon fumé, poisson fumé',
		keywordsEn: 'smoked salmon, smoked fish',
		category: 'Poissons / Fruits de mer',
		defaultLocation: 'fridge',
		shelfLives: [
			{ location: 'fridge', basis: 'purchase', min: 5, max: 7, unit: 'days' },
			{ location: 'fridge', basis: 'opened', min: 2, max: 3, unit: 'days' },
			{ location: 'freezer', basis: 'purchase', min: 2, max: 3, unit: 'months' }
		]
	},
	{
		key: 'moules',
		nameFr: 'Moules fraîches',
		nameEn: 'Fresh mussels',
		keywordsFr: 'moules, coquillages',
		keywordsEn: 'mussels, shellfish',
		category: 'Poissons / Fruits de mer',
		defaultLocation: 'fridge',
		shelfLives: [
			{
				location: 'fridge',
				basis: 'purchase',
				min: 1,
				max: 2,
				unit: 'days',
				tipsFr: "Conserver dans un linge humide, pas dans l'eau. Ne jamais congeler cru.",
				tipsEn: 'Store in a damp cloth, not in water. Never freeze raw.'
			}
		]
	},

	// ── CHARCUTERIE ───────────────────────────────────────────────────────────
	{
		key: 'jambon-cuit',
		nameFr: 'Jambon cuit',
		nameEn: 'Cooked ham',
		subtitleFr: 'Jambon blanc, Paris',
		subtitleEn: 'Cooked ham, Paris ham',
		keywordsFr: 'jambon blanc, jambon de Paris, jambon cuit',
		keywordsEn: 'cooked ham, boiled ham, lunch meat',
		category: 'Charcuterie',
		defaultLocation: 'fridge',
		shelfLives: [
			{ location: 'fridge', basis: 'purchase', min: 5, max: 7, unit: 'days' },
			{ location: 'fridge', basis: 'opened', min: 3, max: 5, unit: 'days' },
			{ location: 'freezer', basis: 'purchase', min: 1, max: 2, unit: 'months' }
		]
	},
	{
		key: 'jambon-sec',
		nameFr: 'Jambon sec / cru',
		nameEn: 'Dry-cured ham',
		subtitleFr: 'Bayonne, Serrano, Prosciutto',
		subtitleEn: 'Bayonne, Serrano, Prosciutto',
		keywordsFr: 'jambon cru, bayonne, serrano, prosciutto, bresaola',
		keywordsEn: 'dry-cured ham, Bayonne ham, Serrano ham, Prosciutto di Parma',
		category: 'Charcuterie',
		defaultLocation: 'fridge',
		shelfLives: [
			{ location: 'fridge', basis: 'purchase', min: 2, max: 3, unit: 'weeks' },
			{ location: 'fridge', basis: 'opened', min: 5, max: 7, unit: 'days' }
		]
	},
	{
		key: 'saucisson-sec',
		nameFr: 'Saucisson sec',
		nameEn: 'Dry sausage',
		subtitleFr: 'Rosette, Jésus, chorizo sec',
		subtitleEn: 'Rosette, chorizo seco',
		keywordsFr: 'saucisson, rosette, chorizo sec, salami, coppa',
		keywordsEn: 'salami, dry sausage, chorizo, pepperoni',
		category: 'Charcuterie',
		defaultLocation: 'pantry',
		shelfLives: [
			{
				location: 'pantry',
				basis: 'purchase',
				min: 1,
				max: 3,
				unit: 'months',
				tipsFr: 'Entier, sous son boyau. Vérifier la DDM.',
				tipsEn: 'Whole, in its casing. Check the best-before date.'
			},
			{ location: 'fridge', basis: 'opened', min: 1, max: 3, unit: 'weeks' }
		]
	},
	{
		key: 'lardons',
		nameFr: 'Lardons',
		nameEn: 'Lardons / bacon pieces',
		keywordsFr: 'lardons fumés, lardons nature, bacon',
		keywordsEn: 'lardons, bacon pieces, smoked bacon',
		category: 'Charcuterie',
		defaultLocation: 'fridge',
		shelfLives: [
			{ location: 'fridge', basis: 'purchase', min: 5, max: 7, unit: 'days' },
			{ location: 'fridge', basis: 'opened', min: 2, max: 3, unit: 'days' },
			{ location: 'freezer', basis: 'purchase', min: 1, max: 2, unit: 'months' }
		]
	},

	// ── PAIN / BOULANGERIE ─────────────────────────────────────────────────────
	{
		key: 'pain-frais',
		nameFr: 'Pain frais (baguette, miche)',
		nameEn: 'Fresh bread (baguette, loaf)',
		keywordsFr: 'baguette, pain de campagne, miche, pain complet',
		keywordsEn: 'baguette, sourdough, loaf, wholemeal bread',
		category: 'Pain / Boulangerie',
		defaultLocation: 'pantry',
		shelfLives: [
			{
				location: 'pantry',
				basis: 'purchase',
				min: 1,
				max: 3,
				unit: 'days',
				tipsFr: 'Conserver dans un torchon ou une boîte à pain. Éviter le sac plastique.',
				tipsEn: 'Store in a cloth or bread bin. Avoid plastic bags.'
			},
			{
				location: 'freezer',
				basis: 'purchase',
				min: 1,
				max: 3,
				unit: 'months',
				tipsFr: 'Trancher avant congélation pour faciliter la décongélation.',
				tipsEn: 'Slice before freezing for easy defrosting.'
			}
		]
	},
	{
		key: 'pain-de-mie',
		nameFr: 'Pain de mie (emballé)',
		nameEn: 'Sliced bread (packaged)',
		keywordsFr: 'pain de mie, pain sandwich',
		keywordsEn: 'sandwich bread, sliced bread',
		category: 'Pain / Boulangerie',
		defaultLocation: 'pantry',
		shelfLives: [
			{
				location: 'pantry',
				basis: 'purchase',
				min: 5,
				max: 10,
				unit: 'days',
				tipsFr: "Vérifier la DLC sur l'emballage.",
				tipsEn: 'Check the use-by date on the packaging.'
			},
			{ location: 'freezer', basis: 'purchase', min: 1, max: 3, unit: 'months' }
		]
	},
	{
		key: 'viennoiseries',
		nameFr: 'Viennoiseries',
		nameEn: 'Pastries',
		subtitleFr: 'Croissant, pain au chocolat',
		subtitleEn: 'Croissant, pain au chocolat',
		keywordsFr: 'croissant, pain au chocolat, brioche',
		keywordsEn: 'croissant, pain au chocolat, brioche, danish',
		category: 'Pain / Boulangerie',
		defaultLocation: 'pantry',
		shelfLives: [
			{ location: 'pantry', basis: 'purchase', min: 1, max: 2, unit: 'days' },
			{ location: 'freezer', basis: 'purchase', min: 1, max: 2, unit: 'months' }
		]
	},

	// ── RESTES / PLATS CUISINÉS ───────────────────────────────────────────────
	{
		key: 'restes-viande-cuite',
		nameFr: 'Restes de viande cuite',
		nameEn: 'Cooked meat leftovers',
		subtitleFr: 'Rôti, grillades, fricassée…',
		subtitleEn: 'Roast, grilled, stewed…',
		keywordsFr: 'restes, viande cuite, leftovers',
		keywordsEn: 'leftovers, cooked meat, roast',
		category: 'Restes / Plats cuisinés',
		defaultLocation: 'fridge',
		shelfLives: [
			{
				location: 'fridge',
				basis: 'purchase',
				min: 2,
				max: 3,
				unit: 'days',
				tipsFr:
					'Réfrigérer dans les 2 heures après cuisson. Ne pas laisser traîner à température ambiante.',
				tipsEn: 'Refrigerate within 2 hours of cooking. Do not leave at room temperature.'
			},
			{ location: 'freezer', basis: 'purchase', min: 2, max: 3, unit: 'months' }
		]
	},
	{
		key: 'restes-volaille-cuite',
		nameFr: 'Restes de volaille cuite',
		nameEn: 'Cooked poultry leftovers',
		keywordsFr: 'poulet cuit, dinde cuite, restes volaille',
		keywordsEn: 'cooked chicken, cooked turkey, poultry leftovers',
		category: 'Restes / Plats cuisinés',
		defaultLocation: 'fridge',
		shelfLives: [
			{
				location: 'fridge',
				basis: 'purchase',
				min: 2,
				max: 3,
				unit: 'days',
				tipsFr: 'Même précaution que toute volaille cuite — réfrigérer rapidement.',
				tipsEn: 'Same caution as all cooked poultry — refrigerate promptly.'
			},
			{ location: 'freezer', basis: 'purchase', min: 2, max: 3, unit: 'months' }
		]
	},
	{
		key: 'plat-cuisine-maison',
		nameFr: 'Plat cuisiné maison',
		nameEn: 'Home-cooked dish',
		subtitleFr: 'Soupe, ragoût, gratin, sauce…',
		subtitleEn: 'Soup, stew, gratin, sauce…',
		keywordsFr: 'soupe maison, ragoût, gratin, plat cuisiné, quiche',
		keywordsEn: 'homemade soup, stew, casserole, gratin, quiche',
		category: 'Restes / Plats cuisinés',
		defaultLocation: 'fridge',
		shelfLives: [
			{
				location: 'fridge',
				basis: 'purchase',
				min: 2,
				max: 3,
				unit: 'days',
				tipsFr: 'Réfrigérer dans les 2 heures. Réchauffer à cœur à 70 °C avant consommation.',
				tipsEn: 'Refrigerate within 2 hours. Reheat to 70 °C core temperature before consuming.'
			},
			{ location: 'freezer', basis: 'purchase', min: 2, max: 3, unit: 'months' }
		]
	},
	{
		key: 'riz-cuit',
		nameFr: 'Riz cuit',
		nameEn: 'Cooked rice',
		keywordsFr: 'riz cuit, restes de riz',
		keywordsEn: 'cooked rice, leftover rice',
		category: 'Restes / Plats cuisinés',
		defaultLocation: 'fridge',
		shelfLives: [
			{
				location: 'fridge',
				basis: 'purchase',
				min: 1,
				max: 2,
				unit: 'days',
				tipsFr:
					'Refroidir rapidement et réfrigérer. Bacillus cereus peut se développer sur le riz cuit laissé à température ambiante.',
				tipsEn:
					'Cool quickly and refrigerate. Bacillus cereus can grow on cooked rice left at room temperature.'
			},
			{ location: 'freezer', basis: 'purchase', min: 1, max: 3, unit: 'months' }
		]
	},

	// ── PLACARD / ÉPICERIE ─────────────────────────────────────────────────────
	{
		key: 'pates-seches',
		nameFr: 'Pâtes sèches',
		nameEn: 'Dried pasta',
		keywordsFr: 'pâtes, spaghetti, penne, fusilli, tagliatelle',
		keywordsEn: 'pasta, spaghetti, penne, fusilli, tagliatelle',
		category: 'Placard / Épicerie',
		defaultLocation: 'pantry',
		shelfLives: [
			{
				location: 'pantry',
				basis: 'purchase',
				min: 2,
				max: 3,
				unit: 'years',
				tipsFr: "Vérifier la DDM. Conserver dans un endroit sec et à l'abri de la lumière.",
				tipsEn: 'Check the best-before date. Store in a dry, dark place.'
			}
		]
	},
	{
		key: 'riz-sec',
		nameFr: 'Riz sec',
		nameEn: 'Dried rice',
		keywordsFr: 'riz blanc, riz brun, riz basmati, riz complet',
		keywordsEn: 'white rice, brown rice, basmati rice, wholegrain rice',
		category: 'Placard / Épicerie',
		defaultLocation: 'pantry',
		shelfLives: [{ location: 'pantry', basis: 'purchase', min: 2, max: 3, unit: 'years' }]
	},
	{
		key: 'legumineuses-seches',
		nameFr: 'Légumineuses sèches',
		nameEn: 'Dried legumes',
		subtitleFr: 'Lentilles, pois chiches, haricots…',
		subtitleEn: 'Lentils, chickpeas, beans…',
		keywordsFr: 'lentilles, pois chiches, haricots blancs, haricots rouges, flageolets',
		keywordsEn: 'lentils, chickpeas, kidney beans, cannellini beans, flageolet beans',
		category: 'Placard / Épicerie',
		defaultLocation: 'pantry',
		shelfLives: [
			{
				location: 'pantry',
				basis: 'purchase',
				min: 2,
				max: 4,
				unit: 'years',
				tipsFr: 'Conserver dans un récipient hermétique.',
				tipsEn: 'Store in an airtight container.'
			}
		]
	},
	{
		key: 'conserves-legumes',
		nameFr: 'Conserves de légumes',
		nameEn: 'Canned vegetables',
		subtitleFr: 'Haricots verts, tomates pelées, maïs…',
		subtitleEn: 'Green beans, peeled tomatoes, sweetcorn…',
		keywordsFr: 'tomates pelées, haricots verts en conserve, maïs, petits pois, boîte de conserve',
		keywordsEn: 'canned tomatoes, canned green beans, sweetcorn, peas, tinned vegetables',
		category: 'Placard / Épicerie',
		defaultLocation: 'pantry',
		shelfLives: [
			{
				location: 'pantry',
				basis: 'purchase',
				min: 2,
				max: 5,
				unit: 'years',
				tipsFr: "Vérifier la DDM. Ne jamais consommer le contenu d'une boîte bombée ou rouillée.",
				tipsEn: 'Check the best-before date. Never consume from a bulging or rusty can.'
			},
			{
				location: 'fridge',
				basis: 'opened',
				min: 3,
				max: 5,
				unit: 'days',
				tipsFr: 'Transférer dans un récipient hermétique après ouverture.',
				tipsEn: 'Transfer to an airtight container after opening.'
			}
		]
	},
	{
		key: 'conserves-poissons',
		nameFr: 'Conserves de poissons',
		nameEn: 'Canned fish',
		subtitleFr: 'Thon, sardines, maquereaux…',
		subtitleEn: 'Tuna, sardines, mackerel…',
		keywordsFr: 'thon en boîte, sardines, maquereaux, anchois',
		keywordsEn: 'canned tuna, sardines, mackerel, anchovies',
		category: 'Placard / Épicerie',
		defaultLocation: 'pantry',
		shelfLives: [
			{ location: 'pantry', basis: 'purchase', min: 3, max: 5, unit: 'years' },
			{
				location: 'fridge',
				basis: 'opened',
				min: 1,
				max: 3,
				unit: 'days',
				tipsFr: 'Transférer dans un récipient hermétique après ouverture.',
				tipsEn: 'Transfer to an airtight container after opening.'
			}
		]
	},
	{
		key: 'farine',
		nameFr: 'Farine',
		nameEn: 'Flour',
		keywordsFr: 'farine de blé, farine T55, farine complète, maïzena',
		keywordsEn: 'wheat flour, plain flour, wholemeal flour, cornstarch',
		category: 'Placard / Épicerie',
		defaultLocation: 'pantry',
		shelfLives: [
			{
				location: 'pantry',
				basis: 'purchase',
				min: 1,
				max: 2,
				unit: 'years',
				tipsFr: "Conserver dans un récipient hermétique à l'abri de l'humidité.",
				tipsEn: 'Store in an airtight container away from moisture.'
			}
		]
	},
	{
		key: 'sucre',
		nameFr: 'Sucre',
		nameEn: 'Sugar',
		keywordsFr: 'sucre blanc, sucre roux, cassonade, sucre glace',
		keywordsEn: 'white sugar, brown sugar, caster sugar, icing sugar',
		category: 'Placard / Épicerie',
		defaultLocation: 'pantry',
		shelfLives: [
			{
				location: 'pantry',
				basis: 'purchase',
				min: 2,
				max: 5,
				unit: 'years',
				tipsFr: "Le sucre ne périme pas, mais peut se solidifier à l'humidité.",
				tipsEn: 'Sugar does not expire, but can clump in humidity.'
			}
		]
	},
	{
		key: 'huile-olive',
		nameFr: "Huile d'olive",
		nameEn: 'Olive oil',
		keywordsFr: "huile d'olive vierge extra, EVOO",
		keywordsEn: 'extra virgin olive oil, EVOO',
		category: 'Placard / Épicerie',
		defaultLocation: 'pantry',
		shelfLives: [
			{
				location: 'pantry',
				basis: 'purchase',
				min: 18,
				max: 24,
				unit: 'months',
				tipsFr: "Conserver à l'abri de la lumière et de la chaleur.",
				tipsEn: 'Store away from light and heat.'
			},
			{ location: 'pantry', basis: 'opened', min: 6, max: 12, unit: 'months' }
		]
	},
	{
		key: 'vinaigre',
		nameFr: 'Vinaigre',
		nameEn: 'Vinegar',
		keywordsFr: 'vinaigre blanc, vinaigre de vin, vinaigre balsamique',
		keywordsEn: 'white vinegar, wine vinegar, balsamic vinegar',
		category: 'Placard / Épicerie',
		defaultLocation: 'pantry',
		shelfLives: [
			{
				location: 'pantry',
				basis: 'purchase',
				min: 2,
				max: 5,
				unit: 'years',
				tipsFr: 'Le vinaigre est naturellement acide et très stable. Pas de DLC en France.',
				tipsEn: 'Vinegar is naturally acidic and very stable. No legal use-by date required.'
			}
		]
	},
	{
		key: 'sel',
		nameFr: 'Sel',
		nameEn: 'Salt',
		keywordsFr: 'sel de table, fleur de sel, sel de mer, sel rose',
		keywordsEn: 'table salt, sea salt, fleur de sel, rock salt',
		category: 'Placard / Épicerie',
		defaultLocation: 'pantry',
		shelfLives: [
			{
				location: 'pantry',
				basis: 'purchase',
				min: 5,
				max: 5,
				unit: 'years',
				tipsFr: 'Le sel pur ne périme pas. Durée indicative pour la qualité optimale.',
				tipsEn: 'Pure salt does not expire. Duration is indicative for optimal quality.'
			}
		]
	},
	{
		key: 'cafe-moulu',
		nameFr: 'Café moulu',
		nameEn: 'Ground coffee',
		keywordsFr: 'café, expresso, filtre',
		keywordsEn: 'coffee, espresso, filter coffee',
		category: 'Placard / Épicerie',
		defaultLocation: 'pantry',
		shelfLives: [
			{
				location: 'pantry',
				basis: 'purchase',
				min: 6,
				max: 12,
				unit: 'months',
				tipsFr: 'Conserver dans un récipient hermétique.',
				tipsEn: 'Store in an airtight container.'
			},
			{
				location: 'pantry',
				basis: 'opened',
				min: 1,
				max: 4,
				unit: 'weeks',
				tipsFr: 'La qualité aromatique décline rapidement après ouverture.',
				tipsEn: 'Aromatic quality declines quickly after opening.'
			}
		]
	},
	{
		key: 'the',
		nameFr: 'Thé',
		nameEn: 'Tea',
		keywordsFr: 'thé noir, thé vert, infusion, tisane',
		keywordsEn: 'black tea, green tea, herbal tea, infusion',
		category: 'Placard / Épicerie',
		defaultLocation: 'pantry',
		shelfLives: [
			{ location: 'pantry', basis: 'purchase', min: 18, max: 24, unit: 'months' },
			{
				location: 'pantry',
				basis: 'opened',
				min: 6,
				max: 12,
				unit: 'months',
				tipsFr: "Conserver dans une boîte hermétique à l'abri de l'humidité et de la lumière.",
				tipsEn: 'Store in an airtight tin away from moisture and light.'
			}
		]
	},
	{
		key: 'miel',
		nameFr: 'Miel',
		nameEn: 'Honey',
		keywordsFr: "miel d'acacia, miel toutes fleurs, miel de lavande",
		keywordsEn: 'acacia honey, wildflower honey, lavender honey',
		category: 'Placard / Épicerie',
		defaultLocation: 'pantry',
		shelfLives: [
			{
				location: 'pantry',
				basis: 'purchase',
				min: 2,
				max: 5,
				unit: 'years',
				tipsFr:
					'Le miel naturel a une durée de vie quasi indéfinie. La cristallisation est normale.',
				tipsEn: 'Natural honey has an almost indefinite shelf life. Crystallisation is normal.'
			}
		]
	},
	{
		key: 'confiture',
		nameFr: 'Confiture',
		nameEn: 'Jam / Preserves',
		keywordsFr: 'confiture, marmelade, gelée de fruit',
		keywordsEn: 'jam, marmalade, fruit jelly, preserves',
		category: 'Placard / Épicerie',
		defaultLocation: 'pantry',
		shelfLives: [
			{ location: 'pantry', basis: 'purchase', min: 1, max: 2, unit: 'years' },
			{ location: 'fridge', basis: 'opened', min: 2, max: 4, unit: 'weeks' }
		]
	},
	{
		key: 'chocolat-tablette',
		nameFr: 'Chocolat (tablette)',
		nameEn: 'Chocolate (bar)',
		keywordsFr: 'chocolat noir, chocolat au lait, chocolat blanc',
		keywordsEn: 'dark chocolate, milk chocolate, white chocolate',
		category: 'Placard / Épicerie',
		defaultLocation: 'pantry',
		shelfLives: [
			{
				location: 'pantry',
				basis: 'purchase',
				min: 12,
				max: 24,
				unit: 'months',
				tipsFr:
					"Conserver à l'abri de la chaleur et de l'humidité. La fioriture (blanchiment) est sans danger.",
				tipsEn: 'Store away from heat and moisture. Bloom (whitening) is harmless.'
			}
		]
	},
	{
		key: 'levure-chimique',
		nameFr: 'Levure chimique',
		nameEn: 'Baking powder',
		keywordsFr: 'levure chimique, levure alsacienne, poudre à lever',
		keywordsEn: 'baking powder, raising agent',
		category: 'Placard / Épicerie',
		defaultLocation: 'pantry',
		shelfLives: [
			{
				location: 'pantry',
				basis: 'purchase',
				min: 6,
				max: 18,
				unit: 'months',
				tipsFr: 'Vérifier la DDM. Conserver au sec.',
				tipsEn: 'Check the best-before date. Keep dry.'
			},
			{ location: 'pantry', basis: 'opened', min: 3, max: 6, unit: 'months' }
		]
	},
	{
		key: 'epices-seches',
		nameFr: 'Épices sèches',
		nameEn: 'Dried spices',
		subtitleFr: 'Cumin, paprika, curcuma, cannelle…',
		subtitleEn: 'Cumin, paprika, turmeric, cinnamon…',
		keywordsFr: 'cumin, paprika, curcuma, cannelle, curry, poivre, muscade',
		keywordsEn: 'cumin, paprika, turmeric, cinnamon, curry powder, pepper, nutmeg',
		category: 'Placard / Épicerie',
		defaultLocation: 'pantry',
		shelfLives: [
			{
				location: 'pantry',
				basis: 'purchase',
				min: 2,
				max: 4,
				unit: 'years',
				tipsFr:
					'La qualité aromatique baisse avec le temps. Conserver dans un récipient hermétique.',
				tipsEn: 'Aromatic quality decreases over time. Store in an airtight container.'
			},
			{ location: 'pantry', basis: 'opened', min: 6, max: 12, unit: 'months' }
		]
	},
	{
		key: 'herbes-seches',
		nameFr: 'Herbes sèches',
		nameEn: 'Dried herbs',
		subtitleFr: 'Thym, laurier, origan, herbes de Provence…',
		subtitleEn: 'Thyme, bay leaf, oregano, Herbes de Provence…',
		keywordsFr: 'thym, laurier, origan, herbes de Provence, romarin séché, basilic séché',
		keywordsEn: 'thyme, bay leaf, oregano, herbes de provence, dried rosemary, dried basil',
		category: 'Placard / Épicerie',
		defaultLocation: 'pantry',
		shelfLives: [
			{ location: 'pantry', basis: 'purchase', min: 1, max: 3, unit: 'years' },
			{ location: 'pantry', basis: 'opened', min: 6, max: 12, unit: 'months' }
		]
	},
	{
		key: 'bouillon-cube',
		nameFr: 'Bouillon cube',
		nameEn: 'Stock cube / bouillon cube',
		keywordsFr: 'bouillon de légumes, bouillon de volaille, fond de veau',
		keywordsEn: 'vegetable stock cube, chicken stock cube, beef bouillon',
		category: 'Placard / Épicerie',
		defaultLocation: 'pantry',
		shelfLives: [{ location: 'pantry', basis: 'purchase', min: 18, max: 24, unit: 'months' }]
	},
	{
		key: 'pates-de-legumineuses',
		nameFr: 'Légumineuses en conserve',
		nameEn: 'Canned legumes',
		subtitleFr: 'Pois chiches, lentilles, haricots en conserve',
		subtitleEn: 'Canned chickpeas, lentils, beans',
		keywordsFr: 'pois chiches en boîte, lentilles en conserve, haricots rouges en conserve',
		keywordsEn: 'canned chickpeas, canned lentils, canned kidney beans',
		category: 'Placard / Épicerie',
		defaultLocation: 'pantry',
		shelfLives: [
			{ location: 'pantry', basis: 'purchase', min: 2, max: 5, unit: 'years' },
			{
				location: 'fridge',
				basis: 'opened',
				min: 3,
				max: 5,
				unit: 'days',
				tipsFr: "Rincer et conserver dans un récipient fermé avec un peu d'eau.",
				tipsEn: 'Rinse and store in a closed container with a little water.'
			}
		]
	},
	{
		key: 'sauce-tomate',
		nameFr: 'Sauce tomate',
		nameEn: 'Tomato sauce / passata',
		keywordsFr: 'coulis de tomate, passata, sauce bolognaise en bocal',
		keywordsEn: 'passata, tomato passata, bolognese sauce jar',
		category: 'Placard / Épicerie',
		defaultLocation: 'pantry',
		shelfLives: [
			{ location: 'pantry', basis: 'purchase', min: 18, max: 24, unit: 'months' },
			{ location: 'fridge', basis: 'opened', min: 3, max: 5, unit: 'days' }
		]
	},
	{
		key: 'ketchup',
		nameFr: 'Ketchup',
		nameEn: 'Ketchup',
		keywordsFr: 'ketchup, sauce tomate sucrée',
		keywordsEn: 'ketchup, tomato ketchup',
		category: 'Placard / Épicerie',
		defaultLocation: 'pantry',
		shelfLives: [
			{ location: 'pantry', basis: 'purchase', min: 12, max: 24, unit: 'months' },
			{ location: 'fridge', basis: 'opened', min: 1, max: 3, unit: 'months' }
		]
	},
	{
		key: 'moutarde',
		nameFr: 'Moutarde',
		nameEn: 'Mustard',
		keywordsFr: "moutarde de Dijon, moutarde à l'ancienne",
		keywordsEn: 'Dijon mustard, wholegrain mustard',
		category: 'Placard / Épicerie',
		defaultLocation: 'pantry',
		shelfLives: [
			{ location: 'pantry', basis: 'purchase', min: 12, max: 24, unit: 'months' },
			{ location: 'fridge', basis: 'opened', min: 2, max: 4, unit: 'months' }
		]
	},
	{
		key: 'flocons-avoine',
		nameFr: "Flocons d'avoine",
		nameEn: 'Oats / Porridge oats',
		keywordsFr: "flocons d'avoine, porridge, muesli",
		keywordsEn: 'oats, porridge oats, muesli, rolled oats',
		category: 'Placard / Épicerie',
		defaultLocation: 'pantry',
		shelfLives: [
			{ location: 'pantry', basis: 'purchase', min: 1, max: 2, unit: 'years' },
			{
				location: 'pantry',
				basis: 'opened',
				min: 6,
				max: 12,
				unit: 'months',
				tipsFr: 'Conserver dans un récipient hermétique.',
				tipsEn: 'Store in an airtight container.'
			}
		]
	},
	{
		key: 'oeuf-de-plat',
		nameFr: "Plat à base d'œufs cuits",
		nameEn: 'Cooked egg dish',
		subtitleFr: 'Omelette, quiche, tarte salée',
		subtitleEn: 'Omelette, quiche, savoury tart',
		keywordsFr: 'omelette, quiche, tarte aux œufs, frittata',
		keywordsEn: 'omelette, quiche, frittata, egg pie',
		category: 'Restes / Plats cuisinés',
		defaultLocation: 'fridge',
		shelfLives: [
			{
				location: 'fridge',
				basis: 'purchase',
				min: 1,
				max: 1,
				unit: 'days',
				tipsFr: 'À consommer le jour même ou le lendemain. Ne pas reconserver plus de 24 h.',
				tipsEn: 'Consume the same day or the next day. Do not keep more than 24 h.'
			}
		]
	}
];
