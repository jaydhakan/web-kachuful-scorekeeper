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
import type { Seat as SeatK, SpGame, SpRules } from '@/games/spades/domain/types';
import { spTable } from '@/games/spades/strings/table';
import { useHaptics } from '@/hooks/useHaptics';
import { useHistorySync } from '@/hooks/useHistorySync';
import { useWakeLock } from '@/hooks/useWakeLock';
import { uuid } from '@/lib/ids';
import type { Seat } from '@/people';
import { archive } from '@/state/archive';
import { pushRecentNames } from '@/state/persistence';
import { ensurePlayer } from '@/state/registry';
import { getSession, signedInAs } from '@/sync/session';
import { useSpSync } from '@/games/spades/table/sync/useSpSync';
import { archiveSpGame, forgetEmptySp } from './archive';
import {
  loadSp,
  loadSpLastGroup,
  resolveSpCorrupt,
  saveSp,
  saveSpLastGroup,
  saveSpScreen,
  type SpLoaded,
} from './persistence';
import { initialSpState, spReducer } from './reducer';
import type {
  Dir,
  SpAction,
  SpHandEdit,
  SpModal,
  SpRoute,
  SpScreen,
  SpSheet,
  SpTableState,
} from './types';

/** Everything the scorekeeper's screens can do; each is ignored when the game's rules don't allow it. */
export interface SpActions {
  go(screen: SpScreen, dir?: Dir): void;
  openSheet(sheet: SpSheet | null): void;
  openPage(route: SpRoute): void;
  closePage(): void;
  ask(modal: SpModal | null): void;
  say(msg: string): void;
  dismissToast(): void;
  setFresh(v: boolean): void;
  // Setup
  startSetup(): void;
  setupStep(step: 1 | 2): void;
  setupSeat(k: number, seat: Seat | null): void;
  setupSeatPatch(k: number, patch: Partial<Seat>): void;
  setupSwap(a: number, b: number): void;
  setupLastGroup(): void;
  setupDealer(k: number): void;
  randomDealer(): void;
  setupRules(rules: SpRules): void;
  beginGame(): void;
  // A hand
  bid(bid: number, blind: boolean): void;
  unbid(): void;
  toTricks(): void;
  toBids(): void;
  setTeamA(n: number): void;
  setNil(seat: SeatK, n: number): void;
  saveHand(): void;
  nextHand(): void;
  editHand(i: number, edit: SpHandEdit): void;
  // Ending and after
  endGame(): void;
  drawGame(): void;
  cancelGame(): void;
  rematch(swap: boolean): void;
  undo(): void;
  openGame(game: SpGame): void;
  repairSave(choice: 'reset' | 'keep'): void;
  vib(): void;
}

interface SpContextValue {
  state: SpTableState;
  actions: SpActions;
}

const SpCtx = createContext<SpContextValue | null>(null);

export const useSp = (): SpContextValue => {
  const v = useContext(SpCtx);
  if (!v) throw new Error('useSp must be used inside <SpTableProvider>');
  return v;
};

