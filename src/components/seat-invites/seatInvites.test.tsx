import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/sync/api';
import type { CircleMember } from '@/sync/seatInviteApi';
import {
  putInvite,
  resetSeatInvitesForTests,
  setInvites,
  type SeatInvite,
} from '@/sync/seatInvites';
import { resetSignalsForTests, useQuietInvites } from '@/sync/seatInviteSignals';
import { InviteBanner } from './InviteBanner';
import { SeatInviteCards } from './InviteCard';
import { SeatInviteRing } from './SeatInviteRing';
import { TableInviteSheet } from './TableInviteSheet';

const ep = vi.hoisted(() => ({
  mine: vi.fn(),
  circle: vi.fn(),
  create: vi.fn(),
  accept: vi.fn(),
  decline: vi.fn(),
  cancel: vi.fn(),
}));
vi.mock('@/sync/seatInviteApi', () => ({ seatEp: ep, ONLINE_MS: 60_000 }));
const notice = vi.hoisted(() => ({ say: vi.fn() }));
vi.mock('@/platform/notice', () => notice);

const NOW = Date.now();
const inv = (over: Partial<SeatInvite> = {}): SeatInvite => ({
  id: 'i1',
  kind: 'spades-online',
  gameId: 'g1',
  seat: '0',
  status: 'pending',
  createdAt: NOW,
  from: { userId: 'u-kabir', name: 'Kabir', emoji: '🐯', color: '#ff8800', photoUrl: null },
  table: { name: 'Sunday spades', seatsTaken: [1, 2, 3] },
  partner: { name: 'Zoya' },
  ...over,
});
const person = (name: string, over: Partial<CircleMember> = {}): CircleMember => ({
  userId: `u-${name}`,
  playerId: `p-${name}`,
  name,
  emoji: '🙂',
  color: '#888888',
  photoUrl: null,
  lastSeenAt: null,
  lastPlayedAt: NOW - 2 * 86_400_000,
  ...over,
});

const u = () => userEvent.setup({ pointerEventsCheck: 0 });

beforeEach(() => {
  resetSeatInvitesForTests();
  resetSignalsForTests();
  Object.values(ep).forEach((f) => f.mockReset());
  notice.say.mockReset();
});
afterEach(() => vi.useRealTimers());

