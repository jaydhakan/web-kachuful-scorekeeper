import { Suspense } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { MQ } from '@/theme/breakpoints';
// Each UI is its own chunk, so a device only downloads its own; index.html preloads the one that matches
// (vite.config.ts), and prepare() fetches it before the platform shows the game.
import { DeskShell, PhoneShell } from '@/games/kachuful/chunks';

/** Phones (and phones on their side) get the phone UI; tablets and desktops get the purpose-built large-screen one. */
export function AppShell() {
  const big = useMediaQuery(MQ.big);
  return (
    <Suspense fallback={<div className="app-root scr-bg h-full w-full" />}>
      {big ? <DeskShell /> : <PhoneShell />}
    </Suspense>
  );
}
