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
import {
  curRound,
  doneRounds,
  resultsState,
  type Outcome,
  type Phase,
} from '@/games/kachuful/domain';
import { feedback, HAPTIC, playCue } from '@/fx/feedback';
import { vibrate } from '@/hooks/useHaptics';
import { usePersistence } from '@/games/kachuful/hooks/usePersistence';
import { useWakeLock } from '@/hooks/useWakeLock';
import { uuid } from '@/lib/ids';
import { readEntryLink, returnSearch, returnTo, settleEntryLink } from '@/lib/entry';
import { go as goTo } from '@/platform/route';
import {
  KEYS,
  loadInitial,
  type Session,
  pushRecentNames,
  resolveCorrupt,
  storage,
  type LastGroup,
  type Loaded,
} from '@/state/persistence';
import { initialState, reducer } from './reducer';
import { archive, archiveGame, forgetEmpty, sweepEmpty } from '@/state/archive';
import { backfillRegistry, ensurePlayer } from '@/state/registry';
import { cachedPrefs, setupDefaults } from '@/state/prefs';
import type {
  Action,
  AppState,
  Dir,
  ModalKind,
  Route,
  Screen,
  Seat,
  SetupState,
  SheetState,
} from './types';
import { useHistorySync } from '@/hooks/useHistorySync';
import { getSession, onSession, setSession as setSharedSession } from '@/sync/session';
import { setSyncStatus } from '@/sync/status';
import { messages } from '@/strings/messages';
import type { Game, Trump } from '@/games/kachuful/domain';

