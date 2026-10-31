import type { Page } from '@playwright/test';
import { COLORS, EMOJIS, maxFor, newRound, type Decks, type Game, type Outcome } from '@/domain';
import { CURRENT_SCHEMA } from '@/state/migrations';

/** Seven names at the 14-character input limit, the widest a seat label, row or podium must hold. */
export const LONG_NAMES = [
  'Bartholomew Jr',
  'Maximilian Ray',
  'Annapurna Devi',
  'Christopher Lo',
  'Guadalupe Mora',
  'Konstantinos K',
  'Wilhelmina Fox',
];

/** The same, for the 8–10 seats a two-deck table adds. */
export const LONG_NAMES_10 = [...LONG_NAMES, 'Maximiliano Q', 'Bartolomeo Vi', 'Ferdinand Ode'];

export type SeedView = 'bidding' | 'playing' | 'results' | 'summary' | 'winner';

/**
 * A saved game with `n` players at the round dealing the most cards, built from the domain so it is always a
 * shape the app can load. Earlier rounds are finished with a fixed mix of made and missed bids.
 */
export function seedGame(
  n: number,
  view: SeedView,
  names = LONG_NAMES_10,
  decks: Decks = n > 7 ? 2 : 1,
): Game {
  const players = names.slice(0, n).map((name, i) => ({
    id: 'p' + i,
    name,
    emoji: EMOJIS[i],
    color: COLORS[i],
  }));
  const g: Game = {
    id: 'seed',
    syncId: '11111111-1111-4111-8111-111111111111',
    rev: 1,
    createdAt: Date.now() - 3600e3,
    updatedAt: Date.now() - 60e3,
    players,
    direction: 'cw',
    firstDealerIndex: 0,
    decks,
    maxCards: maxFor(n, decks),
    lengthMode: 'endless',
    rounds: [],
    status: view === 'winner' ? 'finished' : 'active',
    ui: { view: view === 'summary' ? 'summary' : 'round', bidIdx: 0 },
    schemaVersion: CURRENT_SCHEMA,
  };
  const cur = g.maxCards - 3;
  for (let i = 0; i <= cur; i++) {
    const r = newRound(g, i);
    players.forEach((p, k) => {
      r.bids[p.id] = (i + k) % 3;
      r.results[p.id] = ((i * 3 + k) % 4 ? 'made' : 'missed') as Outcome;
    });
    r.phase = 'done';
    g.rounds.push(r);
  }
  const last = g.rounds[cur];
  if (view === 'bidding') {
    // Two bids in, so the meter, the bubbles and the "who bids next" card all show something.
    g.rounds[cur] = newRound(g, cur);
    const r = g.rounds[cur];
    [r.firstPlayerIndex, (r.firstPlayerIndex + 1) % n].forEach((i) => (r.bids[players[i].id] = 1));
    g.ui.bidIdx = 2;
  } else if (view === 'playing' || view === 'results') {
    last.phase = view;
    last.results = {};
    if (view === 'results') last.results = { p0: 'made', p1: 'missed' };
  }
  return g;
}

/** Replaces whatever the app saved with `game`, on `screen`, and reloads into it. */
export async function openSeeded(page: Page, game: Game, screen: 'home' | 'round' | 'winner') {
  await page.evaluate(
    ([g, s, names]) => {
      localStorage.clear();
      localStorage.setItem('kachuful.v1', JSON.stringify(g));
      localStorage.setItem('kachuful.screen', JSON.stringify(s));
      localStorage.setItem('kachuful.recentNames', JSON.stringify(names));
      localStorage.setItem(
        'kachuful.lastGroup',
        JSON.stringify({
          names: names.slice(0, 7),
          emojis: [],
          colors: [],
          direction: 'cw',
        }),
      );
    },
    [game, screen, LONG_NAMES] as const,
  );
  await page.reload();
}
