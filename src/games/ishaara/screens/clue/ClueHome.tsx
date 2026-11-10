import { useIshaara } from '@/games/ishaara/state/store';
import { KeyView } from './KeyView';
import { YourGames } from './YourGames';

/**
 * The clue-giver's phone: Your games, then one game's gate and key. Plain and dark in every theme (the `--key-*`
 * tokens), with its own focus ring colour so the ring shows on that dark ground.
 */
export default function ClueHome() {
  const { nav } = useIshaara();
  return (
    <main className="h-full w-full overflow-y-auto bg-key-bg font-sans text-key-text [--focus:var(--key-text)]">
      {nav.screen === 'key' && nav.gameId ? (
        // A new game id remounts, so a key or a half-typed clue never carries over.
        <KeyView key={nav.gameId} id={nav.gameId} />
      ) : (
        <YourGames />
      )}
    </main>
  );
}
