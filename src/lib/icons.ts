import type { IconName } from './components/ui/Icon.svelte';

const MAP: Record<string, IconName> = {
	Fruits: 'cat-fruit',
	Légumes: 'cat-veg',
	Herbes: 'cat-herb',
	Charcuterie: 'cat-charcuterie',
	'Poissons / Fruits de mer': 'cat-fish',
	'Produits laitiers': 'cat-dairy',
	Viandes: 'cat-meat',
	Volaille: 'cat-poultry',
	Œufs: 'cat-egg',
	'Pain / Boulangerie': 'cat-bakery',
	'Placard / Épicerie': 'cat-pantry',
	'Restes / Plats cuisinés': 'cat-leftovers'
};

/** Map a foods.category string to a category IconName; falls back to a pantry jar. */
export function categoryIcon(category: string | null | undefined): IconName {
	return (category && MAP[category]) || 'cat-pantry';
}
