import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NEWCOMER, T0, WHO, rulesWith } from '@/games/spades/domain/__fixtures__/kit';
import {
  STANDARD_RULES,
  newTable,
  sit,
  viewFor,
  type Seat,
  type SpPublic,
} from '@/games/spades/domain';
import { KEYS, storage } from '@/state/persistence';
import { TableContext, type SeatInviteMark, type TableCtx } from '../state/tableContext';
import type { SpViewOut } from '../sync/types';
import Lobby from './Lobby';

const seat = vi.hoisted(() => ({
  mine: vi.fn(),
  circle: vi.fn(),
  create: vi.fn(),
  accept: vi.fn(),
  decline: vi.fn(),
  cancel: vi.fn(),
}));
vi.mock('@/sync/seatInviteApi', () => ({ seatEp: seat, ONLINE_MS: 60_000 }));
const sp = vi.hoisted(() => ({ rules: vi.fn(), join: vi.fn() }));
vi.mock('../sync/endpoints', async (orig) => ({
  ...(await orig<typeof import('../sync/endpoints')>()),
  spEp: sp,
}));

/** Riya hosts in seat 0; `n` people seated in order (Riya, Arjun, Dev, Meera). */
function table(n: number, over: Partial<SpPublic> = {}): SpPublic {
  let s = newTable({
    id: 't1',
    code: 'KQ7M',
    name: "Riya's table",
    rules: rulesWith(),
    host: WHO[0],
    now: T0,
  });
  for (const w of WHO.slice(1, n)) {
    const r = sit(s, w, undefined, T0);
    if (!r.ok) throw new Error('sit');
    s = r.state;
  }
  return { ...s, ...over };
}
const readyAll = (s: SpPublic): SpPublic => ({
  ...s,
  seats: s.seats.map((x) => ({ ...x, ready: true })),
});
const viewOf = (s: SpPublic, me: Seat | null): SpViewOut => ({
  ...viewFor(s, null, me, T0),
  invites: [null, null, null, null],
});
const KABIR: SeatInviteMark = {
  inviteId: 'i1',
  userId: NEWCOMER.userId,
  name: 'Kabir',
  emoji: '🐯',
  color: '#ff8800',
};

function ctxOf(s: SpPublic, me: Seat | null, over: Partial<TableCtx> = {}): TableCtx {
  return {
    view: viewOf(s, me),
    invites: [null, null, null, null],
    presence: s.seats.map((x) => !!x.who),
    status: 'live',
    clockOffset: 0,
    busy: false,
    act: vi.fn(async () => 'ok' as const),
    onReaction: () => () => {},
    lastError: null,
    qrUrl: '/api/spades/tables/t1/qr.svg',
    ...over,
  };
}

function show(ctx: TableCtx) {
  const adopt = vi.fn();
  const ui = (c: TableCtx) => (
    <TableContext.Provider value={c}>
      <Lobby adopt={adopt} reveal={false} onRevealDone={() => {}} />
    </TableContext.Provider>
  );
  const r = render(ui(ctx));
  return { ...r, adopt, again: (c: TableCtx) => r.rerender(ui(c)) };
}
const u = () => userEvent.setup({ pointerEventsCheck: 0 });

beforeEach(() => {
  history.replaceState(null, '', '/spades?table=t1');
  Object.values(seat).forEach((f) => f.mockReset());
  Object.values(sp).forEach((f) => f.mockReset());
  storage.remove(KEYS.spLastSetup);
});

describe('the lobby, host and guest', () => {
  it('shows the host the code, the share card, Invite on empty chairs and Shuffle partners', () => {
    show(ctxOf(table(2), 0));
    expect(screen.getByRole('heading', { level: 1, name: "Riya's table" })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Room code K Q 7 M' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'QR code that opens table KQ7M' })).toHaveAttribute(
      'src',
      '/api/spades/tables/t1/qr.svg',
    );
    expect(
      screen.getByRole('button', { name: /^Rules: 200 points · Nil · 30 s turns\. Edit rules/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Invite someone to the top chair' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Invite someone to the right chair' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /^Arjun, Opponent/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Shuffle partners' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Waiting for players…' })).toBeDisabled();
  });

  it('gives a guest Sit here, no Shuffle, and says who deals; the share card goes once the table is full', async () => {
    const { again } = show(ctxOf(table(3), 1));
    expect(screen.queryByRole('button', { name: /^Invite someone/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Shuffle partners' })).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Riya deals when everyone is ready' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: /^Rules: .*View the rules$/ })).toBeInTheDocument();
    // Seat 1's view: Dev (seat 2) is on the left, the empty seat 3 opposite is the partner's.
    expect(screen.getByRole('group', { name: /^Riya, host, Opponent/ })).toBeInTheDocument();
    sp.join.mockResolvedValue(viewOf(table(3), 3));
    await u().click(screen.getByRole('button', { name: 'Sit in the top chair' }));
    expect(sp.join).toHaveBeenCalledWith('t1', 3);
    expect(screen.getByRole('img', { name: /^QR code/ })).toBeInTheDocument();
    again(ctxOf(table(4), 1));
    expect(screen.queryByRole('img', { name: /^QR code/ })).not.toBeInTheDocument();
  });
});

