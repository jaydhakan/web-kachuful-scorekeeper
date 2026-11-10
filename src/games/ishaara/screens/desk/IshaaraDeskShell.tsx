import { lazy } from 'react';
import IshaaraShell from '../IshaaraShell';

// Its own chunk, like the phone board: only a game on the table needs it.
const DeskBoard = lazy(() => import('./DeskBoard'));

/**
 * Ishaara on tablets and desktops: the hub, setup, waiting, the result, the pages and the clue phone are the phone's
 * screens laid out wide; the board is laid out for the big screen and the keyboard.
 */
export default function IshaaraDeskShell() {
  return <IshaaraShell board={DeskBoard} desk />;
}
