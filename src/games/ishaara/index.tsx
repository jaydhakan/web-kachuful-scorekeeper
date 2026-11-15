import './ishaara.css';
import { authSearch } from '@/lib/entry';
import { lazy, useCallback, type MouseEvent, type ReactNode } from 'react';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { go } from '@/platform/route';
import { MQ } from '@/theme/breakpoints';
import { type SeatInvite } from '@/sync/seatInvites';
import { useSeatInviteJoin } from '@/sync/seatInviteSignals';
import { signedInAs, useSession } from '@/sync/session';
import IshaaraShell from './screens/IshaaraShell';
import { useGameLink } from './state/gameLink';
import { IshaaraProvider, useIshaara } from './state/store';
import { useOnline } from './state/useTable';
import { shell } from './strings/shell';

// Only tablets and desktops download the large-screen board; the phone shell stays in the first load.
const DeskBoard = lazy(() => import('./screens/desk/DeskBoard'));

function Gate({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <main className="app-root scr-bg grid h-full w-full place-content-center justify-items-center gap-4 p-6 text-center">
      <h1 className="text-24 font-bold">{title}</h1>
      <p className="max-w-[36ch] text-16 text-[var(--tx2)]">{body}</p>
      {children}
      <button type="button" className="min-h-11 text-16 underline" onClick={() => go(null)}>
        {shell.allGames}
      </button>
    </main>
  );
}

/**
 * Sign-in lives in Kachuful's account pages; a plain click opens it without a reload. A real link, painted with the
 * primary button's materials so each theme's label colour applies (PL-F02).
 */
function toSignIn(e: MouseEvent<HTMLAnchorElement>) {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  go('kachuful', authSearch('signin', 'ishaara'));
}

function Root() {
  const { nav, actions } = useIshaara();
  useGameLink(actions.openGame);
  // An invite's Join, from the banner or a card, opens that game's key gate here without a reload.
  const joinSeat = useCallback(
    (inv: SeatInvite) => actions.openGame(inv.gameId, 'clue'),
    [actions],
  );
  useSeatInviteJoin('ishaara', joinSeat);
  const big = useMediaQuery(MQ.big);
  const online = useOnline();
  // A game in progress handles a dropped connection itself (reconnecting), so only the hub is gated.
  if (!online && !nav.gameId && nav.screen !== 'history')
    return (
      <Gate title={shell.offline.title} body={shell.offline.body}>
        <PrimaryButton onClick={() => actions.go('history')}>{shell.offline.history}</PrimaryButton>
      </Gate>
    );
  // One shell at every size, so crossing MQ.big swaps only the board and keeps setup, the key and any page open.
  return big ? <IshaaraShell board={DeskBoard} desk /> : <IshaaraShell />;
}

/** Ishaara's lazy root: signed in and online only, since the server runs the game. PlatformRoot gates updates. */
export default function Ishaara() {
  return <IshaaraRoot />;
}

function IshaaraRoot() {
  const session = signedInAs(useSession());
  if (!session)
    return (
      <Gate title={shell.signIn.title} body={shell.signIn.body}>
        <a
          href={`/kachuful${authSearch('signin', 'ishaara')}`}
          onClick={toSignIn}
          className="mat-cta mat-cta-on mat-tone-accent mat-fill press relative isolate inline-flex h-[60px] min-w-[16rem] items-center justify-center gap-2 rounded-[20px] px-6 text-18 font-bold tracking-[-0.01em] text-ink-on-accent"
        >
          {shell.signIn.action}
        </a>
      </Gate>
    );
  return (
    <IshaaraProvider>
      <Root />
    </IshaaraProvider>
  );
}