describe('seat invites from the lobby', () => {
  it('invites from the sheet (Move here first), shows the invited chair, and cancels it quietly', async () => {
    seat.circle.mockResolvedValue({
      items: [
        {
          userId: NEWCOMER.userId,
          playerId: 'p5',
          name: 'Kabir',
          emoji: '🐯',
          color: '#ff8800',
          photoUrl: null,
          lastSeenAt: null,
          lastPlayedAt: null,
        },
      ],
    });
    seat.create.mockResolvedValue({});
    seat.cancel.mockResolvedValue(undefined);
    const user = u();
    const s = table(2);
    const { again } = show(ctxOf(s, 0));
    await user.click(screen.getByRole('button', { name: 'Invite someone to the top chair' }));
    const sheet = await screen.findByRole('dialog', { name: 'Invite to this seat' });
    expect(
      within(sheet).getByText('They will be your partner.', { exact: false }),
    ).toBeInTheDocument();
    expect(within(sheet).getAllByRole('button')[1]).toHaveTextContent('Move here');
    await user.click(await within(sheet).findByRole('button', { name: /^Invite Kabir/ }));
    expect(seat.create).toHaveBeenCalledWith('t1', { userId: NEWCOMER.userId, seat: '2' });
    expect(await screen.findByText('Invite sent to Kabir')).toBeInTheDocument();

    const invited = ctxOf(s, 0, { invites: [null, null, KABIR, null] });
    again(invited);
    await user.click(screen.getByRole('button', { name: 'Kabir is invited. Cancel the invite' }));
    await user.click(screen.getByRole('button', { name: 'Cancel invite' }));
    expect(seat.cancel).toHaveBeenCalledWith('i1');
    again(ctxOf(s, 0));
    expect(await screen.findByText('Invite to Kabir cancelled')).toBeInTheDocument();
    expect(screen.queryByText('Kabir can’t join')).not.toBeInTheDocument();
  });

  it('a declined invite empties the chair with a toast; a guest sees the invited chair but cannot cancel it', () => {
    const s = table(2);
    const { again } = show(ctxOf(s, 0, { invites: [null, null, KABIR, null] }));
    again(ctxOf(s, 0));
    expect(screen.getByText('Kabir can’t join')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Invite someone to the top chair' }),
    ).toBeInTheDocument();

    again(ctxOf(s, 1, { invites: [null, null, KABIR, null] }));
    expect(screen.getByRole('img', { name: 'Kabir is invited' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cancel the invite/ })).not.toBeInTheDocument();
  });

  it('announces someone who joins', () => {
    const { again } = show(ctxOf(table(2), 0));
    again(ctxOf(table(3), 0));
    expect(screen.getByText('Dev joined')).toBeInTheDocument();
  });
});

describe('ready and the draw for deal', () => {
  it('I’m ready and Not ready send their actions', async () => {
    const ctx = ctxOf(table(4), 2);
    const { again } = show(ctx);
    await u().click(screen.getByRole('button', { name: 'I’m ready' }));
    expect(ctx.act).toHaveBeenCalledWith({ type: 'ready' });
    const s = table(4);
    s.seats[2] = { ...s.seats[2], ready: true };
    const next = ctxOf(s, 2);
    again(next);
    expect(screen.getByRole('group', { name: /^You, .*ready$/ })).toBeInTheDocument();
    await u().click(screen.getByRole('button', { name: 'Not ready' }));
    expect(next.act).toHaveBeenCalledWith({ type: 'unready' });
  });

  it('lights Draw for deal only when all four are seated, connected and ready', async () => {
    const { again } = show(ctxOf(table(4), 0));
    expect(
      screen.getByRole('button', { name: 'Waiting for everyone to be ready…' }),
    ).toBeDisabled();
    const all = readyAll(table(4));
    again(ctxOf(all, 0, { presence: [true, true, false, true] }));
    expect(screen.getByRole('button', { name: 'Waiting for everyone to connect…' })).toBeDisabled();
    expect(screen.getByRole('group', { name: /^Dev, .*not connected/ })).toBeInTheDocument();
    const ok = ctxOf(all, 0);
    again(ok);
    const draw = screen.getByRole('button', { name: 'Draw for deal' });
    expect(draw).toBeEnabled();
    await u().click(draw);
    expect(ok.act).toHaveBeenCalledWith({ type: 'drawForDeal' });
    expect(screen.getByRole('button', { name: 'Shuffle partners' })).toBeEnabled();
  });

  it('a guest’s draw button stays off even when everyone is ready', () => {
    show(ctxOf(readyAll(table(4)), 3));
    expect(
      screen.getByRole('button', { name: 'Riya deals when everyone is ready' }),
    ).toBeDisabled();
  });
});

