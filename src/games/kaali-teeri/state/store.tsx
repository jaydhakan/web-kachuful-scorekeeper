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
import type { CardRef, Copy, CountedBy, KtGame, KtMode, Suit } from '@/games/kaali-teeri/domain';
import { ktMessages } from '@/games/kaali-teeri/strings/messages';
import { useHaptics } from '@/hooks/useHaptics';
import { useHistorySync } from '@/hooks/useHistorySync';
import { useWakeLock } from '@/hooks/useWakeLock';
import { uuid } from '@/lib/ids';
import type { Direction, Seat } from '@/people';
import { archiveKtGame, forgetEmptyKt } from '@/state/archive';
import { loadSession, pushRecentNames } from '@/state/persistence';
import { ensurePlayer } from '@/state/registry';
import {
  loadKt,
  loadKtLastGroup,
  resolveKtCorrupt,
  saveKt,
  saveKtLastGroup,
  saveKtPrefs,
  saveKtScreen,
  type KtLoaded,
} from './persistence';
import { initialKtState, ktReducer, setupRules } from './reducer';
import type {
  Dir,
  KtAction,
  KtCallWhat,
  KtHandEdit,
  KtModal,
  KtRoute,
  KtScreen,
  KtSheet,
  KtState,
} from './types';
import type { KtLength } from '@/games/kaali-teeri/domain';

/** Everything the Kaali Teeri screens can do; each is ignored when the game's rules don't allow it. */
export interface KtActions {
  go(screen: KtScreen, dir?: Dir): void;
  resume(): void;
  openSheet(sheet: KtSheet | null): void;
  /** Opens a page over the current screen (History, a game, Leaderboard, Players, a player, head-to-head). */
  openPage(route: KtRoute): void;
  /** Closes the top page. */
  closePage(): void;
  ask(modal: KtModal | null): void;
  say(msg: string): void;
  dismissToast(): void;
  dealDone(): void;
  setFresh(v: boolean): void;
  // Setup
  startSetup(): void;
  setupStep(step: 1 | 2 | 3): void;
  setupCount(n: number): void;
  setupDir(dir: Direction): void;
  /** Null goes back to the deck's default (150 / 350). */
  setupMinBid(minBid: number | null): void;
  setupBidStep(step: 5 | 10): void;
  setupLength(length: KtLength): void;
  setupSeat(k: number, seat: Seat | null): void;
  setupSeatPatch(k: number, patch: Partial<Seat>): void;
  setupSwap(a: number, b: number): void;
  /** Seats the last group played on this device. */
  setupLastGroup(): void;
  setupDealer(k: number): void;
  randomDealer(): void;
  beginGame(): void;
  // Bidding
  setMode(mode: KtMode): void;
  quickBid(bidder: string, bid: number): void;
  call(what: KtCallWhat): void;
  // Trump and the call
  trump(suit: Suit): void;
  addCard(card: CardRef): void;
  removeCard(i: number): void;
  setCopy(i: number, copy: Copy): void;
  confirmCall(): void;
  // Play and result
  markPlayed(i: number, by: string | null): void;
  toResult(): void;
  toPlay(): void;
  countedBy(by: CountedBy): void;
  points(entered: number | null): void;
  confirmHand(): void;
  // Between hands and after
  nextHand(): void;
  finishGame(): void;
  abandon(): void;
  editHand(i: number, edit: KtHandEdit): void;
  rematch(): void;
  undo(): void;
  openGame(game: KtGame): void;
  repairSave(choice: 'reset' | 'keep'): void;
  vib(): void;
}

interface KtContextValue {
  state: KtState;
  actions: KtActions;
}

const KtCtx = createContext<KtContextValue | null>(null);

export const useKt = (): KtContextValue => {
  const v = useContext(KtCtx);
  if (!v) throw new Error('useKt must be used inside <KtProvider>');
  return v;
};

