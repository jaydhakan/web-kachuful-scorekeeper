import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { started } from '@/games/ishaara/domain/__fixtures__/kit';
import type { IshaaraRules, Seated } from '@/games/ishaara/domain';
import { IshaaraProvider } from '@/games/ishaara/state/store';
import { archive, type PlayerRec } from '@/state/archive';
import { saveIshLastSetup } from '@/state/persistence';
import { setSession } from '@/sync/session';
import Setup from './Setup';

const rec = (id: string, name: string, linkedUserId: string | null): PlayerRec => ({
  id,
  displayName: name,
  nameKey: name.toLowerCase(),
  emoji: '🙂',
  color: '#f5a524',
  createdAt: 1,
  updatedAt: 1,
  local: false,
  linkedUserId,
});
const seat = (id: string, name: string, team: Seated['team'], role: Seated['role']): Seated => ({
  id: `s-${id}`,
  name,
  emoji: '🙂',
  color: '#f5a524',
  playerId: id,
  team,
  role,
});
const RULES: IshaaraRules = { timerSec: null, clueEntry: 'typed', packs: ['everyday'], bestOf: 1 };

let posted: { url: string; body: unknown }[] = [];
beforeEach(() => {
  posted = [];
  setSession({
    user: { id: 'u-jay', email: 'j@x.y', role: 'member', playerId: 'p-jay' },
    player: { id: 'p-jay', displayName: 'Jay', emoji: '🐯', color: '#f5a524' },
  });
  archive.put(
    'players',
    rec('p-jay', 'Jay', 'u-jay'),
    rec('p-riya', 'Riya', 'u-riya'),
    rec('p-dev', 'Dev', 'u-dev'),
    rec('p-meera', 'Meera', null),
    rec('p-isha', 'Isha', null),
  );
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    if (init?.method === 'POST') {
      posted.push({ url, body: JSON.parse(String(init.body)) });
      const g = started().state;
      return new Response(
        JSON.stringify({
          game: { ...g, status: 'waiting' },
          me: { host: true, team: null },
          serverNow: 1,
        }),
        { status: 201 },
      );
    }
    return new Response(JSON.stringify({ items: [], nextCursor: null }));
  });
});
afterEach(() => vi.unstubAllGlobals());

const show = () =>
  render(
    <IshaaraProvider initial={{ screen: 'setup', gameId: null, role: 'table' }}>
      <Setup />
    </IshaaraProvider>,
  );
const next = () => screen.getByRole('button', { name: 'Next: words' });

describe('Ishaara setup', () => {
  it('holds Next until each team has two players and a signed-in clue-giver', () => {
    saveIshLastSetup({
      players: [
        seat('p-jay', 'Jay', 'sun', 'clue-giver'),
        seat('p-riya', 'Riya', 'sun', 'guesser'),
        seat('p-dev', 'Dev', 'sun', 'guesser'),
        seat('p-meera', 'Meera', 'moon', 'guesser'),
      ],
      packs: ['everyday'],
      customWords: [],
      rules: RULES,
      at: 1,
    });
    show();
    expect(next()).toBeDisabled();
    expect(screen.getByText('Each team needs at least 2 players.')).toBeInTheDocument();
    // Dev moves to Moon and, as Moon's only signed-in player, becomes its clue-giver (Meera has no account).
    fireEvent.click(screen.getByRole('button', { name: 'Dev, move to Moon' }));
    expect(screen.getByRole('radio', { name: 'Dev gives the clues' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Meera gives the clues' })).toBeDisabled();
    expect(next()).toBeEnabled();
    // Picking Riya hands Sun's clues over; moving Dev back leaves Moon without anyone signed in.
    fireEvent.click(screen.getByRole('radio', { name: 'Riya gives the clues' }));
    expect(screen.getByRole('radio', { name: 'Jay gives the clues' })).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Dev, move to Sun' }));
    fireEvent.click(screen.getByRole('button', { name: 'Jay (you), move to Moon' }));
    expect(next()).toBeEnabled();
    expect(screen.getByRole('radio', { name: 'Jay gives the clues' })).toBeChecked();
  });

  it('marks who can’t give clues, and Invite tells a member to ask the admin', () => {
    saveIshLastSetup({
      players: [
        seat('p-jay', 'Jay', 'sun', 'clue-giver'),
        seat('p-isha', 'Isha', 'sun', 'guesser'),
        seat('p-dev', 'Dev', 'moon', 'clue-giver'),
        seat('p-meera', 'Meera', 'moon', 'guesser'),
      ],
      packs: ['everyday'],
      customWords: [],
      rules: RULES,
      at: 1,
    });
    show();
    expect(screen.getAllByText('Not signed in · can guess, can’t give clues')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Invite Isha' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Only the admin can send invites');
  });

  it('needs a pack (or 25 custom words), then Start creates the game with 25 words', async () => {
    saveIshLastSetup({
      players: [
        seat('p-jay', 'Jay', 'sun', 'clue-giver'),
        seat('p-isha', 'Isha', 'sun', 'guesser'),
        seat('p-dev', 'Dev', 'moon', 'clue-giver'),
        seat('p-meera', 'Meera', 'moon', 'guesser'),
      ],
      packs: ['everyday'],
      customWords: [],
      rules: RULES,
      at: 1,
    });
    show();
    fireEvent.click(next());
    const start = screen.getByRole('button', { name: 'Start game' });
    const packs = screen.getByRole('region', { name: /word packs/i });
    fireEvent.click(within(packs).getByRole('checkbox', { name: 'English' }));
    expect(start).toBeDisabled();
    expect(screen.getByText('Pick a pack, or add at least 25 custom words.')).toBeInTheDocument();
    fireEvent.click(within(packs).getByRole('checkbox', { name: 'Hinglish' }));
    fireEvent.click(screen.getByRole('button', { name: '2 min' }));
    expect(start).toBeEnabled();
    await act(async () => fireEvent.click(start));
    await waitFor(() => expect(posted).toHaveLength(1));
    const body = posted[0].body as { words: string[]; players: Seated[]; rules: unknown };
    expect(posted[0].url).toMatch(/\/api\/ishaara\/games$/);
    expect(body.words).toHaveLength(25);
    expect(body.rules).toEqual({
      timerSec: 120,
      clueEntry: 'typed',
      bestOf: 1,
      packs: ['hinglish'],
    });
    expect(body.players.map((p) => [p.playerId, p.team, p.role])).toEqual([
      ['p-jay', 'sun', 'clue-giver'],
      ['p-isha', 'sun', 'guesser'],
      ['p-dev', 'moon', 'clue-giver'],
      ['p-meera', 'moon', 'guesser'],
    ]);
  });
});
