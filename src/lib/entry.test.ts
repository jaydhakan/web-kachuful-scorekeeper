import { readEntryLink } from './entry';

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
  });
  it('ignores anything else', () => {
    history.replaceState(null, '', '/kachuful?open=admin');
    expect(readEntryLink()).toBeNull();
  });
});
