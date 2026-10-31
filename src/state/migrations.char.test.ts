import { demoGame, doneRounds, standings, totals, type Game } from '@/domain';
import fixture from './__fixtures__/prototype-save.json';
import { migrateGame } from './migrations';

/** What every older save must still load as, whatever later migrations add. */
const essence = (g: Game | null) =>
  g && {
    id: g.id,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
    status: g.status,
    decks: g.decks,
    maxCards: g.maxCards,
    lengthMode: g.lengthMode,
    direction: g.direction,
    firstDealerIndex: g.firstDealerIndex,
    players: g.players.map(({ id, name, emoji, color }) => ({ id, name, emoji, color })),
    rounds: g.rounds.map(({ index, cards, trump, bids, results, tricks, hookHits, phase }) => ({
      index,
      cards,
      trump,
      bids,
      results,
      tricks,
      hookHits,
      phase,
    })),
    ui: g.ui,
    totals: totals(g),
    ranks: standings(g).map((s) => [s.p.id, s.rank]),
    done: doneRounds(g).length,
  };

const v1 = (): Record<string, unknown> => {
  const g: Record<string, unknown> = { ...demoGame(), schemaVersion: 1 };
  delete g.decks;
  return g;
};

describe('older saves keep their games', () => {
  it('a prototype save (v0) keeps its players, rounds, totals and places', () => {
    const raw = fixture['kachuful.v1'] as unknown as Game;
    const e = essence(migrateGame(raw))!;
    expect(e.players).toEqual(
      raw.players.map(({ id, name, emoji, color }) => ({ id, name, emoji, color })),
    );
    expect(e.rounds.map((r) => r.bids)).toEqual(raw.rounds.map((r) => r.bids));
    expect(e.done).toBe(6);
    expect(e.decks).toBe(1);
    expect(e.totals).toMatchSnapshot();
  });

  it('a v1 save plays with one deck and keeps everything else', () => {
    const raw = v1();
    const e = essence(migrateGame(raw))!;
    expect(e).toMatchObject({ decks: 1, id: raw.id, createdAt: raw.createdAt });
    expect(e.totals).toEqual(totals(raw as unknown as Game));
  });

  it('a v2 save keeps every field it had', () => {
    const raw = { ...demoGame(), decks: 2 as const, schemaVersion: 2 };
    const g = migrateGame(raw)!;
    for (const [k, v] of Object.entries(raw))
      if (k !== 'schemaVersion') expect(g).toHaveProperty(k, v);
    expect(essence(g)).toEqual(essence(raw as Game));
  });

  it('a finished v2 save stays finished with the same winner', () => {
    const raw = { ...demoGame(), status: 'finished' as const, schemaVersion: 2 };
    raw.rounds = raw.rounds.filter((r) => r.phase === 'done');
    const g = migrateGame(raw)!;
    expect(g.status).toBe('finished');
    expect(standings(g)[0].p.id).toBe(standings(raw as Game)[0].p.id);
  });
});
