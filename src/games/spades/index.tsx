import './spades.css';
import { useCallback, useMemo } from 'react';
import { Loader } from '@/components/ui/Loader';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { platform } from '@/strings/platform';
import type { SeatInvite } from '@/sync/seatInvites';
import { useSeatInviteJoin } from '@/sync/seatInviteSignals';
import { signedInAs, useSession } from '@/sync/session';
import { spGo, useSpadesSearch, viewOf } from './nav';
import Home from './screens/Home';
import { LazyPart } from './screens/LazyPart';
import { home as h } from './strings/home';

// Each mode is its own chunk: Home never downloads the scorekeeper or the online table until one is opened.
const loadTable = () => import('./table/TableApp');
const loadOnline = () => import('./online/OnlineApp');

const loading = (
  <div className="app-root scr-bg relative h-full w-full">
    <Loader />
  </div>
);

const failed = (retry: () => void) => (
  <main className="app-root scr-bg grid h-full w-full place-content-center justify-items-center gap-4 p-6 text-center">
    <h1 className="text-24 font-bold">{platform.loadFailed.title}</h1>
    <p className="max-w-[34ch] text-16 text-[var(--tx2)]">{platform.loadFailed.body}</p>
    <PrimaryButton className="min-w-[16rem] px-6" onClick={retry}>
      {platform.loadFailed.retry}
    </PrimaryButton>
    <button type="button" className="min-h-11 text-16 underline" onClick={() => spGo('')}>
      {h.soon.back}
    </button>
  </main>
);

/**
 * Spades' lazy root: `/spades` is Home, `?keep` table mode, and `?table=`, `?join=`, `?live=` (and a seat invite's
 * `?game=`) online play. Signed out, online addresses other than a live view land on Home, which asks for sign-in.
 */
export default function Spades() {
  const search = useSpadesSearch();
  const view = useMemo(() => viewOf(search), [search]);
  const signedIn = !!signedInAs(useSession());
  // An invite's Join, from the banner or a card, opens its table here without a reload.
  const joinSeat = useCallback(
    (inv: SeatInvite) => spGo(`?table=${encodeURIComponent(inv.gameId)}`),
    [],
  );
  useSeatInviteJoin('spades', joinSeat);

  if (view.kind === 'table')
    return (
      <LazyPart load={loadTable} props={{ page: view.page }} loading={loading} failed={failed} />
    );
  if (view.kind === 'online' && (signedIn || view.entry.kind === 'live'))
    return (
      <LazyPart load={loadOnline} props={{ entry: view.entry }} loading={loading} failed={failed} />
    );
  const joinCode = view.kind === 'online' && view.entry.kind === 'join' ? view.entry.code : null;
  return <Home joinCode={joinCode} />;
}