export function SpTableProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial?: SpLoaded;
}) {
  const [state, dispatch] = useReducer(spReducer, undefined, () => {
    const l = initial ?? loadSp();
    return initialSpState(l.game, l.screen, l.undo, loadSpLastGroup(), l.corrupt);
  });
  const vib = useHaptics();
  const ref = useRef(state);
  ref.current = state;

  useWakeLock(state.game?.status === 'active' && state.screen === 'game');

  // The game and its undo ring after every change, unless the save is waiting for a repair choice.
  const warned = useRef(false);
  useEffect(() => {
    if (state.corrupt) return;
    const res = saveSp(state.game, state.undo);
    if (res === 'ok') warned.current = false;
    else if (!warned.current) {
      warned.current = true;
      const t = spTable.toasts;
      dispatch({ type: 'say', msg: res === 'quota' ? t.storageFull : t.storageOff });
    }
  }, [state.game, state.undo, state.corrupt]);

  useEffect(() => {
    if (!state.corrupt) saveSpScreen(state.screen === 'game' ? 'game' : 'setup');
  }, [state.screen, state.corrupt]);

  // Every game with a hand scored is kept in the archive, so ending or replacing it never loses it.
  useEffect(() => {
    const g = state.game;
    if (state.corrupt || !g) return;
    // Undone back to no hand scored, it exists nowhere but the table; an id the server deleted can't be reused.
    if (!g.hands.some((h) => h.phase === 'done')) {
      if (forgetEmptySp(g.syncId)) dispatch({ type: 'renewSyncId', syncId: uuid() });
      return;
    }
    // A game scored signed in syncs to that account; one begun signed out stays on this device.
    const acct = signedInAs()?.user.id;
    const prev = archive.get('spGames', g.syncId);
    archiveSpGame(g, acct && (!prev || prev.account) ? { account: acct } : {});
  }, [state.game, state.corrupt]);

  useSpSync(ref, dispatch);

  // System Back closes an open sheet, then a page, then steps back through setup; in a hand it opens the menu.
  const setupDepth = state.screen === 'setup' && state.setup?.step === 2 ? 1 : 0;
  const handDepth = state.screen === 'game' && state.game ? 1 : 0;
  useHistorySync(setupDepth + handDepth + state.pages.length + (state.sheet ? 1 : 0), () => {
    const s = ref.current;
    if (s.sheet) dispatch({ type: 'sheet', sheet: null });
    else if (s.pages.length) dispatch({ type: 'closePage' });
    else if (s.screen === 'setup' && s.setup?.step === 2) dispatch({ type: 'setupStep', step: 1 });
    else if (s.screen === 'game' && s.game) dispatch({ type: 'sheet', sheet: { type: 'menu' } });
  });

  const toastId = state.toast?.id;
  useEffect(() => {
    if (toastId === undefined) return;
    const t = setTimeout(() => dispatch({ type: 'toastDone' }), 4000);
    return () => clearTimeout(t);
  }, [toastId]);

  const actions = useMemo<SpActions>(() => {
    // Screen changes mount a lot of UI; as transitions React renders them in slices and stays interruptible.
    const nav = (a: SpAction) => startTransition(() => dispatch(a));
    const tap = (a: SpAction) => {
      dispatch(a);
      vib();
    };
    const newIds = () => {
      const now = Date.now();
      return { id: 'sp' + now, syncId: uuid(), now };
    };
    return {
      go: (screen, dir) => nav({ type: 'go', screen, dir }),
      openSheet: (sheet) => nav({ type: 'sheet', sheet }),
      openPage: (route) => nav({ type: 'openPage', route }),
      closePage: () => nav({ type: 'closePage' }),
      ask: (modal) => dispatch({ type: 'modal', modal }),
      say: (msg) => dispatch({ type: 'say', msg }),
      dismissToast: () => dispatch({ type: 'toastDone' }),
      setFresh: (v) => dispatch({ type: 'setFresh', v }),
      startSetup: () => nav({ type: 'startSetup', lg: loadSpLastGroup() }),
      setupStep: (step) => nav({ type: 'setupStep', step }),
      setupSeat: (k, seat) => dispatch({ type: 'setupSeat', k, seat }),
      setupSeatPatch: (k, patch) => dispatch({ type: 'setupSeatPatch', k, patch }),
      setupSwap: (a, b) => dispatch({ type: 'setupSwap', a, b }),
      setupLastGroup: () => tap({ type: 'setupLastGroup' }),
      setupDealer: (k) => dispatch({ type: 'setupDealer', k }),
      randomDealer: () => dispatch({ type: 'setupDealer', k: Math.floor(Math.random() * 4) }),
      setupRules: (rules) => dispatch({ type: 'setupRules', rules }),
      beginGame: () => {
        const su = ref.current.setup;
        if (!su || su.seats.some((q) => !q || !q.name.trim())) return;
        const seats = su.seats as Seat[];
        const online = !!getSession();
        const playerIds = seats.map((q) => ensurePlayer(q, online).id);
        saveSpLastGroup({
          players: seats.map((q, i) => ({
            name: q.name,
            emoji: q.emoji,
            color: q.color,
            playerId: playerIds[i],
          })),
          direction: su.dir,
          rules: su.rules,
          at: Date.now(),
        });
        // The suggested names are shared by every game's seating.
        pushRecentNames(seats.map((q) => q.name));
        nav({ type: 'beginGame', ...newIds(), playerIds });
      },
      bid: (bid, blind) => tap({ type: 'bid', bid, blind }),
      unbid: () => dispatch({ type: 'unbid' }),
      toTricks: () => nav({ type: 'toTricks' }),
      toBids: () => nav({ type: 'toBids' }),
      setTeamA: (teamA) => dispatch({ type: 'entry', teamA }),
      setNil: (seat, nil) => dispatch({ type: 'entry', seat, nil }),
      saveHand: () => {
        vib();
        nav({ type: 'saveHand' });
      },
      nextHand: () => nav({ type: 'nextHand' }),
      editHand: (i, edit) => dispatch({ type: 'editHand', i, edit }),
      endGame: () => nav({ type: 'endGame' }),
      drawGame: () => nav({ type: 'drawGame' }),
      cancelGame: () => nav({ type: 'cancelGame', lg: loadSpLastGroup() }),
      rematch: (swap) => nav({ type: 'rematch', ...newIds(), swap }),
      undo: () => dispatch({ type: 'undo', lg: loadSpLastGroup() }),
      openGame: (game) => nav({ type: 'openGame', game }),
      repairSave: (choice) => {
        resolveSpCorrupt(choice);
        dispatch({ type: 'repaired' });
      },
      vib,
    };
  }, [vib]);

  const value = useMemo(() => ({ state, actions }), [state, actions]);
  return <SpCtx.Provider value={value}>{children}</SpCtx.Provider>;
}
