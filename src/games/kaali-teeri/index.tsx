import { lazy, Suspense } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { MQ } from '@/theme/breakpoints';
import { KtProvider } from './state/store';
import KtShell from './screens/KtShell';

// Only tablets and desktops download the large-screen shell; the phone shell stays in the first load.
const KtDeskShell = lazy(() => import('./screens/desk/KtDeskShell'));

/** Phones (and phones on their side) get the phone UI; tablets and desktops the large-screen one. */
function KtAppShell() {
  const big = useMediaQuery(MQ.big);
  return big ? (
    <Suspense fallback={<div className="app-root scr-bg h-full w-full" />}>
      <KtDeskShell />
    </Suspense>
  ) : (
    <KtShell />
  );
}

/** Kaali Teeri's lazy root: its store and shell mount only on /kaali-teeri (the platform catalog loads it). */
export default function KaaliTeeri() {
  return (
    <KtProvider>
      <KtAppShell />
    </KtProvider>
  );
}
