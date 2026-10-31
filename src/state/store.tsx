import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import { curRound, resultsState, type Outcome, type Phase } from '@/domain';
import { useHaptics } from '@/hooks/useHaptics';
import { usePersistence } from '@/hooks/usePersistence';
import { useWakeLock } from '@/hooks/useWakeLock';
import {
  KEYS,
  loadInitial,
  pushRecentNames,
  resolveCorrupt,
  storage,
  type LastGroup,
  type Loaded,
} from './persistence';
import { initialState, reducer } from './reducer';
import type { Action, AppState, Dir, ModalKind, Screen, SetupState, SheetState } from './types';
import type { Trump } from '@/domain';

export interface Actions {
  go(screen: Screen, dir?: Dir): void;
  startSetup(): void;
  setupPatch(patch: Partial<SetupState>): void;
  setupSeat(k: number, seat: { name: string; emoji: string; color: string } | null): void;
  setupSeatPatch(k: number, patch: Partial<{ name: string; emoji: string; color: string }>): void;
  setupSwap(a: number, b: number): void;
  beginGame(): void;
  resume(): void;
  bid(v: number): void;
  pickSeat(k: number): void;
  phase(phase: Phase, dir?: Dir): void;
  setResult(id: string, v: Outcome): void;
  setTricks(id: string, d: number): void;
  toggleExact(): void;
  confirmRound(): void;
  nextRound(): void;
  finishGame(): void;
  rematch(): void;
  editRound(i: number, bids: Record<string, number>, results: Record<string, Outcome>): void;
  undo(): void;
  openSheet(sheet: SheetState | null): void;
  ask(modal: ModalKind | null): void;
  seqDone(): void;
  setSumAnim(v: boolean): void;
  streakDone(): void;
  setFresh(v: boolean): void;
  say(msg: string): void;
  vib(): void;
  repairSave(choice: 'reset' | 'keep'): void;
}

interface AppContextValue {
  state: AppState;
  actions: Actions;
  trump: Trump;
}

const AppCtx = createContext<AppContextValue | null>(null);

export const useApp = (): AppContextValue => {
  const v = useContext(AppCtx);
  if (!v) throw new Error('useApp must be used inside <AppProvider>');
  return v;
};

const trumpOf = (s: AppState): Trump =>
  s.game.rounds.length
    ? s.seq
      ? s.seq.round.trump
      : s.screen === 'home' || s.screen === 'setup'
        ? 'spades'
        : curRound(s.game).trump
    : 'spades';

export function AppProvider({ children, initial }: { children: ReactNode; initial?: Loaded }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const l = initial ?? loadInitial();
    return initialState(l.game, l.screen, l.undo, l.corrupt);
  });
  const vib = useHaptics();
  const ref = useRef(state);
  ref.current = state;

  usePersistence(state, dispatch);
  useWakeLock(state.game.status === 'active');

  const toastId = state.toast?.id;
  useEffect(() => {
    if (toastId === undefined) return;
    const t = setTimeout(() => dispatch({ type: 'toastDone' }), 4000);
    return () => clearTimeout(t);
  }, [toastId]);

  const bannerId = state.banner?.id;
  useEffect(() => {
    if (bannerId === undefined) return;
    const t = setTimeout(() => dispatch({ type: 'bannerDone' }), 1600);
    return () => clearTimeout(t);
  }, [bannerId]);

  const advance = state.advance;
  useEffect(() => {
    if (!advance) return;
    const t = setTimeout(() => dispatch({ type: 'advanceBid', idx: advance.idx }), 250);
    return () => clearTimeout(t);
  }, [advance]);

  const actions = useMemo<Actions>(() => {
    // Screen changes mount a lot of UI; as transitions React renders them in small slices and stays interruptible.
    const nav = (a: Action) => startTransition(() => dispatch(a));
    return {
      go: (screen, dir) => nav({ type: 'go', screen, dir }),
      startSetup: () =>
        nav({ type: 'startSetup', lg: storage.get<LastGroup | null>(KEYS.lastGroup, null) }),
      setupPatch: (patch) => dispatch({ type: 'setupPatch', patch }),
      setupSeat: (k, seat) => dispatch({ type: 'setupSeat', k, seat }),
      setupSeatPatch: (k, patch) => dispatch({ type: 'setupSeatPatch', k, patch }),
      setupSwap: (a, b) => dispatch({ type: 'setupSwap', a, b }),
      beginGame: () => {
        const su = ref.current.setup;
        if (!su || !su.n) return;
        const names = su.seats.map((p) => p?.name ?? '');
        storage.set(KEYS.lastGroup, {
          names,
          emojis: su.seats.map((p) => p?.emoji ?? ''),
          colors: su.seats.map((p) => p?.color ?? ''),
          direction: su.dir,
          decks: su.decks,
        } satisfies LastGroup);
        pushRecentNames(names);
        const now = Date.now();
        nav({ type: 'beginGame', id: 'g' + now, now });
      },
      resume: () => nav({ type: 'resume' }),
      bid: (v) => {
        dispatch({ type: 'bid', v });
        vib();
      },
      pickSeat: (k) => dispatch({ type: 'pickSeat', k }),
      phase: (phase, dir) => nav({ type: 'phase', phase, dir }),
      setResult: (id, v) => {
        dispatch({ type: 'setResult', id, v });
        vib();
      },
      setTricks: (id, d) => {
        dispatch({ type: 'setTricks', id, d });
        vib();
      },
      toggleExact: () => dispatch({ type: 'toggleExact' }),
      confirmRound: () => {
        const g = ref.current.game;
        if (!resultsState(g, curRound(g)).ok) return;
        vib();
        nav({ type: 'confirmRound' });
      },
      nextRound: () => nav({ type: 'nextRound' }),
      finishGame: () => dispatch({ type: 'finishGame' }),
      rematch: () => {
        const now = Date.now();
        nav({ type: 'rematch', id: 'g' + now, now });
      },
      editRound: (i, bids, results) => dispatch({ type: 'editRound', i, bids, results }),
      undo: () => dispatch({ type: 'undo' }),
      openSheet: (sheet) => nav({ type: 'sheet', sheet }),
      ask: (modal) => dispatch({ type: 'modal', modal }),
      seqDone: () => dispatch({ type: 'seqDone' }),
      setSumAnim: (v) => dispatch({ type: 'setSumAnim', v }),
      streakDone: () => dispatch({ type: 'streakDone' }),
      setFresh: (v) => dispatch({ type: 'setFresh', v }),
      say: (msg) => dispatch({ type: 'say', msg }),
      vib,
      repairSave: (choice) => dispatch({ type: 'replaceGame', game: resolveCorrupt(choice) }),
    };
  }, [vib]);

  const value = useMemo(() => ({ state, actions, trump: trumpOf(state) }), [state, actions]);
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
