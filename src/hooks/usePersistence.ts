import { useEffect, useRef, type Dispatch } from 'react';
import { KEYS, saveGame, storage } from '@/state/persistence';
import type { Action, AppState } from '@/state/types';

/** Writes the game, undo stack and current screen after every change, unless the save is awaiting a repair choice. */
export function usePersistence(state: AppState, dispatch: Dispatch<Action>): void {
  const warned = useRef(false);

  useEffect(() => {
    if (state.corrupt) return;
    const res = saveGame(state.game, state.undo);
    if (res === 'ok') warned.current = false;
    else if (!warned.current) {
      warned.current = true;
      dispatch({
        type: 'say',
        msg:
          res === 'quota'
            ? 'Storage is full — this game may not be saved'
            : 'Saving is unavailable in this browser',
      });
    }
  }, [state.game, state.undo, state.corrupt, dispatch]);

  useEffect(() => {
    if (!state.corrupt) storage.set(KEYS.screen, state.screen);
  }, [state.screen, state.corrupt]);
}
