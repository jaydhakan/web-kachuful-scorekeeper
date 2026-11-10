import { lazy, Suspense, type MouseEvent, type ReactNode } from 'react';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { go } from '@/platform/route';
import { MQ } from '@/theme/breakpoints';
import { signedInAs, useSession } from '@/sync/session';
import IshaaraShell from './screens/IshaaraShell';
import { IshaaraProvider, useIshaara } from './state/store';
import { useOnline } from './state/useTable';
import { shell } from './strings/shell';

// Only tablets and desktops download the large-screen shell; the phone shell stays in the first load.
const IshaaraDeskShell = lazy(() => import('./screens/desk/IshaaraDeskShell'));

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

/** Sign-in lives in Kachuful's account pages; a plain click opens it without a reload. */
function toSignIn(e: MouseEvent<HTMLAnchorElement>) {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  go('kachuful', '?open=signin');
}

function Root() {
  const { nav, actions } = useIshaara();
  const big = useMediaQuery(MQ.big);
  const online = useOnline();
  // A game in progress handles a dropped connection itself (reconnecting), so only the hub is gated.
  if (!online && !nav.gameId && nav.screen !== 'history')
    return (
      <Gate title={shell.offline.title} body={shell.offline.body}>
        <PrimaryButton onClick={() => actions.go('history')}>{shell.offline.history}</PrimaryButton>
      </Gate>
    );
  return big ? (
    <Suspense fallback={<div className="app-root scr-bg h-full w-full" />}>
      <IshaaraDeskShell />
    </Suspense>
  ) : (
    <IshaaraShell />
  );
}

/** Ishaara's lazy root: signed in and online only, since the server runs the game. */
export default function Ishaara() {
  const session = signedInAs(useSession());
  if (!session)
    return (
      <Gate title={shell.signIn.title} body={shell.signIn.body}>
        <a
          href="/kachuful?open=signin"
          onClick={toSignIn}
          className="mat-fill press inline-flex min-h-12 items-center rounded-full px-6 text-16 font-bold text-ink-on-accent"
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
