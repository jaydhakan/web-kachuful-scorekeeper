import { lazy, Suspense, useEffect } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { whenIdle } from '@/lib/idle';
import { MQ } from '@/theme/breakpoints';
import { KtProvider } from './state/store';
import KtShell from './screens/KtShell';

// Only tablets and desktops download the large-screen shell; the phone shell stays in the first load.
const KtDeskShell = lazy(() => import('./screens/desk/KtDeskShell'));

/**
 * The device's theme, settled once the page is idle (the boot script already painted the cached one). The shared
 * ThemeSync reads Kachuful's store for the session, so the signed-in refresh waits until it takes `signedIn` itself.
 */
function KtTheme() {
  useEffect(() => whenIdle(() => void import('@/state/theme').then((s) => s.initTheme())), []);
  return null;
}

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

/** Kaali Teeri's lazy root: its store and shell mount only on /kaali-teeri (the platform registry loads it). */
export default function KaaliTeeri() {
  return (
    <KtProvider>
      <KtTheme />
      <KtAppShell />
    </KtProvider>
  );
}
