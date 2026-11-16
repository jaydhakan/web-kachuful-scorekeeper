import { act, renderHook } from '@testing-library/react';
import { CODE_ALPHABET, cleanCode, codeFromPaste } from './code';
import { spGo, useSpadesSearch, viewOf } from './nav';
import { parseOnlineEntry } from './online/entry';

describe('the routing contract', () => {
  it('is Home for a bare address and anything it does not know', () => {
    expect(viewOf('')).toEqual({ kind: 'home' });
    expect(viewOf('?x=1')).toEqual({ kind: 'home' });
    // A malformed code or id never reaches the online app.
    expect(viewOf('?join=KQ')).toEqual({ kind: 'home' });
    expect(viewOf('?table=' + encodeURIComponent('<script>'))).toEqual({ kind: 'home' });
  });
  it('opens table mode on ?keep, with an optional page', () => {
    expect(viewOf('?keep')).toEqual({ kind: 'table', page: null });
    expect(viewOf('?keep&page=history')).toEqual({ kind: 'table', page: 'history' });
    expect(viewOf('?keep&page=leaderboard')).toEqual({ kind: 'table', page: 'leaderboard' });
    expect(viewOf('?keep&page=admin')).toEqual({ kind: 'table', page: null });
  });
  it('opens online play for a new table, a table, a seat invite, a code or a live link', () => {
    expect(viewOf('?table=new')).toEqual({ kind: 'online', entry: { kind: 'create' } });
    expect(viewOf('?table=t-1')).toEqual({ kind: 'online', entry: { kind: 'table', id: 't-1' } });
    expect(viewOf('?game=t-2')).toEqual({ kind: 'online', entry: { kind: 'table', id: 't-2' } });
    expect(viewOf('?join=kq7m')).toEqual({ kind: 'online', entry: { kind: 'join', code: 'KQ7M' } });
    expect(viewOf('?live=tok_1')).toEqual({
      kind: 'online',
      entry: { kind: 'live', token: 'tok_1' },
    });
    expect(viewOf('?recap=tok_2')).toEqual({
      kind: 'online',
      entry: { kind: 'recap', token: 'tok_2' },
    });
  });
  it('parseOnlineEntry is null where Home should show', () => {
    expect(parseOnlineEntry('')).toBeNull();
    expect(parseOnlineEntry('?keep')).toBeNull();
    expect(parseOnlineEntry('?join=KQ1M')).toBeNull();
  });
});

describe('join codes', () => {
  it('upper-cases, keeps only the alphabet and stops at four', () => {
    expect(cleanCode('kq7m')).toBe('KQ7M');
    expect(cleanCode(' k-q 7 m x ')).toBe('KQ7M');
    expect(cleanCode('IO01')).toBe('');
    expect(CODE_ALPHABET).not.toMatch(/[IO01]/);
  });
  it('reads a pasted share link or a plain code', () => {
    expect(codeFromPaste('https://play.vectanix.com/spades?join=kq7m')).toBe('KQ7M');
    expect(codeFromPaste('Join us: KQ7M')).toBe('KQ7M');
    expect(codeFromPaste('k q 7 m')).toBe('KQ7M');
    expect(codeFromPaste('kq7m')).toBe('KQ7M');
  });
});

describe('moving within /spades', () => {
  beforeEach(() => history.replaceState(null, '', '/spades'));

  it('pushes the search, and system Back returns', async () => {
    const { result } = renderHook(() => useSpadesSearch());
    expect(result.current).toBe('');
    act(() => spGo('?keep'));
    expect(location.pathname + location.search).toBe('/spades?keep');
    expect(result.current).toBe('?keep');
    await act(async () => {
      history.back();
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(result.current).toBe('');
  });
  it('replaces the entry when asked', () => {
    spGo('?join=KQ7M');
    const n = history.length;
    spGo('?table=t-1', { replace: true });
    expect(location.search).toBe('?table=t-1');
    expect(history.length).toBe(n);
  });
});
