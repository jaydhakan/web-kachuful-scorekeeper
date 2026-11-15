import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@/state/persistence';
import { resetSeatInvitesForTests, serverNow, type SeatInvite } from './seatInvites';
import { startSeatInvites } from './seatInvitesLive';
import { setSession } from './session';

const T0 = Date.UTC(2026, 10, 16, 12);
const SESSION: Session = {
  user: { id: 'u-riya', email: 'riya@kachuful.test', role: 'member', playerId: 'p-riya' },
  player: { id: 'p-riya', displayName: 'Riya', emoji: '🌸', color: '#ff66aa' },
};
const inv: SeatInvite = {
  id: 'i1',
  kind: 'ishaara',
  gameId: 'g1',
  seat: 'clue:sun',
  status: 'pending',
  createdAt: T0,
  from: { userId: 'u-jay', name: 'Jay', emoji: '🦊', color: '#ff8800', photoUrl: null },
  table: { name: 'Jay’s game', seatsTaken: [] },
  partner: null,
};

let streams: AbortSignal[] = [];
let lists = 0;
let visibility: DocumentVisibilityState = 'visible';

const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
  if (url.endsWith('/seat-invites')) {
    lists++;
    return new Response(JSON.stringify({ items: [inv], serverNow: T0 + 1000 }), { status: 200 });
  }
  if (url.endsWith('/me/events')) {
    streams.push(init!.signal!);
    // A stream that stays open until aborted.
    return new Response(new ReadableStream({ start() {} }), { status: 200 });
  }
  return new Response('{}', { status: 404 });
});

const flush = () => new Promise((r) => setTimeout(r, 0));
const open = () => streams.filter((s) => !s.aborted).length;

beforeEach(() => {
  streams = [];
  lists = 0;
  visibility = 'visible';
  vi.stubGlobal('fetch', fetchMock);
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
  resetSeatInvitesForTests();
  setSession(SESSION);
});
afterEach(() => {
  vi.unstubAllGlobals();
  setSession(null);
});

const setVisible = (v: DocumentVisibilityState) => {
  visibility = v;
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('following seat invites', () => {
  it('reads the list and opens one stream while signed in and visible', async () => {
    const stop = startSeatInvites();
    await flush();
    expect(lists).toBe(1);
    expect(open()).toBe(1);
    expect(serverNow() - Date.now()).toBeGreaterThan(-5_000);
    stop();
    expect(open()).toBe(0);
  });

  it('closes the stream when hidden, and reads again when visible', async () => {
    const stop = startSeatInvites();
    await flush();
    setVisible('hidden');
    expect(open()).toBe(0);
    setVisible('visible');
    await flush();
    expect(open()).toBe(1);
    expect(lists).toBe(2);
    stop();
  });

  it('closes on sign-out and opens nothing signed out', async () => {
    const stop = startSeatInvites();
    await flush();
    setSession(null);
    expect(open()).toBe(0);
    setVisible('hidden');
    setVisible('visible');
    await flush();
    expect(open()).toBe(0);
    stop();
  });
});
