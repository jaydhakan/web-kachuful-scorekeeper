import type { AchievementText } from './registry';
import type { AchievementDef } from './types';

/** What showing a code takes: its emoji and group, its name and how, and ladder titles. A GameProgression is one. */
export interface CatalogueView {
  catalogue: AchievementDef[];
  strings: {
    achievements: Record<string, AchievementText>;
    ladders: Record<string, { name: string; count: string }>;
  };
}

const codes = new WeakMap<object, Map<string, AchievementDef>>();

/** The catalogue as a map by code. */
export const byCode = (p: { catalogue: AchievementDef[] }): Map<string, AchievementDef> => {
  let m = codes.get(p);
  if (!m) codes.set(p, (m = new Map(p.catalogue.map((x) => [x.code, x]))));
  return m;
};
