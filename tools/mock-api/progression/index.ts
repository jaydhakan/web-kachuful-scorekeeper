import type { GameId } from '../../../src/progression/types';
import type { GameMock } from './kit';
import { ishaaraProgression } from './ishaara';
import { kaaliTeeriProgression } from './kaali-teeri';
import { spadesProgression } from './spades';

export type { GameMock, MockCtx } from './kit';

/** Every game but Kachuful, whose progression stays in server.ts. Each game fills its own file. */
export const GAME_MOCKS: Record<Exclude<GameId, 'kachuful'>, GameMock> = {
  spades: spadesProgression,
  'kaali-teeri': kaaliTeeriProgression,
  ishaara: ishaaraProgression,
};
