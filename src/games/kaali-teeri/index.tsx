import { lazy, Suspense, useState } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { MQ } from '@/theme/breakpoints';
import { Loader } from '@/components/ui/Loader';
import { KtProvider } from './state/store';
import KtShell from './screens/KtShell';
import { readKtViewerLink } from './screens/viewer/entry';

// Only tablets and desktops download the large-screen shell; the phone shell stays in the first load.
const KtDeskShell = lazy(() => import('./screens/desk/KtDeskShell'));
// Only a shared link opens it, so it stays out of the app's first load.
const Viewer = lazy(() => import('./screens/viewer/Viewer'));

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
  // `?live=` / `?recap=` open the public viewer first; its button goes on to the app.
  const [link, setLink] = useState(readKtViewerLink);
  return (
    <KtProvider>
      {link ? (
        <Suspense
          fallback={
            <div className="app-root scr-bg relative h-full w-full">
              <Loader />
            </div>
          }
        >
          <Viewer link={link} onClose={() => setLink(null)} />
        </Suspense>
      ) : (
        <KtAppShell />
      )}
    </KtProvider>
  );
}
