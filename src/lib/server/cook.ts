import { IDEAS, type Idea } from './cook/ideas.data';

export type { Idea };

/** Curated use-it-up ideas for a foods.category; [] for null/unknown. */
export function ideasForCategory(category: string | null | undefined): Idea[] {
	return (category && IDEAS[category]) || [];
}
