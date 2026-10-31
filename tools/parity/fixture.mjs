// Deterministic seeds written to localStorage before either app loads.
import { readFileSync } from 'node:fs';
import path from 'node:path';

export const FIXED_TIME = new Date('2026-01-01T12:00:00Z');
const saved = JSON.parse(
  readFileSync(
    path.resolve(import.meta.dirname, '../../src/state/__fixtures__/prototype-save.json'),
    'utf8',
  ),
);

// The fixture has one bid already taken; the demo game proper is that save with Dev's bid removed.
const demo = structuredClone(saved['kachuful.v1']);
delete demo.rounds.at(-1).bids.p4;
demo.ui.bidIdx = 2;
demo.updatedAt = FIXED_TIME.getTime() - 12 * 60e3;

export const seeds = {
  demo: {
    'kachuful.v1': demo,
    'kachuful.screen': 'round',
    'kachuful.lastGroup': saved['kachuful.lastGroup'],
    'kachuful.recentNames': saved['kachuful.recentNames'],
  },
  home: {
    'kachuful.v1': demo,
    'kachuful.screen': 'home',
    'kachuful.lastGroup': saved['kachuful.lastGroup'],
    'kachuful.recentNames': saved['kachuful.recentNames'],
  },
};
