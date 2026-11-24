import { describe, expect, it } from 'vitest';
import { cooldownLog, bySubject, pickIndex } from './banter';
import { medalsOf, plusGame, projectWinRate, sitaraByWins, type WinDay } from './medals';
import { winRateStandings } from './rules';
import type { PlayerGameFact, WinRateRow } from './types';

const row = (playerId: string, wins: number, games: number): WinRateRow => ({
  playerId,
  rank: null,
  qualified: false,
  value: 0,
  games,
  wins,
});

describe('projectWinRate', () => {
  it('ranks as winRateStandings would with the game counted', () => {
    const facts: PlayerGameFact[] = [];
    const add = (id: string, n: number, won: number) => {
      for (let i = 0; i < n; i++)
        facts.push({ gameId: `${id}${i}`, playerId: id, endedAt: 10, place: 1, won: i < won });
    };
    add('a', 8, 6);
    add('b', 8, 5);
    add('c', 7, 7);
    const base = winRateStandings(facts, 0, 100, 8);
    const projected = projectWinRate(
      base,
      new Map([
        ['c', true],
        ['a', false],
      ]),
      8,
    );
    facts.push({ gameId: 'x', playerId: 'c', endedAt: 10, place: 1, won: true });
    facts.push({ gameId: 'x', playerId: 'a', endedAt: 10, place: 2, won: false });
    expect(projected).toEqual(winRateStandings(facts, 0, 100, 8));
    expect(projected[0]).toMatchObject({ playerId: 'c', rank: 1, games: 8, wins: 8 });
  });

  it('adds a newcomer unranked until they reach the minimum', () => {
    const out = projectWinRate([], new Map([['n', true]]), 8);
    expect(out).toEqual([{ ...row('n', 1, 1), value: 1 }]);
  });

  it('gives medals from the projection once three qualify; a tie shares one', () => {
    const base = projectWinRate([row('a', 5, 9), row('b', 4, 9), row('c', 4, 8)], new Map(), 9);
    expect(medalsOf(base, []).size).toBe(0);
    const after = projectWinRate(base, new Map([['c', true]]), 9);
    expect([...medalsOf(after, [])]).toEqual([
      ['a', { medal: 1, defending: false }],
      ['c', { medal: 1, defending: false }],
      ['b', { medal: 3, defending: false }],
    ]);
  });
});

describe('sitaraByWins', () => {
  const day = (games: number, rows: [string, number, number][]): WinDay => ({
    games,
    rows: new Map(rows.map(([id, wins, g]) => [id, { wins, games: g }])),
  });
  it('nobody on a day with one game', () => {
    expect(sitaraByWins(day(1, [['a', 1, 1]]))).toEqual([]);
  });
  it('the most wins, then the most games, among players with two games', () => {
    expect(
      sitaraByWins(
        day(4, [
          ['a', 2, 4],
          ['b', 2, 3],
          ['c', 3, 1],
        ]),
      ),
    ).toEqual(['a']);
  });
  it('ties share it; no win, no star', () => {
    expect(
      sitaraByWins(
        day(3, [
          ['b', 2, 3],
          ['a', 2, 3],
        ]),
      ),
    ).toEqual(['a', 'b']);
    expect(sitaraByWins(day(3, [['a', 0, 3]]))).toEqual([]);
  });
  it('plusGame counts one more game for each seat', () => {
    const d = plusGame(
      day(1, [['a', 1, 1]]),
      new Map([
        ['a', true],
        ['b', false],
      ]),
    );
    expect(d.games).toBe(2);
    expect(sitaraByWins(d)).toEqual(['a']);
    expect(plusGame(d, new Map())).toBe(d);
  });
});

describe('banter helpers', () => {
  it('cooldownLog skips a kind heard in the last two hands', () => {
    const k = (kind: string) => ({ kind });
    expect(
      cooldownLog([[k('a')], [k('a'), k('b')], [k('a')], [k('a')], [k('b')]]).map(
        (x) => x?.kind ?? null,
      ),
    ).toEqual(['a', 'b', null, 'a', 'b']);
  });
  it('bySubject orders the medals, then the Sitara and the Legend', () => {
    const m = new Map([
      ['x', 'legend'],
      ['y', 'bronze'],
      ['z', 'gold'],
      ['w', 'sitara'],
    ] as const);
    expect(bySubject(m).map(([id]) => id)).toEqual(['z', 'y', 'w', 'x']);
  });
  it('pickIndex is stable and in range', () => {
    expect(pickIndex('g:1', 4)).toBe(pickIndex('g:1', 4));
    expect(pickIndex('g:1', 4)).toBeLessThan(4);
  });
});
