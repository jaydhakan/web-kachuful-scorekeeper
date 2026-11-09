import { useEffect } from 'react';
import { whenIdle } from '@/lib/idle';
import { KtProvider } from './state/store';
import KtShell from './screens/KtShell';

/**
 * The device's theme, settled once the page is idle (the boot script already painted the cached one). The shared
 * ThemeSync reads Kachuful's store for the session, so the signed-in refresh waits until it takes `signedIn` itself.
 */
function KtTheme() {
  useEffect(() => whenIdle(() => void import('@/state/theme').then((s) => s.initTheme())), []);
  return null;
}

/** Kaali Teeri's lazy root: its store and shell mount only on /kaali-teeri (the platform registry loads it). */
export default function KaaliTeeri() {
  return (
    <KtProvider>
      <KtTheme />
      <KtShell />
    </KtProvider>
  );
}