export interface Actions {
  go(screen: Screen, dir?: Dir): void;
  startSetup(): void;
  setupPatch(patch: Partial<SetupState>): void;
  setupSeat(k: number, seat: Seat | null): void;
  setupSeatPatch(k: number, patch: Partial<Seat>): void;
  setupSwap(a: number, b: number): void;
  beginGame(): void;
  resume(): void;
  bid(v: number): void;
  pickSeat(k: number): void;
  phase(phase: Phase, dir?: Dir): void;
  setResult(id: string, v: Outcome): void;
  confirmRound(): void;
  nextRound(): void;
  finishGame(): void;
  /** Ends a game with no round done without a trace. */
  discardGame(): void;
  rematch(): void;
  editRound(i: number, bids: Record<string, number>, results: Record<string, Outcome>): void;
  undo(): void;
  openSheet(sheet: SheetState | null): void;
  ask(modal: ModalKind | null): void;
  seqDone(): void;
  setSumAnim(v: boolean): void;
  streakDone(): void;
  popsDone(): void;
  setFresh(v: boolean): void;
  say(msg: string): void;
  /** Closes the toast now (a swipe), as its timeout would. */
  dismissToast(): void;
  vib(): void;
  /** Opens a screen over the current one. */
  open(route: Route): void;
  back(): void;
  /** Replaces the open screens (none: back to the game screens). */
  navReset(routes?: Route[]): void;
  /** Makes a saved game the current one. */
  openGame(game: Game): void;
  setSession(session: Session | null): void;
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

// Setup taps (a seat, a count, a swap) all feel the same: a pop and a light buzz.
const vib = () => feedback('tap');

const trumpOf = (s: AppState): Trump =>
  s.game.rounds.length
    ? s.seq
      ? s.seq.round.trump
      : s.screen === 'home' || s.screen === 'setup'
        ? 'spades'
        : curRound(s.game).trump
    : 'spades';

// The sync engine is downloaded on the first sign-in; signed out, none of it loads.
let engine: Promise<typeof import('@/games/kachuful/sync/engine')> | null = null;
const loadEngine = () => (engine ??= import('@/games/kachuful/sync/engine'));

export function AppProvider({ children, initial }: { children: ReactNode; initial?: Loaded }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const l = initial ?? loadInitial();
    const entry = readEntryLink();
    return {
      ...initialState(l.game, l.screen, l.undo, l.corrupt, getSession()),
      nav: entry ? [entry] : [],
    };
  });
  useEffect(settleEntryLink, []);
  const ref = useRef(state);
  ref.current = state;
  const withEngineRef = useRef<
    ((f: (m: Awaited<ReturnType<typeof loadEngine>>) => void) => void) | null
  >(null);

  usePersistence(state, dispatch);
  useWakeLock(state.game.status === 'active');

  // Every real game is also kept in the archive, so finishing or replacing it never loses it.
  useEffect(() => {
    if (state.corrupt) return;
    // Until a round is done a game exists nowhere but the table; undo back to that removes the copies.
    if (!doneRounds(state.game).length) {
      if (state.game.id !== 'demo' && forgetEmpty(state.game.syncId))
        dispatch({ type: 'renewSyncId', syncId: uuid() });
      return;
    }
    // A game scored signed in syncs to that account; one begun signed out waits for the import.
    const acct = ref.current.session?.user.id;
    const prev = archive.get('games', state.game.syncId);
    archiveGame(state.game, acct && (!prev || prev.account) ? { account: acct } : {});
    if (state.game.status === 'finished') void navigator.storage?.persist?.().catch(() => {});
  }, [state.game, state.corrupt]);
  useEffect(
    () =>
      archive.onError((e) =>
        dispatch({
          type: 'say',
          msg: e === 'quota' ? messages.toasts.storageFull : messages.toasts.storageOff,
          link:
            e === 'quota'
              ? { label: messages.toasts.openHistory, route: { screen: 'history' } }
              : undefined,
        }),
      ),
    [],
  );

  // Published for every game and the landing page (it saves it too).
  useEffect(() => setSharedSession(state.session), [state.session]);
  // Another game marking it stale (a 401 there) reaches this store too.
  useEffect(
    () =>
      onSession(() => {
        const s = getSession();
        if (s !== ref.current.session) dispatch({ type: 'session', session: s });
      }),
    [],
  );

  // The sync engine reads the session and game through these, and runs only while signed in.
  useEffect(() => {
    let bound = false;
    const withEngine = (f: (m: Awaited<ReturnType<typeof loadEngine>>) => void) => {
      if (!ref.current.session) return;
      void loadEngine().then((m) => {
        if (!bound) {
          bound = true;
          m.bindEngine({
            session: () => ref.current.session,
            game: () => ref.current.game,
            setSession: (session) => dispatch({ type: 'session', session }),
            syncGame: (game, fresh) => dispatch({ type: 'syncGame', game, fresh }),
            open: (route) => dispatch({ type: 'navPush', route }),
          });
        }
        f(m);
      });
    };
    withEngineRef.current = withEngine;
    const kick = () => withEngine((m) => m.scheduleSync(300));
    const onVis = () => document.visibilityState === 'visible' && kick();
    const offArchive = archive.subscribe(() => {
      const s = ref.current.session;
      if (s && !s.stale) withEngine((m) => m.hasWork(s.user.id) && m.scheduleSync(1500));
    });
    const tick = setInterval(() => document.visibilityState === 'visible' && kick(), 60e3);
    window.addEventListener('online', kick);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      withEngineRef.current = null;
      if (bound) void loadEngine().then((m) => m.bindEngine(null));
      offArchive();
      clearInterval(tick);
      window.removeEventListener('online', kick);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
  const userId = state.session && !state.session.stale ? state.session.user.id : null;
  useEffect(() => {
    if (!userId) {
      setSyncStatus({ phase: 'signedOut', waiting: 0, attention: 0 });
      return;
    }
    withEngineRef.current?.(
      (m) =>
        void m.syncNow({ full: true }).then(() => {
          // First sign-in on a phone with games of its own: offer to add them to the account.
          if (!m.importAsked() && m.importable().length && ref.current.screen !== 'round')
            dispatch({ type: 'navPush', route: { screen: 'import' } });
        }),
    );
  }, [userId]);

  // Names seen before the registry existed become registry players once the archive is read.
  useEffect(() => {
    void archive.ready.then(() => {
      backfillRegistry();
      sweepEmpty(ref.current.game.syncId);
    });
  }, []);

  // System Back closes a sheet or a confirm, then the top page, then steps back through setup (asking first once
  // anyone is seated, as its Back button does); in a round it opens the menu, as Kaali Teeri and Spades do.
  const setupDepth = state.screen === 'setup' && state.setup ? state.setup.step : 0;
  const roundDepth = state.screen === 'round' ? 1 : 0;
  useHistorySync(
    setupDepth + roundDepth + state.nav.length + (state.sheet ? 1 : 0) + (state.modal ? 1 : 0),
    () => {
      const s = ref.current;
      if (s.sheet) dispatch({ type: 'sheet', sheet: null });
      else if (s.modal) dispatch({ type: 'modal', modal: null });
      else if (s.nav.length) dispatch({ type: 'navPop' });
      else if (s.screen === 'setup' && s.setup && s.setup.step > 1)
        dispatch({ type: 'setupPatch', patch: { step: (s.setup.step - 1) as 1 | 2 } });
      else if (s.screen === 'setup' && s.setup?.seats.some(Boolean))
        dispatch({ type: 'modal', modal: 'leaveSetup' });
      else if (s.screen === 'setup') dispatch({ type: 'go', screen: 'home', dir: -1 });
      else if (s.screen === 'round') dispatch({ type: 'sheet', sheet: { type: 'menu' } });
    },
  );

  const toastId = state.toast?.id;
  useEffect(() => {
    if (toastId === undefined) return;
    const t = setTimeout(() => dispatch({ type: 'toastDone' }), 4000);
    return () => clearTimeout(t);
  }, [toastId]);

  const bannerId = state.banner?.id;
  const chimed = useRef<number>();
  useEffect(() => {
    if (bannerId === undefined) return;
    // A banner (peak round, back to 3) is news the table should hear once, not on every effect re-run.
    if (chimed.current !== bannerId) {
      chimed.current = bannerId;
      playCue({ name: 'chime', tier: 'beat' });
    }
    const t = setTimeout(() => dispatch({ type: 'bannerDone' }), 1600);
    return () => clearTimeout(t);
  }, [bannerId]);

  const actions = useMemo<Actions>(() => {
    // Screen changes mount a lot of UI; as transitions React renders them in small slices and stays interruptible.
    const nav = (a: Action) => startTransition(() => dispatch(a));
    // An account page opened from another game or the landing page returns there once nothing is left above it.
    const leave = (r: Route | undefined) => {
      const to = r && returnTo(r);
      if (to) goTo(to === 'landing' ? null : to, to === 'landing' ? '' : returnSearch(r));
      return !!to;
    };
    return {
      go: (screen, dir) => nav({ type: 'go', screen, dir }),
      startSetup: () => {
        const lg = storage.get<LastGroup | null>(KEYS.lastGroup, null);
        nav({ type: 'startSetup', lg, defaults: setupDefaults(lg, cachedPrefs()) });
      },
      setupPatch: (patch) => dispatch({ type: 'setupPatch', patch }),
      setupSeat: (k, seat) => dispatch({ type: 'setupSeat', k, seat }),
      setupSeatPatch: (k, patch) => dispatch({ type: 'setupSeatPatch', k, patch }),
      setupSwap: (a, b) => dispatch({ type: 'setupSwap', a, b }),
      beginGame: () => {
        const su = ref.current.setup;
        if (!su || !su.n) return;
        const names = su.seats.map((p) => p?.name ?? '');
        const lg: LastGroup = {
          names,
          emojis: su.seats.map((p) => p?.emoji ?? ''),
          colors: su.seats.map((p) => p?.color ?? ''),
          direction: su.dir,
          decks: su.decks,
          at: Date.now(),
        };
        feedback('begin');
        storage.set(KEYS.lastGroup, lg);
        pushRecentNames(names);
        const online = !!ref.current.session;
        if (online) void import('@/sync/prefs').then((p) => p.sendSetup(lg));
        const playerIds = su.seats.map((p) => (p ? ensurePlayer(p, online).id : ''));
        const now = Date.now();
        nav({ type: 'beginGame', id: 'g' + now, syncId: uuid(), now, playerIds });
      },
      resume: () => nav({ type: 'resume' }),
      bid: (v) => {
        // The bid's own sound waits for its chip to land (the screen's `onLand`); what the bid did sounds now.
        const s = ref.current,
          before = curRound(s.game);
        const after = reducer(s, { type: 'bid', v });
        dispatch({ type: 'bid', v });
        if (curRound(after.game).hookHits > before.hookHits) feedback('forbidden');
        else if (after.game.ui.hookWarn && !s.game.ui.hookWarn) feedback('hook');
        else vibrate(HAPTIC.TAP);
      },
      pickSeat: (k) => dispatch({ type: 'pickSeat', k }),
      phase: (phase, dir) => {
        if (phase === 'playing' && curRound(ref.current.game).phase === 'bidding')
          feedback('startPlay');
        nav({ type: 'phase', phase, dir });
      },
      setResult: (id, v) => {
        const s = ref.current;
        const after = reducer(s, { type: 'setResult', id, v });
        dispatch({ type: 'setResult', id, v });
        // A blocked result changes nothing; one the app filled in because only it could work gets a pop.
        if (after === s) feedback('err');
        else {
          playCue({ name: v, tier: 'tick', gain: 0.6 });
          vibrate(HAPTIC.TAP);
          if (after.autoResult) playCue({ name: 'pop', tier: 'tick' });
        }
      },
      confirmRound: () => {
        const g = ref.current.game;
        if (!resultsState(g, curRound(g)).ok) return;
        feedback('confirm');
        nav({ type: 'confirmRound' });
      },
      nextRound: () => nav({ type: 'nextRound' }),
      finishGame: () => dispatch({ type: 'finishGame' }),
      rematch: () => {
        vibrate(HAPTIC.TAP);
        playCue({ name: 'riffle' });
        const now = Date.now();
        nav({ type: 'rematch', id: 'g' + now, syncId: uuid(), now });
      },
      editRound: (i, bids, results) => dispatch({ type: 'editRound', i, bids, results }),
      undo: () => {
        feedback(ref.current.undo.length ? 'undo' : 'err');
        dispatch({ type: 'undo' });
      },
      openSheet: (sheet) => nav({ type: 'sheet', sheet }),
      ask: (modal) => dispatch({ type: 'modal', modal }),
      discardGame: () => dispatch({ type: 'discardGame' }),
      seqDone: () => dispatch({ type: 'seqDone' }),
      setSumAnim: (v) => dispatch({ type: 'setSumAnim', v }),
      streakDone: () => dispatch({ type: 'streakDone' }),
      popsDone: () => dispatch({ type: 'popsDone' }),
      setFresh: (v) => dispatch({ type: 'setFresh', v }),
      say: (msg) => dispatch({ type: 'say', msg }),
      dismissToast: () => dispatch({ type: 'toastDone' }),
      vib,
      open: (route) => nav({ type: 'navPush', route }),
      back: () => {
        const open = ref.current.nav;
        if (open.length === 1 && leave(open[0])) return;
        nav({ type: 'navPop' });
      },
      navReset: (routes) => {
        if (!routes?.length && leave(ref.current.nav[0])) return;
        nav({ type: 'navReset', routes });
      },
      openGame: (game) => nav({ type: 'openGame', game }),
      setSession: (session) => {
        // Published at once, not by the effect below: sign-in opened from another page returns there in the same
        // tap, which unmounts this store before that effect runs, and the session would be lost.
        setSharedSession(session);
        dispatch({ type: 'session', session });
      },
      repairSave: (choice) => dispatch({ type: 'replaceGame', game: resolveCorrupt(choice) }),
    };
  }, []);

  const value = useMemo(() => ({ state, actions, trump: trumpOf(state) }), [state, actions]);
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
