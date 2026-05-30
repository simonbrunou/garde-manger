import { describe, it, expect } from 'bun:test';
import { categoryIcon } from './icons';

describe('categoryIcon', () => {
	it('maps each known FR category to its icon', () => {
		expect(categoryIcon('Fruits')).toBe('cat-fruit');
		expect(categoryIcon('Légumes')).toBe('cat-veg');
		expect(categoryIcon('Herbes')).toBe('cat-herb');
		expect(categoryIcon('Charcuterie')).toBe('cat-charcuterie');
		expect(categoryIcon('Poissons / Fruits de mer')).toBe('cat-fish');
		expect(categoryIcon('Produits laitiers')).toBe('cat-dairy');
		expect(categoryIcon('Viandes')).toBe('cat-meat');
		expect(categoryIcon('Volaille')).toBe('cat-poultry');
		expect(categoryIcon('Œufs')).toBe('cat-egg');
		expect(categoryIcon('Pain / Boulangerie')).toBe('cat-bakery');
		expect(categoryIcon('Placard / Épicerie')).toBe('cat-pantry');
		expect(categoryIcon('Restes / Plats cuisinés')).toBe('cat-leftovers');
	});
	it('falls back to cat-pantry for unknown/null', () => {
		expect(categoryIcon(null)).toBe('cat-pantry');
		expect(categoryIcon('Nope')).toBe('cat-pantry');
	});
});
