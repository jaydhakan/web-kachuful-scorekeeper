import { buildFacts } from './timeline';
import { kitGame } from './__fixtures__/kit';
import { NIGHT_GAP_MS, nightOf } from './night';

const H = 3600e3;
const T0 = Date.UTC(2026, 10, 20, 14);

/** A finished game at `start` among riya, dev and asha; `made[i]` per seat for each round. */
const game = (id: string, start: number, made: boolean[][]) =>
  kitGame({
    id,
    players: ['riya', 'dev', 'asha'],
    rounds: made.map((m) => ({ made: m })),
    start,
    finished: true,
  });

describe('the night', () => {
  const g1 = game('n1', T0, [
    [true, true, false],
    [true, false, true],
  ]);
  const g2 = game('n2', T0 + 1 * H, [
    [false, true, true],
    [false, true, false],
  ]);
  // Two days earlier: another night.
  const old = game('n0', T0 - 48 * H, [[true, false, false]]);

  it('is the games with gaps of three hours or less, ending with the latest', () => {
    const n = nightOf(buildFacts([old, g1, g2], T0 + 3 * H), T0 + 3 * H)!;
    expect(n.gameIds).toEqual(['n1', 'n2']);
    expect(n.from).toBe(g1.createdAt);
  });

  it('is gone once its last game is more than twelve hours old', () => {
    expect(nightOf(buildFacts([g1, g2], T0 + 20 * H), T0 + 20 * H)).toBeNull();
  });

  it('breaks at a gap longer than three hours', () => {
    const late = game('n3', g2.finishedAt! + NIGHT_GAP_MS + 60e3, [[true, false, false]]);
    const n = nightOf(buildFacts([g1, g2, late], late.finishedAt! + H), late.finishedAt! + H)!;
    expect(n.gameIds).toEqual(['n3']);
  });

  it('names the winner by wins, the swing, the bid of the night and a brave call', () => {
    const n = nightOf(buildFacts([g1, g2], T0 + 3 * H), T0 + 3 * H)!;
    expect(n.players.map((p) => p.playerId)).toHaveLength(3);
    expect(n.gameWinners).toHaveLength(2);
    expect(n.winner).toBe(n.players[0].playerId);
    expect(n.swing).not.toBeNull();
    expect(n.bestBid?.bid).toBeGreaterThanOrEqual(0);
    expect(n.braveCall).not.toBeNull();
  });
});
