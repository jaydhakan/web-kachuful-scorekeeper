import { authSearch, readEntryLink, returnSearch, returnTo } from './entry';

describe('readEntryLink', () => {
  it('opens a token link and removes it from the address', () => {
    history.replaceState(null, '', '/kachuful?live=tok&x=1');
    expect(readEntryLink()).toEqual({ screen: 'live', params: { token: 'tok' } });
    expect(location.search).toBe('?x=1');
  });
  it("opens the account or sign-in page for the landing page's chip", () => {
    history.replaceState(null, '', '/kachuful?open=account');
    expect(readEntryLink()).toEqual({ screen: 'account' });
    expect(location.search).toBe('');
    history.replaceState(null, '', '/kachuful?open=signin');
    expect(readEntryLink()).toEqual({ screen: 'signin' });
    history.replaceState(null, '', '/kachuful?open=credits');
    expect(readEntryLink()).toEqual({ screen: 'credits' });
  });
  it('carries where the account page should return to, and drops anything that is not a page', () => {
    history.replaceState(null, '', '/kachuful' + authSearch('signin', 'ishaara'));
    const r = readEntryLink()!;
    expect(r).toEqual({ screen: 'signin', params: { from: 'ishaara' } });
    expect(location.search).toBe('');
    expect(returnTo(r)).toBe('ishaara');
    history.replaceState(null, '', '/kachuful?open=account&from=evil.example');
    expect(readEntryLink()).toEqual({ screen: 'account' });
    expect(returnTo({ screen: 'signin', params: { from: 'landing' } })).toBe('landing');
    expect(returnTo({ screen: 'signin' })).toBeNull();
    expect(authSearch('account')).toBe('?open=account');
  });
  it('carries a join code or game back through sign-in, and nothing else', () => {
    expect(authSearch('signin', 'spades', '?join=KQ7M')).toBe(
      '?open=signin&from=spades&back=%3Fjoin%3DKQ7M',
    );
    history.replaceState(null, '', '/kachuful' + authSearch('signin', 'spades', '?join=KQ7M'));
    const r = readEntryLink()!;
    expect(r).toEqual({ screen: 'signin', params: { from: 'spades', back: '?join=KQ7M' } });
    expect(location.search).toBe('');
    expect(returnTo(r)).toBe('spades');
    expect(returnSearch(r)).toBe('?join=KQ7M');
    expect(authSearch('signin', 'ishaara', '?game=g-1&evil=1')).toBe(
      '?open=signin&from=ishaara&back=%3Fgame%3Dg-1',
    );
    // A crafted link keeps only the known keys with plain values.
    history.replaceState(
      null,
      '',
      '/kachuful?open=signin&from=spades&back=' + encodeURIComponent('?join=<x>&next=//evil'),
    );
    expect(readEntryLink()).toEqual({ screen: 'signin', params: { from: 'spades' } });
    expect(returnSearch({ screen: 'signin', params: { from: 'spades' } })).toBe('');
    // The landing page has nothing to reopen.
    expect(authSearch('signin', 'landing', '?join=KQ7M')).toBe('?open=signin&from=landing');
  });
  it('ignores anything else', () => {
    history.replaceState(null, '', '/kachuful?open=admin');
    expect(readEntryLink()).toBeNull();
  });
});
