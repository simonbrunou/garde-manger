import { describe, it, expect } from 'bun:test';
import { ideasForCategory } from './cook';
import { IDEAS } from './cook/ideas.data';

describe('ideasForCategory', () => {
	it('returns curated ideas for a known category', () => {
		const fruits = ideasForCategory('Fruits');
		expect(fruits.length).toBeGreaterThan(0);
		expect(fruits[0]).toHaveProperty('fr');
		expect(fruits[0]).toHaveProperty('en');
	});
	it('returns [] for null/unknown', () => {
		expect(ideasForCategory(null)).toEqual([]);
		expect(ideasForCategory(undefined)).toEqual([]);
		expect(ideasForCategory('Nope')).toEqual([]);
	});
	it('covers all 12 catalogue categories with at least one idea each', () => {
		const cats = [
			'Fruits',
			'Légumes',
			'Herbes',
			'Charcuterie',
			'Poissons / Fruits de mer',
			'Produits laitiers',
			'Viandes',
			'Volaille',
			'Œufs',
			'Pain / Boulangerie',
			'Placard / Épicerie',
			'Restes / Plats cuisinés'
		];
		for (const c of cats) expect(ideasForCategory(c).length).toBeGreaterThan(0);
	});
	it('every idea in the dataset has non-empty fr and en strings', () => {
		for (const list of Object.values(IDEAS))
			for (const idea of list) {
				expect(idea.fr.length).toBeGreaterThan(0);
				expect(idea.en.length).toBeGreaterThan(0);
			}
	});
});
