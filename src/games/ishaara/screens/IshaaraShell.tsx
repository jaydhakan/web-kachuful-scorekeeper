import { shell } from '@/games/ishaara/strings/shell';
import { useIshaara } from '@/games/ishaara/state/store';

/** Shows which screen the store is on; the game's screens replace it. */
export default function IshaaraShell() {
  const { nav } = useIshaara();
  return (
    <main className="app-root scr-bg grid h-full w-full place-content-center p-6 text-center">
      <h1 className="text-24 font-bold">{shell.screens[nav.screen]}</h1>
    </main>
  );
}
