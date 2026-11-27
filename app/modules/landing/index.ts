import { actionsFor, type HeroAction } from "./lib/hero-actions";

export type { HeroAction };

/**
 * The calls to action in the landing page hero, in display order: the
 * catalogue first, then the next step for whoever is looking.
 */
export function heroActions(viewer: { id: number } | null): HeroAction[] {
  return actionsFor(viewer);
}
