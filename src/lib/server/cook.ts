import { IDEAS, GENERIC_IDEA, type Idea } from './cook/ideas.data';

export type { Idea };
export { GENERIC_IDEA };

/** Curated use-it-up ideas for a foods.category; [] for null/unknown. */
export function ideasForCategory(category: string | null | undefined): Idea[] {
	return (category && IDEAS[category]) || [];
}
