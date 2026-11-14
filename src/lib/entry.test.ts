import { authSearch, readEntryLink, returnTo } from './entry';

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
  it('ignores anything else', () => {
    history.replaceState(null, '', '/kachuful?open=admin');
    expect(readEntryLink()).toBeNull();
  });
});