describe('the rules line and sheet', () => {
  it('the host’s change goes to the server, is remembered, and Reset goes back to the standard rules', async () => {
    sp.rules.mockImplementation(async (_id, rules) => viewOf(table(2, { rules, rev: 9 }), 0));
    const user = u();
    const { adopt } = show(ctxOf(table(2), 0));
    await user.click(screen.getByRole('button', { name: /^Rules:/ }));
    const sheet = screen.getByRole('dialog', { name: 'Table rules' });
    await user.click(within(sheet).getByRole('button', { name: '300' }));
    await waitFor(() =>
      expect(sp.rules).toHaveBeenCalledWith(
        't1',
        { ...STANDARD_RULES, target: 300 },
        "Riya's table",
      ),
    );
    expect(storage.get(KEYS.spLastSetup, null)).toMatchObject({ target: 300 });
    await waitFor(() => expect(adopt).toHaveBeenCalled());
    await user.click(within(sheet).getByRole('switch', { name: /^Mercy rule/ }));
    await waitFor(() =>
      expect(sp.rules).toHaveBeenLastCalledWith(
        't1',
        expect.objectContaining({ mercy: -200 }),
        "Riya's table",
      ),
    );
    await user.click(within(sheet).getByRole('button', { name: 'Reset to standard' }));
    await waitFor(() =>
      expect(sp.rules).toHaveBeenLastCalledWith('t1', STANDARD_RULES, "Riya's table"),
    );
    expect(within(sheet).getByText('Back to the standard rules.')).toBeInTheDocument();
  });

  it('Blind Nil needs Nil, and turning Nil off turns Blind Nil off', async () => {
    // Still in flight: the sheet shows the host's draft.
    sp.rules.mockImplementation(() => new Promise(() => {}));
    const user = u();
    show(ctxOf(table(2, { rules: rulesWith({ blindNil: true }) }), 0));
    await user.click(screen.getByRole('button', { name: /^Rules:/ }));
    await user.click(screen.getByRole('switch', { name: /^Nil/ }));
    await waitFor(() =>
      expect(sp.rules).toHaveBeenCalledWith(
        't1',
        expect.objectContaining({ nil: false, blindNil: false }),
        "Riya's table",
      ),
    );
    expect(screen.getByRole('switch', { name: /^Blind Nil/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('a guest sees the same sheet read-only, and who can change it', async () => {
    const user = u();
    show(ctxOf(table(2), 1));
    await user.click(screen.getByRole('button', { name: /^Rules:/ }));
    const sheet = screen.getByRole('dialog', { name: 'Table rules' });
    expect(within(sheet).getByText('Only Riya can change these.')).toBeInTheDocument();
    expect(
      within(sheet).queryByRole('button', { name: 'Reset to standard' }),
    ).not.toBeInTheDocument();
    expect(within(sheet).queryByLabelText('Table name')).not.toBeInTheDocument();
    await user.click(within(sheet).getByRole('switch', { name: /^Mercy rule/ }));
    await user.click(within(sheet).getByRole('button', { name: '300' }));
    expect(sp.rules).not.toHaveBeenCalled();
  });

  it('flashes the line on every phone when the rules change', () => {
    const { again } = show(ctxOf(table(2), 1));
    const line = screen.getByRole('button', { name: /^Rules:/ });
    expect(line).not.toHaveAttribute('data-flash');
    act(() => again(ctxOf(table(2, { rules: rulesWith({ target: 100 }) }), 1)));
    expect(screen.getByRole('button', { name: /^Rules: 100 points/ })).toHaveAttribute(
      'data-flash',
      '1',
    );
  });
});
