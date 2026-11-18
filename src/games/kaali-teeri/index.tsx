import { Suspense, useEffect, useState } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { MQ } from '@/theme/breakpoints';
import { Loader } from '@/components/ui/Loader';
import { KtProvider } from './state/store';
import KtShell from './screens/KtShell';
import { readKtViewerLink, settleKtViewerLink } from './screens/viewer/entry';

// Only tablets and desktops download the large-screen shell; the phone shell stays in the first load.
// Only tablets and desktops fetch the large-screen UI, and only a shared link the viewer (chunks.ts).
import { KtDeskShell, Viewer } from './chunks';

export { prepare } from './chunks';

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
  useEffect(settleKtViewerLink, []);
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
