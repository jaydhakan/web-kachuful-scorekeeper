import { useIsPresent } from 'framer-motion';
import { useApp } from '@/state/store';
import { useShortcuts, type Shortcuts } from '@/hooks/useShortcuts';

/**
 * A screen's shortcuts, off while something covers the screen (the Scoreboard over the game, the deal animation, the
 * repair prompt) and while the screen is animating out. Dialogs are already skipped by useShortcuts.
 */
export function useDeskKeys(map: Shortcuts) {
  const { state } = useApp();
  const covered =
    state.sheet?.type === 'board' || state.sheet?.type === 'edit' || !!state.seq || state.corrupt;
  const present = useIsPresent();
  useShortcuts(map, !covered && present);
}
