import { createContext, useContext, useMemo, useReducer, useRef, type ReactNode } from 'react';
import type { IshaaraPublic, IshaaraRules, Seated, Team } from '@/games/ishaara/domain';
import { ishEp } from '@/games/ishaara/sync/endpoints';
import type { IshaaraGameOut } from '@/games/ishaara/sync/types';
import { uuid } from '@/lib/ids';
import { saveIshLastSetup } from '@/state/persistence';
import { ApiError } from '@/sync/api';
import { rememberWords } from './words';

export type IshaaraScreen =
  'home' | 'setup' | 'waiting' | 'board' | 'win' | 'clue-list' | 'key' | 'history';

/** `table` is the host's device (it never sees the key); `clue` a clue-giver's phone. */
export type IshaaraRole = 'table' | 'clue';

export interface IshaaraNav {
  screen: IshaaraScreen;
  gameId: string | null;
  role: IshaaraRole;
}

export type NavAction =
  | { type: 'go'; screen: IshaaraScreen }
  | { type: 'open'; id: string; role: IshaaraRole; screen?: IshaaraScreen }
  | { type: 'track'; status: IshaaraPublic['status'] }
  | { type: 'leave' };

export const initialNav: IshaaraNav = { screen: 'home', gameId: null, role: 'table' };

/** Where the table belongs for a game's status; a clue phone stays on its key screen throughout. */
export const tableScreen = (status: IshaaraPublic['status']): IshaaraScreen =>
  status === 'waiting' ? 'waiting' : status === 'active' ? 'board' : 'win';

export function navReducer(s: IshaaraNav, a: NavAction): IshaaraNav {
  switch (a.type) {
    case 'go':
      return s.screen === a.screen ? s : { ...s, screen: a.screen };
    case 'open':
      return {
        gameId: a.id,
        role: a.role,
        screen: a.screen ?? (a.role === 'clue' ? 'key' : 'waiting'),
      };
    case 'track': {
      if (s.role !== 'table' || !s.gameId) return s;
      const screen = tableScreen(a.status);
      return screen === s.screen ? s : { ...s, screen };
    }
    case 'leave':
      return { gameId: null, role: s.role, screen: s.role === 'clue' ? 'clue-list' : 'home' };
  }
}

export type Done = { ok: true; out: IshaaraGameOut } | { ok: false; error: ApiError };

export interface NewIshaara {
  players: Seated[];
  words: string[];
  rules: IshaaraRules;
  /** Kept with the last setup so the next game offers them again. */
  customWords?: string[];
}

export interface IshaaraActions {
  go(screen: IshaaraScreen): void;
  /** Creates the game on the server (a retry after a lost answer reuses the id), then waits for the clue-givers. */
  startGame(input: NewIshaara): Promise<Done>;
  /** Opens a game: on the table by its status, on a clue phone at the key. */
  openGame(id: string, role?: IshaaraRole, screen?: IshaaraScreen): void;
  /** Moves the table to the screen for the game's status (waiting, board or win); screens call it on each state. */
  track(status: IshaaraPublic['status']): void;
  /** Same seats and rules, fresh words, from the finished game on screen. */
  rematch(words: string[], clueGivers?: Partial<Record<Team, string>>): Promise<Done>;
  leave(): void;
}

const fail = (e: unknown): Done => ({
  ok: false,
  error: e instanceof ApiError ? e : new ApiError(0, 'offline'),
});

const Ctx = createContext<{ nav: IshaaraNav; actions: IshaaraActions } | null>(null);

export function IshaaraProvider({
  children,
  initial = initialNav,
}: {
  children: ReactNode;
  initial?: IshaaraNav;
}) {
  const [nav, dispatch] = useReducer(navReducer, initial);
  const navRef = useRef(nav);
  navRef.current = nav;
  // The id of a create or rematch whose answer never came, so trying again can't make a second game.
  const pending = useRef<{ sig: string; id: string } | null>(null);
  const idFor = (sig: string) => {
    if (pending.current?.sig !== sig) pending.current = { sig, id: uuid() };
    return pending.current.id;
  };
  const settle = (e: unknown) => {
    if (!(e instanceof ApiError && e.offline)) pending.current = null;
    return fail(e);
  };

  const actions = useMemo<IshaaraActions>(
    () => ({
      go: (screen) => dispatch({ type: 'go', screen }),
      async startGame(input) {
        const body = { players: input.players, words: input.words, rules: input.rules };
        const id = idFor('new:' + JSON.stringify(body));
        try {
          const out = await ishEp.create({ id, ...body });
          pending.current = null;
          rememberWords(input.words);
          saveIshLastSetup({
            players: input.players,
            packs: input.rules.packs,
            customWords: input.customWords ?? [],
            rules: input.rules,
            at: Date.now(),
          });
          dispatch({ type: 'open', id: out.game.id, role: 'table', screen: 'waiting' });
          return { ok: true, out };
        } catch (e) {
          return settle(e);
        }
      },
      openGame: (id, role = 'table', screen) => dispatch({ type: 'open', id, role, screen }),
      track: (status) => dispatch({ type: 'track', status }),
      async rematch(words, clueGivers) {
        const from = navRef.current.gameId;
        if (!from) return fail(new ApiError(404, 'not_found'));
        const id = idFor('rematch:' + from);
        try {
          const out = await ishEp.rematch(from, { id, words, ...(clueGivers && { clueGivers }) });
          pending.current = null;
          rememberWords(out.game.words);
          dispatch({ type: 'open', id: out.game.id, role: 'table', screen: 'waiting' });
          return { ok: true, out };
        } catch (e) {
          return settle(e);
        }
      },
      leave: () => dispatch({ type: 'leave' }),
    }),
    [],
  );

  const value = useMemo(() => ({ nav, actions }), [nav, actions]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useIshaara() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useIshaara needs <IshaaraProvider>');
  return v;
}
