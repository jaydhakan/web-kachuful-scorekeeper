import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { demoGame, type KtGame } from '@/games/kaali-teeri/domain';
import { DEFAULT_PREFS, type KtState } from '@/games/kaali-teeri/state/types';
import { KtProvider, useKt } from '@/games/kaali-teeri/state/store';

/** The demo's four scored hands, finished: Riya and Meera tie on 630. */
export const finishedDemo = (): KtGame => {
  const g = demoGame();
  return { ...g, id: 'kt1', hands: g.hands.slice(0, 4), status: 'finished' };
};

/** The demo in play (hand 5 being played), as a real game rather than the demo. */
export const liveDemo = (): KtGame => ({ ...demoGame(), id: 'kt2' });

/** Renders `ui` in a provider holding `game`; `state()` reads the store as it is now. */
export function renderKt(ui: ReactElement, game: KtGame | null) {
  const box: { s: KtState | null } = { s: null };
  const Probe = () => {
    box.s = useKt().state;
    return null;
  };
  const r = render(
    <KtProvider
      initial={{
        game,
        screen: game ? 'game' : 'home',
        undo: [],
        prefs: DEFAULT_PREFS,
        corrupt: false,
      }}
    >
      {ui}
      <Probe />
    </KtProvider>,
  );
  return { ...r, state: () => box.s! };
}
