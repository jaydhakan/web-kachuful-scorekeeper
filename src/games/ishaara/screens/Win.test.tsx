import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { clue, pick, started, act as play, TABLE } from '@/games/ishaara/domain/__fixtures__/kit';
import type { IshaaraPublic } from '@/games/ishaara/domain';
import { IshaaraProvider } from '@/games/ishaara/state/store';
import Win, { clueLog } from './Win';

const show = (g: IshaaraPublic) =>
  render(
    <IshaaraProvider initial={{ screen: 'win', gameId: g.id, role: 'table' }}>
      <Win game={g} />
    </IshaaraProvider>,
  );

/** Sun finds two, then misses on a blank; Moon's clue runs into the trap. */
function trapGame() {
  let k = clue(started(), 'spice', 2);
  k = pick(k, 0);
  k = pick(k, 1);
  k = pick(k, 20);
  k = clue(k, 'river', 3);
  k = pick(k, 9);
  return pick(k, 24);
}

afterEach(() => vi.unstubAllGlobals());

describe('the result', () => {
  it('says who won and how, shows the whole key and the clue log', () => {
    const g = trapGame().state;
    show(g);
    expect(screen.getByRole('heading', { name: 'Sun wins' })).toBeInTheDocument();
    expect(screen.getByText('Moon picked the trap: CHAI.')).toBeInTheDocument();
    const key = screen.getByRole('list', { name: 'The full key, every card' });
    expect(within(key).getAllByRole('listitem')).toHaveLength(25);
    expect(within(key).getByText('CHAI, the trap')).toBeInTheDocument();
    expect(within(key).getByText('RIVER, Sun’s word')).toBeInTheDocument();
    const log = screen.getByRole('list', { name: 'Clue log' });
    expect(log).toHaveTextContent('spice · 2');
    expect(log).toHaveTextContent('2 found, blank');
    expect(log).toHaveTextContent('1 found, trap');
  });

  it('logs each clue’s run, a ruled-out clue included', () => {
    let k = clue(started(), 'spice', 1);
    k = play(k, { kind: 'clue-giver', team: 'moon' }, { type: 'notAllowed' });
    expect(clueLog(k.state)).toEqual([
      { team: 'sun', word: 'spice', number: 1, found: 0, endedOn: null, ruledOut: true },
    ]);
  });

  it('a resignation and the best-of-3 score', () => {
    const k = started({ rules: { bestOf: 3 } });
    const g = play(k, TABLE, { type: 'resign', team: 'moon' }).state;
    show(g);
    expect(screen.getByText('Moon resigned.')).toBeInTheDocument();
    expect(screen.getByText('Best of 3 · game 1 · Sun 1, Moon 0')).toBeInTheDocument();
  });

  it('Rematch deals 25 fresh words from the same packs and asks the server for the next game', async () => {
    const g = trapGame().state;
    const posted: { url: string; body: { words: string[] } }[] = [];
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      posted.push({ url, body: JSON.parse(String(init?.body)) });
      return new Response(
        JSON.stringify({
          game: { ...g, id: 'next', status: 'waiting' },
          me: { host: true, team: null },
          serverNow: 1,
        }),
        { status: 201 },
      );
    });
    show(g);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Rematch' })));
    await waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0].url).toMatch(new RegExp(`/api/ishaara/games/${g.id}/rematch$`));
    expect(posted[0].body.words).toHaveLength(25);
  });
});