describe('invite cards', () => {
  it('shows the host, the table, your partner and the seat map with your seat free', () => {
    setInvites([inv()], NOW);
    render(<SeatInviteCards game="spades" />);
    const card = screen.getByRole('article', { name: 'Kabir invited you' });
    expect(card).toHaveTextContent('Sunday spades · you’d partner Zoya');
    expect(
      within(card).getByRole('img', { name: '3 of 4 seats taken, yours is free' }),
    ).toBeVisible();
  });

  it('declines from the keyboard: the card goes and the host is told', async () => {
    const user = u();
    ep.decline.mockResolvedValue({});
    setInvites([inv()], NOW);
    render(<SeatInviteCards game="spades" />);
    await user.tab();
    expect(screen.getByRole('button', { name: 'Decline' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(ep.decline).toHaveBeenCalledWith('i1');
    await waitFor(() => expect(screen.queryByRole('article')).toBeNull());
    expect(notice.say).toHaveBeenCalledWith('Invite declined. Kabir will see that.');
  });

  it('says the table has filled up when Join is too late, then lets the card go', async () => {
    const user = u();
    ep.accept.mockRejectedValue(new ApiError(409, 'filled'));
    setInvites([inv()], NOW);
    render(<SeatInviteCards game="spades" />);
    await user.click(screen.getByRole('button', { name: 'Join' }));
    expect(await screen.findByRole('status')).toHaveTextContent('This table has filled up');
    expect(screen.queryByRole('button', { name: 'Join' })).toBeNull();
    await waitFor(() => expect(screen.queryByRole('article')).toBeNull(), { timeout: 4000 });
  });

  it('keeps the card with an error when the server can’t be reached', async () => {
    const user = u();
    ep.decline.mockRejectedValue(new ApiError(0, 'offline'));
    setInvites([inv()], NOW);
    render(<SeatInviteCards game="spades" />);
    await user.click(screen.getByRole('button', { name: 'Decline' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t reach the server');
    expect(screen.getByRole('article')).toBeVisible();
  });

  it('shows nothing when no invite waits for that game', () => {
    setInvites([inv()], NOW);
    const { container } = render(<SeatInviteCards game="ishaara" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('the table invite sheet', () => {
  it('lists Online now first, then the circle by last game, and invites in one tap', async () => {
    const user = u();
    ep.circle.mockResolvedValue({
      items: [
        person('Asha', { lastPlayedAt: NOW - 86_400_000 }),
        person('Riya', { lastSeenAt: Date.now() - 10_000 }),
        person('Om', { lastPlayedAt: NOW - 10 * 86_400_000 }),
      ],
    });
    const onPick = vi.fn();
    render(
      <TableInviteSheet onPick={onPick} onClose={() => {}} subtitle="They will be your partner." />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Looking up your circle');
    const online = await screen.findByRole('region', { name: 'Online now' });
    expect(
      within(online)
        .getAllByRole('button')
        .map((b) => b.getAttribute('aria-label')),
    ).toEqual(['Invite Riya, online now, played 2 d ago']);
    const circle = screen.getByRole('region', { name: 'Your circle' });
    expect(
      within(circle)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual([expect.stringContaining('Asha'), expect.stringContaining('Om')]);
    // Focus starts on the first person, not the search field (a phone's keyboard stays down).
    await waitFor(() => expect(within(online).getByRole('button')).toHaveFocus());
    await user.click(within(circle).getAllByRole('button')[1]);
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ name: 'Om' }));
  });

  it('searches, says when nobody matches, and leaves out the excluded', async () => {
    const user = u();
    ep.circle.mockResolvedValue({ items: [person('Asha'), person('Riya')] });
    render(<TableInviteSheet onPick={() => {}} onClose={() => {}} exclude={['u-Riya']} />);
    await screen.findByRole('region', { name: 'Your circle' });
    expect(screen.queryByText('Riya')).toBeNull();
    await user.type(screen.getByRole('searchbox', { name: 'Search your circle' }), 'zz');
    expect(screen.getByRole('status')).toHaveTextContent('No one called “zz” in your circle');
  });

  it('says when the circle is empty, and when it couldn’t load (with Retry)', async () => {
    const user = u();
    ep.circle.mockRejectedValueOnce(new ApiError(0, 'offline'));
    ep.circle.mockResolvedValueOnce({ items: [] });
    render(<TableInviteSheet onPick={() => {}} onClose={() => {}} />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Couldn’t load your circle.');
    await user.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText(/Nobody to invite yet/)).toBeInTheDocument();
  });

  it('keeps the row busy while sending and says so if it fails; Escape closes', async () => {
    const user = u();
    ep.circle.mockResolvedValue({ items: [person('Asha')] });
    let fail!: (e: Error) => void;
    const onClose = vi.fn();
    render(
      <TableInviteSheet onPick={() => new Promise((_, no) => (fail = no))} onClose={onClose} />,
    );
    const row = await screen.findByRole('button', { name: /Invite Asha/ });
    await user.click(row);
    expect(row).toHaveAttribute('aria-busy', 'true');
    await act(async () => fail(new Error('nope')));
    expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t send the invite');
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});

describe('the invite banner', () => {
  it('announces an invite that arrives during the visit, and Later sends it away', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime, pointerEventsCheck: 0 });
    setInvites([inv({ id: 'old' })], NOW);
    render(<InviteBanner />);
    await act(async () => void vi.advanceTimersByTime(1000));
    // An invite already waiting when the page opened is the badge's and the card's, not the banner's.
    expect(screen.queryByRole('region', { name: 'Invite' })).toBeNull();
    act(() => putInvite(inv({ id: 'new', createdAt: Date.now() })));
    await act(async () => void vi.advanceTimersByTime(400));
    const banner = screen.getByRole('region', { name: 'Invite' });
    expect(banner).toHaveTextContent('Kabir invited you');
    expect(banner).toHaveTextContent('Sunday spades · you’d partner Zoya');
    expect(
      screen.getByText(/Kabir invited you.*Sunday spades/, { selector: '.sr-only' }),
    ).toBeTruthy();
    // Reduced motion: it fades, it doesn't slide.
    expect(banner.style.transform).not.toMatch(/translate/);
    await user.click(within(banner).getByRole('button', { name: 'Later' }));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Invite' })).toBeNull());
  });

  it('goes by itself after 8 s, closes on Escape, and stays away while a game keeps it quiet', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    setInvites([], NOW);
    const Quiet = ({ on }: { on: boolean }) => {
      useQuietInvites(on);
      return null;
    };
    const { rerender } = render(
      <>
        <InviteBanner />
        <Quiet on />
      </>,
    );
    act(() => putInvite(inv({ id: 'a', createdAt: Date.now() })));
    await act(async () => void vi.advanceTimersByTime(1000));
    expect(screen.queryByRole('region', { name: 'Invite' })).toBeNull();
    rerender(
      <>
        <InviteBanner />
        <Quiet on={false} />
      </>,
    );
    await act(async () => void vi.advanceTimersByTime(400));
    expect(screen.getByRole('region', { name: 'Invite' })).toBeInTheDocument();
    await act(async () => void vi.advanceTimersByTime(8100));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Invite' })).toBeNull());

    act(() => putInvite(inv({ id: 'b', createdAt: Date.now() })));
    await act(async () => void vi.advanceTimersByTime(400));
    const banner = screen.getByRole('region', { name: 'Invite' });
    within(banner).getByRole('button', { name: 'Join' }).focus();
    act(() => {
      banner.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Invite' })).toBeNull());
  });
});

describe('the invited chair', () => {
  it('turns its ring only with motion allowed', () => {
    const { container } = render(
      <SeatInviteRing>
        <span>🐯</span>
      </SeatInviteRing>,
    );
    const ring = container.querySelector('[data-invited] > span[aria-hidden]')!;
    expect(ring.className).toContain('animate-[spin_5s_linear_infinite]');
    expect(ring.className).toContain('motion-reduce:animate-none');
  });
});