export function KtProvider({ children, initial }: { children: ReactNode; initial?: KtLoaded }) {
  const [state, dispatch] = useReducer(ktReducer, undefined, () => {
    const l = initial ?? loadKt();
    return initialKtState(l.game, l.screen, l.undo, l.prefs, l.corrupt);
  });
  const vib = useHaptics();
  const ref = useRef(state);
  ref.current = state;

  useWakeLock(state.game?.status === 'active');

  // The game and its undo ring after every change, unless the save is waiting for a repair choice.
  const warned = useRef(false);
  useEffect(() => {
    if (state.corrupt) return;
    const res = saveKt(state.game, state.undo);
    if (res === 'ok') warned.current = false;
    else if (!warned.current) {
      warned.current = true;
      const t = ktMessages.toasts;
      dispatch({ type: 'say', msg: res === 'quota' ? t.storageFull : t.storageOff });
    }
  }, [state.game, state.undo, state.corrupt]);

  useEffect(() => {
    if (!state.corrupt) saveKtScreen(state.screen === 'game' ? 'game' : 'home');
  }, [state.screen, state.corrupt]);
  useEffect(() => void saveKtPrefs(state.prefs), [state.prefs]);

  // Every game with a hand done is kept in the archive, so ending or replacing it never loses it.
  useEffect(() => {
    const g = state.game;
    if (state.corrupt || !g) return;
    // Undone back to no hand done, it exists nowhere but the table.
    if (!g.hands.some((h) => h.phase === 'done')) forgetEmptyKt(g.syncId);
    else archiveKtGame(g);
  }, [state.game, state.corrupt]);

  // System Back closes an open sheet, then the top page, then steps back through setup (step 3 → 2 → 1 → home).
  const setupDepth = state.screen === 'setup' && state.setup ? state.setup.step : 0;
  useHistorySync(setupDepth + state.pages.length + (state.sheet ? 1 : 0), () => {
    const s = ref.current;
    if (s.sheet) dispatch({ type: 'sheet', sheet: null });
    else if (s.pages.length) dispatch({ type: 'closePage' });
    else if (s.screen === 'setup' && s.setup && s.setup.step > 1)
      dispatch({ type: 'setupStep', step: (s.setup.step - 1) as 1 | 2 });
    else if (s.screen === 'setup') dispatch({ type: 'go', screen: 'home', dir: -1 });
  });

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

  const actions = useMemo<KtActions>(() => {
    // Screen changes mount a lot of UI; as transitions React renders them in slices and stays interruptible.
    const nav = (a: KtAction) => startTransition(() => dispatch(a));
    const tap = (a: KtAction) => {
      dispatch(a);
      vib();
    };
    return {
      go: (screen, dir) => nav({ type: 'go', screen, dir }),
      resume: () => nav({ type: 'resume' }),
      openSheet: (sheet) => nav({ type: 'sheet', sheet }),
      openPage: (route) => nav({ type: 'openPage', route }),
      closePage: () => nav({ type: 'closePage' }),
      ask: (modal) => dispatch({ type: 'modal', modal }),
      say: (msg) => dispatch({ type: 'say', msg }),
      dismissToast: () => dispatch({ type: 'toastDone' }),
      dealDone: () => dispatch({ type: 'dealDone' }),
      setFresh: (v) => dispatch({ type: 'setFresh', v }),
      startSetup: () => nav({ type: 'startSetup', lg: loadKtLastGroup() }),
      setupStep: (step) => nav({ type: 'setupStep', step }),
      setupCount: (n) => dispatch({ type: 'setupCount', n }),
      setupDir: (dir) => dispatch({ type: 'setupDir', dir }),
      setupMinBid: (minBid) => dispatch({ type: 'setupMinBid', minBid }),
      setupBidStep: (step) => dispatch({ type: 'setupBidStep', step }),
      setupLength: (length) => dispatch({ type: 'setupLength', length }),
      setupSeat: (k, seat) => dispatch({ type: 'setupSeat', k, seat }),
      setupSeatPatch: (k, patch) => dispatch({ type: 'setupSeatPatch', k, patch }),
      setupSwap: (a, b) => dispatch({ type: 'setupSwap', a, b }),
      setupLastGroup: () => dispatch({ type: 'setupLastGroup' }),
      setupDealer: (k) => dispatch({ type: 'setupDealer', k }),
      randomDealer: () => {
        const n = ref.current.setup?.n;
        if (n) dispatch({ type: 'setupDealer', k: Math.floor(Math.random() * n) });
      },
      beginGame: () => {
        const su = ref.current.setup;
        const rules = su && setupRules(su);
        if (!su || !rules || su.seats.some((q) => !q || !q.name.trim())) return;
        const seats = su.seats as Seat[];
        const online = !!loadSession();
        const playerIds = seats.map((q) => ensurePlayer(q, online).id);
        saveKtLastGroup({
          players: seats.map((q, i) => ({
            name: q.name,
            emoji: q.emoji,
            color: q.color,
            playerId: playerIds[i],
          })),
          direction: su.dir,
          minBid: rules.minBid,
          step: rules.step,
          length: rules.length,
          at: Date.now(),
        });
        // The suggested names are shared by every game's seating (platform plan §5.8).
        pushRecentNames(seats.map((q) => q.name));
        const now = Date.now();
        nav({ type: 'beginGame', id: 'kt' + now, syncId: uuid(), now, playerIds });
      },
      setMode: (mode) => dispatch({ type: 'setMode', mode }),
      quickBid: (bidder, bid) => tap({ type: 'quickBid', bidder, bid }),
      call: (what) => tap({ type: 'call', what }),
      trump: (suit) => tap({ type: 'trump', suit }),
      addCard: (card) => tap({ type: 'addCard', card }),
      removeCard: (i) => dispatch({ type: 'removeCard', i }),
      setCopy: (i, copy) => dispatch({ type: 'setCopy', i, copy }),
      confirmCall: () => nav({ type: 'confirmCall' }),
      markPlayed: (i, by) => tap({ type: 'markPlayed', i, by }),
      toResult: () => nav({ type: 'toResult' }),
      toPlay: () => nav({ type: 'toPlay' }),
      countedBy: (by) => dispatch({ type: 'countedBy', by }),
      points: (entered) => dispatch({ type: 'points', entered }),
      confirmHand: () => {
        vib();
        nav({ type: 'confirmHand' });
      },
      nextHand: () => nav({ type: 'nextHand' }),
      finishGame: () => nav({ type: 'finishGame' }),
      abandon: () => nav({ type: 'abandon' }),
      editHand: (i, edit) => dispatch({ type: 'editHand', i, edit }),
      rematch: () => {
        const now = Date.now();
        nav({ type: 'rematch', id: 'kt' + now, syncId: uuid(), now });
      },
      undo: () => dispatch({ type: 'undo' }),
      openGame: (game) => nav({ type: 'openGame', game }),
      repairSave: (choice) => {
        resolveKtCorrupt(choice);
        dispatch({ type: 'repaired' });
      },
      vib,
    };
  }, [vib]);

  const value = useMemo(() => ({ state, actions }), [state, actions]);
  return <KtCtx.Provider value={value}>{children}</KtCtx.Provider>;
}
