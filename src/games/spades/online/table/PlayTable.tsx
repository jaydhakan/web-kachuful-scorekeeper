import '@/games/spades/ui/play.css';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import type { Face } from '@/components/ui/Avatar';
import { useBidFlight } from '@/components/ui/BidFlight';
import { Icon } from '@/components/ui/Icons';
import { IconButton } from '@/components/ui/IconButton';
import { Loader } from '@/components/ui/Loader';
import { Modal } from '@/components/ui/Modal';
import { Sheet } from '@/components/ui/Sheet';
import { TableInviteSheet } from '@/components/seat-invites/TableInviteSheet';
import { vibrate } from '@/hooks/useHaptics';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useWakeLock } from '@/hooks/useWakeLock';
import { seatEp } from '@/sync/seatInviteApi';
import { MQ } from '@/theme/breakpoints';
import { allowedBids, blindAllowed, minBidFor } from '@/games/spades/domain/bidding';
import { cardId, sameCard } from '@/games/spades/domain/cards';
import { REACTIONS, lastTrick } from '@/games/spades/domain/rules';
import { SEATS, partnerOf, teamOf } from '@/games/spades/domain/seats';
import { scoresOf, totals } from '@/games/spades/domain/standings';
import { AWAY_TIMER_MS, DEAL_ANYONE_MS, timedTurn } from '@/games/spades/domain/timer';
import { trickWinner, ledSuit } from '@/games/spades/domain/trick';
import type { Action, Card, Seat, SpPublic, SpView, TeamId } from '@/games/spades/domain/types';
import { spGo } from '@/games/spades/nav';
import { useTable, type TableCtx } from '@/games/spades/online/state/tableContext';
import { armAudio, setSoundMode, sfx } from '@/games/spades/sound/sfx';
import { play as s } from '@/games/spades/strings/play';
import { BidPad } from '@/games/spades/ui/BidPad';
import { boxOf, type Box } from '@/games/spades/ui/fx';
import { Hand } from '@/games/spades/ui/Hand';
import { HandSummary } from '@/games/spades/ui/HandSummary';
import { usePrefs } from '@/games/spades/ui/prefs';
import type { SeatProps } from '@/games/spades/ui/Seat';
import { cardName } from '@/games/spades/ui/SpCard';
import { TeamBar, type TeamLine } from '@/games/spades/ui/TeamBar';
import { DEAL, DealLayer, HoldToDeal, LookGate, dealDelays } from './Deal';
import { Felt, type TrickPlay } from './Felt';
import { dealNo, handDone, momentsBetween, playsOf, type Moment } from './moments';
import { cardsLeft, lastHandScore, nilState, placeOf, teamNumbers } from './present';
import { BoardBody, KeysBody, LastTrickBody, MenuBody, PrefsBody } from './Sheets';
import { useAutoTimeout, useServerNow } from './useTimers';
import { Cancelled, Winner } from './Winner';

/** A trick stays on the felt this long after its last card lands, before it is gathered to the winner. */
export const TRICK_HOLD_MS = 900;
const FLIGHT_MS = 460;
/** The hand's end: the halos resolve and any SET stamps before the summary opens. */
const STAMP_MS = 1300;
const REACT_GAP_MS = 2000;
const TOAST_MS = 3200;

type SheetKind = 'menu' | 'prefs' | 'board' | 'last' | 'keys' | 'summary' | 'invite' | null;
type Confirm = 'end' | 'draw' | 'cancel' | 'leave' | { replace: Seat } | null;

/** The table's width, kept current; jsdom has no layout, so a phone width stands in. */
function useWidth(ref: RefObject<HTMLElement>, fallback = 375) {
  const [w, setW] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setW(el.clientWidth || fallback);
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, fallback]);
  return w;
}

const reasonText = (r: string | null) =>
  (r && s.reasons[r.replace(/_/g, '-')]) ||
  (r === 'offline' ? s.reasons.offline : s.reasons.generic);

/**
 * The online table (plan §2.4–§2.5): the team bar, the felt with four seats and the trick, your hand, and every
 * phase of a hand, driven entirely by the server's view (`useTable()`). Each change between two views plays its
 * moment; nothing here waits on decoration before taking input.
 */
export default function PlayTable() {
  const ctx = useTable();
  if (!ctx.view)
    return (
      <div className="scr-bg absolute inset-0" aria-busy="true" aria-label={s.title.loading}>
        <Loader />
      </div>
    );
  if (ctx.view.table.status === 'cancelled') return <Cancelled onHome={() => spGo('')} />;
  return <TableScreen ctx={ctx} view={ctx.view} />;
}

interface Toast {
  id: number;
  msg: string;
}
interface Float {
  id: number;
  seat: Seat;
  emoji: string;
}

function TableScreen({ ctx, view }: { ctx: TableCtx; view: SpView }) {
  const t = view.table;
  const me = view.me.seat;
  const viewer: Seat = me ?? 0;
  const rm = useReducedMotion();
  const [prefs] = usePrefs();
  const pane = useMediaQuery(MQ.pane);
  const big = useMediaQuery(MQ.big);
  const land = useMediaQuery(MQ.land);
  const root = useRef<HTMLDivElement>(null);
  const feltRef = useRef<HTMLDivElement>(null);
  const handBox = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const handWidth = useWidth(handBox);
  const flight = useBidFlight('sp', s.bid.nil);
  const live = ctx.status === 'live';
  const dn = dealNo(t);

  useEffect(() => armAudio(), []);
  useEffect(() => setSoundMode(prefs.sounds), [prefs.sounds]);
  useWakeLock(me !== null && t.status === 'playing');

  const names = useMemo(
    () => t.seats.map((x, i) => (i === me ? s.seat.you : (x.who?.name ?? s.seat.empty))),
    [t.seats, me],
  );
  const realNames = useMemo(() => t.seats.map((x) => x.who?.name ?? s.seat.empty), [t.seats]);
  const faces = useMemo<(Face | null)[]>(
    () =>
      t.seats.map((x) =>
        x.who
          ? {
              emoji: x.who.emoji,
              color: x.who.color,
              photoUrl: x.who.photoUrl,
              playerId: x.who.playerId,
            }
          : null,
      ),
    [t.seats],
  );
  const teamNames: Record<TeamId, string> = useMemo(() => {
    const label = (team: TeamId) => {
      if (me === null) {
        const [p, q] = team === 'a' ? [0, 2] : [1, 3];
        return s.team.pair(realNames[p], realNames[q]);
      }
      return teamOf(me) === team ? s.team.us : s.team.them;
    };
    return { a: label('a'), b: label('b') };
  }, [me, realNames]);

  // ---------- transient UI ----------
  const [toast, setToast] = useState<Toast | null>(null);
  const say = useRef<(msg: string) => void>(() => undefined);
  const [said, setSaid] = useState('');
  const showToast = useCallback(
    (msg: string) => setToast({ id: Date.now() + Math.random(), msg }),
    [],
  );
  say.current = (msg: string) => setSaid((x) => (x === msg ? `${msg} ` : msg));
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(id);
  }, [toast]);

  const [sheet, setSheet] = useState<SheetKind>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [inviteSeat, setInviteSeat] = useState<Seat | null>(null);

  // ---------- presentation state ----------
  const [shown, setShown] = useState(() => t.tricks.length);
  const [sweeping, setSweeping] = useState(false);
  const [pending, setPending] = useState<{ card: Card; from: Box } | null>(null);
  const [returning, setReturning] = useState<{ card: Card; from: Box; key: number } | null>(null);
  const [pendingBid, setPendingBid] = useState<number | null>(null);
  const [bubbles, setBubbles] = useState<Record<number, SeatProps['bubble']>>({});
  const [crack, setCrack] = useState<number | null>(null);
  const [dealing, setDealing] = useState<{ key: number; dealer: Seat; from: Box | null } | null>(
    null,
  );
  const [stage, setStage] = useState<{ deal: number; s: 'stamps' | 'summary' } | null>(() =>
    handDone(t) ? { deal: dn, s: 'summary' } : null,
  );
  const [winnerShown, setWinnerShown] = useState(t.status === 'finished');
  const [floats, setFloats] = useState<Float[]>([]);
  const userAct = useRef(0);
  // A new deal is noticed while rendering, so the very first frame of it already shows the deck, not the cards.
  const [lastDeal, setLastDeal] = useState(dn);
  if (lastDeal !== dn) {
    setLastDeal(dn);
    setShown(0);
    setCrack(null);
    setStage(null);
    setReturning(null);
    if (t.status === 'playing' && t.phase === 'bidding' && t.dealer !== null) {
      const f = feltRef.current ? boxOf(feltRef.current) : null;
      const from = f ? { x: f.x + f.w / 2 - 24, y: f.y + f.h * 0.48 - 33, w: 48, h: 67 } : null;
      setDealing({ key: dn, dealer: t.dealer, from });
    }
  }
  const seen = useRef<Set<string> | null>(null);

  // ---------- derived ----------
  const server = t.tricks.length;
  const mine = (c: Card) => !!pending && sameCard(pending.card, c);
  const pendingIn =
    !!pending && playsOf(t).some((p) => p.seat === me && sameCard(p.card, pending.card));
  const eff = t.trick.length || (pending && !pendingIn) ? server : Math.min(shown, server);
  const holding = eff < server ? eff : null;
  const keyOf = (seat: Seat, c: Card) => `${dn}:${seat}-${cardId(c)}`;
  if (seen.current === null) seen.current = new Set(playsOf(t).map((p) => keyOf(p.seat, p.card)));
  const rawPlays =
    holding !== null
      ? t.tricks[holding].plays
      : [
          ...t.trick,
          ...(pending && !pendingIn && me !== null ? [{ seat: me, card: pending.card }] : []),
        ];
  const plays: TrickPlay[] = rawPlays.map((p) => {
    const k = keyOf(p.seat, p.card);
    const fly = seen.current!.has(k)
      ? null
      : p.seat === me && pending && mine(p.card)
        ? { box: pending.from }
        : { seat: p.seat };
    return { ...p, place: placeOf(p.seat, viewer), fly };
  });
  const leader = rawPlays.length ? trickWinner(rawPlays) : null;
  const led = ledSuit(rawPlays);
  const cut =
    leader !== null &&
    led !== null &&
    led !== 'spades' &&
    rawPlays.find((p) => p.seat === leader)?.card.suit === 'spades';
  useEffect(() => {
    for (const p of plays) seen.current!.add(keyOf(p.seat, p.card));
  });

  const ended = handDone(t) && eff >= 13;
  const stamped = stage?.deal === dn;
  const settled = stamped && stage?.s === 'summary';
  const nums = teamNumbers(t, eff, settled);
  const setScore = stamped ? lastHandScore(t) : null;
  const left = cardsLeft(t);
  const inHand = t.status === 'playing' && (t.phase === 'bidding' || t.phase === 'playing');
  const myTurn = inHand && me !== null && t.turn === me && !t.paused;
  const ticking =
    t.status === 'playing' && (t.deadline !== null || t.phase === 'deal' || t.phase === 'handEnd');
  const now = useServerNow(ctx.clockOffset, ticking);
  const secsLeft = t.deadline !== null ? Math.max(0, Math.ceil((t.deadline - now) / 1000)) : null;
  const lateDeal =
    (t.phase === 'deal' || t.phase === 'handEnd') &&
    t.turnStartedAt !== null &&
    now >= t.turnStartedAt + DEAL_ANYONE_MS;
  const canDeal =
    t.status === 'playing' &&
    (t.phase === 'deal' || t.phase === 'handEnd') &&
    me !== null &&
    !t.paused &&
    (me === t.dealer || lateDeal);
  const playable =
    live &&
    !ctx.busy &&
    myTurn &&
    t.phase === 'playing' &&
    !pending &&
    !dealing &&
    holding === null;
  const myHand = view.me.hand ? view.me.hand.filter((c) => !mine(c)) : null;

  useAutoTimeout(t, me, ctx.clockOffset, ctx.presence, ctx.act);

  // ---------- acting ----------
  const act = useCallback(
    async (a: Action, user = true) => {
      if (user) userAct.current = Date.now();
      return ctx.act(a);
    },
    [ctx],
  );
  // A refusal's reason arrives as the link's lastError: shown only for something this person just did.
  useEffect(() => {
    if (ctx.lastError && Date.now() - userAct.current < 4000) showToast(reasonText(ctx.lastError));
  }, [ctx.lastError, showToast]);

  const onPlay = (card: Card, from: Box) => {
    if (!playable || me === null) return;
    setPending({ card, from });
    sfx('snap', true);
    void act({ type: 'play', card }).then((r) => {
      if (r === 'ok') return;
      const el = root.current?.querySelector(`[data-trick-card="${cardId(card)}"]`);
      setReturning({ card, from: el ? boxOf(el) : from, key: Date.now() });
      setPending(null);
      vibrate(10);
      if (r === 'offline') showToast(s.reasons.offline);
    });
  };
  // The optimistic card is the server's once the view shows it (or the turn has moved on without it).
  useEffect(() => {
    if (pending && (pendingIn || t.turn !== me || t.phase !== 'playing')) setPending(null);
  }, [t, pending, pendingIn, me]);
  useEffect(() => {
    if (pendingBid !== null && me !== null && (t.bids[me] !== null || t.phase !== 'bidding'))
      setPendingBid(null);
  }, [t, pendingBid, me]);

  const onBid = (bid: number, from: HTMLElement) => {
    if (me === null) return;
    setPendingBid(bid);
    flight.launch(from, bid, me);
    sfx('pop', true);
    void act({ type: 'bid', bid }).then((r) => {
      if (r !== 'ok') {
        setPendingBid(null);
        if (r === 'offline') showToast(s.reasons.offline);
      }
    });
  };
  const blocked = (why: string) => {
    showToast(why);
    vibrate(10);
    sfx('err', true);
  };

  // ---------- moments ----------
  const prev = useRef<SpPublic>(t);
  useEffect(() => {
    const p = prev.current;
    prev.current = t;
    if (p === t) return;
    const ms = momentsBetween(p, t);
    for (const mo of ms) onMoment(mo, p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  function onMoment(mo: Moment, p: SpPublic) {
    const name = (x: Seat) => realNames[x];
    switch (mo.kind) {
      case 'deal':
        say.current(s.announce.dealt(name(mo.dealer)));
        break;
      case 'bid': {
        const text = mo.bid === 0 ? s.seat.bubbleNil(mo.blind) : s.seat.bubbleBid(mo.bid);
        setBubbles((b) => ({
          ...b,
          [mo.seat]: { text, nil: mo.bid === 0, key: Date.now() + mo.seat },
        }));
        if (mo.seat !== me) sfx('pop');
        say.current(s.announce.bid(name(mo.seat), mo.bid, mo.blind));
        break;
      }
      case 'play':
        if (mo.seat !== me) sfx('snap');
        say.current(s.announce.played(name(mo.seat), cardName(mo.card)));
        if (mo.cut) {
          sfx('thud', me !== null && teamOf(mo.seat) === teamOf(me));
          vibrate(20);
        }
        break;
      case 'broken':
        setCrack(dn * 7 + mo.seat + 1);
        sfx('crack');
        vibrate(30);
        setTimeout(() => say.current(s.announce.broken), 300);
        break;
      case 'timeout': {
        const msg =
          mo.seat === me
            ? mo.bid !== null
              ? s.timeout.myBid(mo.bid)
              : s.timeout.myPlay
            : mo.bid !== null
              ? s.timeout.theirBid(name(mo.seat), mo.bid)
              : s.timeout.theirPlay(name(mo.seat));
        showToast(msg);
        break;
      }
      case 'handEnd':
        say.current(s.announce.handOver(mo.index + 1));
        break;
      case 'finished':
        if (!handDone(t) || p.history.length === t.history.length) setWinnerShown(true);
        break;
      case 'replaced':
        if (view.me.host) {
          showToast(s.toast.replaced(name(mo.seat)));
          setInviteSeat(mo.seat);
          setSheet('invite');
        }
        break;
      default:
        break;
    }
  }

  // Your turn: a tick and a buzz, once per turn; and once more at five seconds left.
  const turnKey = myTurn ? `${dn}:${t.phase}:${playsOf(t).length}:${t.bids.join()}` : null;
  useEffect(() => {
    if (!turnKey) return;
    sfx('tick', true);
    vibrate(15);
    say.current(t.phase === 'bidding' ? s.announce.yourBid : s.announce.yourTurn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnKey]);
  const warned = useRef<number | null>(null);
  useEffect(() => {
    if (
      myTurn &&
      secsLeft !== null &&
      secsLeft <= 5 &&
      secsLeft > 0 &&
      warned.current !== t.deadline
    ) {
      warned.current = t.deadline;
      sfx('tick', true);
      vibrate(10);
    }
  }, [myTurn, secsLeft, t.deadline]);

  // ---------- the trick on the felt: hold, gather, count ----------
  useEffect(() => {
    if (holding === null) {
      setSweeping(false);
      if (shown !== eff) setShown(eff);
      return;
    }
    if (server - holding > 1) {
      setShown(server - 1);
      return;
    }
    setSweeping(false);
    const id = setTimeout(() => setSweeping(true), rm ? TRICK_HOLD_MS : FLIGHT_MS + TRICK_HOLD_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holding, dn]);
  const onSwept = () => {
    if (holding === null) return;
    const w = t.tricks[holding].winner;
    sfx('sweep', me !== null && teamOf(w) === teamOf(me));
    say.current(s.announce.trick(realNames[w]));
    setSweeping(false);
    setShown(holding + 1);
  };

  // ---------- the hand's end: halos and stamps, then the summary ----------
  useEffect(() => {
    if (!ended || stage?.deal === dn) return;
    setStage({ deal: dn, s: 'stamps' });
    const id = setTimeout(
      () => {
        setStage({ deal: dn, s: 'summary' });
        setSheet('summary');
      },
      rm ? 300 : STAMP_MS,
    );
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ended, dn]);
  // The halo that just turned and any team that was set, said once.
  const nilsSaid = useRef(-1);
  useEffect(() => {
    if (!stamped || nilsSaid.current === dn) return;
    nilsSaid.current = dn;
    for (const x of SEATS)
      if (t.bids[x] === 0 && nilState(t, x, 13, true) === 'made') {
        sfx('cheer', x === me || (me !== null && teamOf(x) === teamOf(me)));
        showToast(s.toast.nilMade(realNames[x], !!t.blind[x]));
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamped, dn]);
  const nilWas = useRef<string[]>([]);
  const nils = SEATS.map((x) => nilState(t, x, eff, stamped));
  useEffect(() => {
    nils.forEach((n, x) => {
      if (n === 'broken' && nilWas.current[x] === 'live') {
        sfx('crack', x === me);
        vibrate(30);
        showToast(s.toast.nilBroken(realNames[x]));
        say.current(s.announce.nilBroken(realNames[x]));
      }
    });
    nilWas.current = nils;
  });

  // ---------- reactions ----------
  const [reactOpen, setReactOpen] = useState(false);
  const lastReact = useRef(0);
  const addFloat = useCallback((seat: Seat, emoji: string) => {
    setFloats((f) => [...f.slice(-6), { id: Date.now() + Math.random(), seat, emoji }]);
  }, []);
  useEffect(
    () =>
      ctx.onReaction((r) => {
        if (r.seat === me) return;
        addFloat(r.seat, r.emoji);
        sfx('pop');
        say.current(s.announce.reaction(realNames[r.seat], r.emoji));
      }),
    [ctx, me, addFloat, realNames],
  );
  const react = (emoji: string) => {
    setReactOpen(false);
    if (me === null || Date.now() - lastReact.current < REACT_GAP_MS) return;
    lastReact.current = Date.now();
    addFloat(me, emoji);
    sfx('pop', true);
    void act({ type: 'react', emoji }, false);
  };

  // ---------- keyboard (the desk, or any phone with a keyboard) ----------
  const anyOpen = sheet !== null || confirm !== null;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (anyOpen || e.altKey || e.ctrlKey || e.metaKey) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest('input,textarea,[contenteditable]')) return;
      if (e.key === '?') {
        e.preventDefault();
        setSheet('keys');
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        setSheet('last');
      } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !el?.closest('[data-hand]')) {
        const cards = [
          ...(root.current?.querySelectorAll<HTMLElement>('[data-hand] button') ?? []),
        ];
        if (!cards.length) return;
        e.preventDefault();
        (e.key === 'ArrowLeft' ? cards[cards.length - 1] : cards[0]).focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [anyOpen]);
  // The page behind a sheet or dialog is inert (useDialog traps focus inside it).
  useEffect(() => {
    const el = content.current;
    if (!el) return;
    if (anyOpen) el.setAttribute('inert', '');
    else el.removeAttribute('inert');
  }, [anyOpen]);

  // ---------- what the seats show ----------
  const seats = SEATS.map((x) => {
    const bid = t.bids[x];
    const won = t.tricks.slice(0, eff).filter((r) => r.winner === x).length;
    const showBid = inHand || t.phase === 'handEnd' || t.status === 'finished';
    const pill =
      !showBid || bid === null || bid === undefined
        ? x === me && pendingBid !== null
          ? pendingBid === 0
            ? s.seat.nil(false, 0)
            : s.seat.bid(0, pendingBid)
          : s.seat.noBid
        : bid === 0
          ? s.seat.nil(!!t.blind[x], won)
          : s.seat.bid(won, bid);
    const away = !!t.seats[x].who && (t.seats[x].away || ctx.presence[x] === false);
    const turn = inHand && t.turn === x && !t.paused;
    const timer =
      turn && timedTurn(t) && t.deadline !== null
        ? {
            deadline: t.deadline,
            totalMs: t.seats[x].away ? AWAY_TIMER_MS : (t.rules.timerSec ?? 30) * 1000,
            clockOffset: ctx.clockOffset,
            warn: (secsLeft ?? 99) <= 10,
          }
        : null;
    const team =
      me === null
        ? teamNames[teamOf(x)]
        : x === me
          ? ''
          : teamOf(x) === teamOf(me)
            ? s.seat.partner
            : s.seat.opponent;
    return {
      seat: x,
      place: placeOf(x, viewer),
      face: faces[x],
      name: names[x],
      me: x === me,
      pill,
      pillNil: bid === 0,
      took: won,
      aria: s.seat.aria({
        name: realNames[x],
        team,
        bid: s.seat.bidAria(showBid ? (bid ?? null) : null, won, !!t.blind[x]),
        cards: left[x],
        dealer: t.dealer === x && t.status === 'playing',
        turn,
        away,
      }),
      cardsLeft: dealing ? 13 : left[x],
      dealer: t.dealer === x && t.status === 'playing',
      turn,
      away,
      nil: nils[x],
      timer,
      invited: !!ctx.invites[x],
      bubble: bubbles[x] ?? null,
    };
  });

  const teamLines: TeamLine[] = (['a', 'b'] as const).map((team) => {
    const n = nums[team];
    const r = setScore?.[team];
    return {
      team,
      name: teamNames[team],
      names:
        team === 'a' ? `${realNames[0]} · ${realNames[2]}` : `${realNames[1]} · ${realNames[3]}`,
      score: n.score,
      contract: n.contract,
      doubleNil: n.doubleNil,
      took: n.took,
      bags: n.bagsTotal % 10,
      bursts: n.bursts,
      made: n.made,
      set: r && r.made === false ? -10 * r.contract : null,
      mine: me !== null && teamOf(me) === team,
    };
  });
  // The moment a 10-bag penalty lands, say it.
  const burstsSaid = useRef({ a: 0, b: 0 });
  useEffect(() => {
    for (const l of teamLines) {
      if (l.bursts > burstsSaid.current[l.team]) {
        showToast(s.toast.burst(l.name));
        say.current(s.announce.burst(l.name));
      }
      burstsSaid.current[l.team] = l.bursts;
    }
  });

  // ---------- bidding ----------
  const showPad =
    t.status === 'playing' &&
    t.phase === 'bidding' &&
    myTurn &&
    me !== null &&
    t.looked[me] &&
    t.bids[me] === null &&
    pendingBid === null &&
    !dealing;
  const gate =
    t.status === 'playing' &&
    t.phase === 'bidding' &&
    me !== null &&
    blindAllowed(t.rules) &&
    !t.looked[me] &&
    t.bids[me] === null &&
    !t.blind[me] &&
    !dealing;
  const partner = me !== null ? partnerOf(me) : null;
  const bidInfo = (() => {
    if (me === null || partner === null) return '';
    const pb = t.bids[partner];
    const pn = realNames[partner];
    if (pb === null || pb === undefined) return s.bid.partnerAfter(pn);
    if (pb === 0) return s.bid.partnerNil(pn);
    const min = minBidFor(me, t.bids, t.rules);
    return min > 1 && t.rules.minTeamBid
      ? s.bid.partnerMin(pn, pb, min, t.rules.minTeamBid)
      : s.bid.partnerBid(pn, pb);
  })();
  const why = (v: number) =>
    v === 0 && !t.rules.nil
      ? s.bid.nilOff
      : me !== null && v > 0 && v < minBidFor(me, t.bids, t.rules)
        ? s.bid.belowMin(t.rules.minTeamBid ?? 0)
        : null;

  // ---------- the summary ----------
  const last = t.history[t.history.length - 1] ?? null;
  const prior = useMemo(() => totals(t.history.slice(0, -1)), [t.history]);
  const after = useMemo(() => scoresOf(totals(t.history)), [t.history]);
  const verdict = (() => {
    if (t.status === 'finished' && t.result)
      return t.result.winner === 'draw'
        ? s.winner.draw
        : s.summary.wins(teamNames[t.result.winner]);
    const reached =
      t.rules.target !== null && (after.a >= t.rules.target || after.b >= t.rules.target);
    return reached && after.a === after.b ? s.summary.tie : s.summary.target(t.rules.target);
  })();
  const closeSummary = () => {
    setSheet(null);
    if (t.status === 'finished') setWinnerShown(true);
  };
  const deal = () => {
    setSheet(null);
    void act({ type: 'deal' });
  };
  const summaryFooter: ReactNode =
    t.status === 'finished' ? (
      <Wide accent onClick={closeSummary} label={s.summary.winner} />
    ) : canDeal ? (
      <div className="flex justify-center">
        <HoldToDeal label={s.deal.hold} disabled={!live || ctx.busy} onDeal={deal} />
      </div>
    ) : (
      <div className="flex flex-col gap-2">
        {t.dealer !== null && (
          <p className="text-center text-14 text-[var(--tx2)]">
            {s.summary.waitDeal(realNames[t.dealer])}
          </p>
        )}
        <Wide onClick={closeSummary} label={s.summary.close} />
      </div>
    );

  // ---------- the host ----------
  const awaySeats = SEATS.filter((x) => x !== t.host && t.seats[x].who && t.seats[x].away).map(
    (x) => ({ seat: x, name: realNames[x] }),
  );
  const doConfirm = async () => {
    const c = confirm;
    setConfirm(null);
    setSheet(null);
    if (c === 'leave') return spGo('');
    if (c === 'end') return void act({ type: 'endGame' });
    if (c === 'draw') return void act({ type: 'drawGame' });
    if (c === 'cancel') return void act({ type: 'cancelGame' });
    if (c && typeof c === 'object') {
      const r = await act({ type: 'replace', seat: c.replace });
      if (r === 'ok') {
        setInviteSeat(c.replace);
        setSheet('invite');
      }
    }
  };
  const confirmText = (() => {
    if (confirm === 'end')
      return { text: s.menu.endGame, body: s.menu.endGameBody, ok: s.menu.endGameOk };
    if (confirm === 'draw') return { text: s.menu.draw, body: s.menu.drawBody, ok: s.menu.drawOk };
    if (confirm === 'cancel')
      return { text: s.menu.cancel, body: s.menu.cancelBody, ok: s.menu.cancelOk };
    if (confirm === 'leave')
      return { text: s.menu.leave, body: s.menu.leaveBody, ok: s.menu.leave };
    if (confirm && typeof confirm === 'object') {
      const n = realNames[confirm.replace];
      return { text: s.menu.replaceText(n), body: s.menu.replaceBody(n), ok: s.menu.replaceOk };
    }
    return null;
  })();

  if (winnerShown && t.status === 'finished')
    return (
      <div ref={root} data-table="sp" className="app-root absolute inset-0">
        <Winner
          table={t}
          me={me}
          names={realNames}
          faces={faces}
          host={view.me.host}
          act={act}
          onHome={() => spGo('')}
          onToast={showToast}
        />
        <ToastPill toast={toast} />
      </div>
    );

  const handNo = dn || 1;
  const pausedName = t.paused ? (SEATS.find((x) => !t.seats[x].who) ?? null) : null;
  const centreText = t.paused
    ? s.centre.pausedNoName
    : t.status === 'playing' &&
        t.phase === 'deal' &&
        !dealing &&
        me !== t.dealer &&
        t.dealer !== null
      ? s.centre.dealing(realNames[t.dealer])
      : null;

  const teamBar = <TeamBar lines={teamLines} className={pane ? 'flex-col' : ''} />;
  const header = (
    <header className="flex h-[52px] shrink-0 items-center gap-2 px-2">
      <IconButton chrome label={s.menu.open} onClick={() => setSheet('menu')}>
        {Icon.menu}
      </IconButton>
      <div className="min-w-0 flex-1 text-center">
        <h1 className="text-16 font-bold">{s.title.hand(handNo)}</h1>
        <p className="text-13 text-[var(--tx2)]">
          {s.title.table(t.code)} · {s.title.target(t.rules.target)}
        </p>
      </div>
      {pane ? (
        <span className="w-12" />
      ) : (
        <IconButton chrome label={s.menu.scoreboard} onClick={() => setSheet('board')}>
          {Icon.scores}
        </IconButton>
      )}
    </header>
  );

  const handZoneH = land ? 'h-[150px]' : big ? 'h-[220px]' : 'h-[calc(196px+var(--sab))]';
  const handZone = (
    <div ref={handBox} className={`relative shrink-0 ${handZoneH} ${live ? '' : 'opacity-60'}`}>
      {me !== null && inHand && (
        <Hand
          cards={myHand}
          count={left[me]}
          reveal={!!myHand && !dealing}
          handKey={String(dn)}
          sort={prefs.sort}
          playable={playable}
          myTurn={myTurn}
          trick={t.trick}
          broken={t.broken}
          onPlay={onPlay}
          onBlocked={(_c, w) => blocked(w)}
          deal={
            dealing && me !== null
              ? {
                  key: dealing.key,
                  from: dealing.from,
                  delays: dealDelays(dealing.dealer, me),
                  flight: DEAL.flight,
                }
              : null
          }
          returning={returning}
          width={handWidth}
          maxCw={land ? 56 : undefined}
          turnText={
            myTurn ? (secsLeft !== null ? s.hand.yourTurnSecs(secsLeft) : s.hand.yourTurn) : null
          }
        />
      )}
      <AnimatePresence>
        {gate && (
          <div key="gate" className="absolute inset-x-4 top-8 z-30">
            <LookGate
              disabled={!live || ctx.busy}
              onLook={() => void act({ type: 'look' })}
              onBlind={() => void act({ type: 'blindNil' })}
            />
          </div>
        )}
      </AnimatePresence>
      {me !== null && t.blind[me] && t.bids[me] === null && t.phase === 'bidding' && (
        <p className="absolute inset-x-4 top-2 z-30 text-center text-13 font-semibold text-[var(--gold-tx)]">
          {s.gate.blindSet}
        </p>
      )}
      {canDeal && sheet !== 'summary' && (
        <div className="absolute left-1/2 top-10 z-30 -translate-x-1/2">
          <HoldToDeal
            label={me === t.dealer ? s.deal.hold : s.deal.anyone}
            hint={me === t.dealer ? s.deal.holdHint : s.deal.anyoneHint(realNames[t.dealer ?? 0])}
            disabled={!live || ctx.busy}
            onDeal={deal}
          />
        </div>
      )}
      {me !== null && t.status === 'playing' && (
        <Reactions open={reactOpen} setOpen={setReactOpen} onSend={react} />
      )}
    </div>
  );

  const felt = (
    <Felt
      root={root}
      feltRef={feltRef}
      seats={seats}
      trick={
        plays.length
          ? {
              plays,
              leader,
              cut,
              sweepTo: sweeping && holding !== null ? t.tricks[holding].winner : null,
              onSwept,
              root,
            }
          : null
      }
      broken={t.broken}
      crack={crack}
      onCentre={() => setSheet('last')}
      centreLabel={s.centre.lastTrick}
      centreText={centreText}
      showChip={inHand}
    >
      {dealing && (
        <>
          <DealLayer
            key={dealing.key}
            dealer={dealing.dealer}
            me={me}
            root={root}
            dealerPhone={me === dealing.dealer}
            onDone={() => setDealing(null)}
          />
          <button
            type="button"
            aria-label={s.deal.skip}
            onClick={() => setDealing(null)}
            className="absolute inset-0 z-[5] cursor-default rounded-[inherit]"
          />
        </>
      )}
      <AnimatePresence>
        {showPad && (
          <div
            key="pad"
            className="pointer-events-none absolute inset-0 z-[8] grid place-items-center"
          >
            <BidPad
              allowed={allowedBids(me as Seat, t.bids, t.rules)}
              why={why}
              info={bidInfo}
              disabled={!live || ctx.busy}
              keys
              onBid={onBid}
              onBlocked={blocked}
            />
          </div>
        )}
      </AnimatePresence>
      {t.paused && view.me.host && pausedName !== null && (
        <div className="absolute left-1/2 top-[62%] z-[6] -translate-x-1/2">
          <button
            type="button"
            onClick={() => {
              setInviteSeat(pausedName);
              setSheet('invite');
            }}
            className="press mat-fill-s min-h-11 rounded-full px-4 text-15 font-bold"
          >
            {s.menu.inviteSeat}
          </button>
        </div>
      )}
      <Floats
        floats={floats}
        viewer={viewer}
        onDone={(id) => setFloats((f) => f.filter((x) => x.id !== id))}
      />
    </Felt>
  );

  return (
    <div ref={root} data-table="sp" className="app-root scr-bg absolute inset-0 overflow-hidden">
      <div
        ref={content}
        className={`grid h-full pt-[var(--sat)] ${pane ? (land ? 'grid-cols-[minmax(0,1fr)_15rem]' : 'grid-cols-[minmax(0,1fr)_22rem]') : 'grid-cols-1'}`}
      >
        <main className="flex min-h-0 flex-col" aria-label={s.title.hand(handNo)}>
          {!land && header}
          {!pane && <div className="shrink-0 px-2.5 pb-2">{teamBar}</div>}
          <div className="min-h-0 flex-1">{felt}</div>
          {handZone}
        </main>
        {pane && (
          <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto border-l border-[var(--hairline)] px-3 pb-[max(1rem,var(--sab))] pr-[max(0.75rem,var(--sar))]">
            {land && header}
            <div className={land ? '' : 'pt-3'}>{teamBar}</div>
            <BoardBody
              table={t}
              names={realNames}
              teamNames={teamNames}
              tricks={t.tricks.slice(0, eff)}
            />
          </aside>
        )}
      </div>

      {(ctx.status === 'reconnecting' || ctx.status === 'error') && (
        <div
          role="status"
          className="pointer-events-none absolute left-1/2 top-[calc(var(--sat)+3.5rem)] z-[50] -translate-x-1/2 rounded-full bg-[color-mix(in_srgb,var(--warning)_25%,var(--bg))] px-4 py-2 text-14 font-semibold"
        >
          {s.centre.reconnecting}
        </div>
      )}

      <AnimatePresence>
        {sheet === 'menu' && (
          <Sheet key="menu" title={s.menu.title} onClose={() => setSheet(null)}>
            <MenuBody
              a={{
                board: () => setSheet('board'),
                last: () => setSheet('last'),
                prefs: () => setSheet('prefs'),
                keys: () => setSheet('keys'),
                leave: () => setConfirm('leave'),
                host: view.me.host
                  ? {
                      end: () => setConfirm('end'),
                      draw: () => setConfirm('draw'),
                      cancel: () => setConfirm('cancel'),
                      replace: awaySeats,
                      canReplace: t.trick.length === 0 && !t.paused,
                      onReplace: (x) => setConfirm({ replace: x }),
                    }
                  : null,
              }}
            />
          </Sheet>
        )}
        {sheet === 'prefs' && (
          <Sheet key="prefs" title={s.prefs.title} onClose={() => setSheet(null)}>
            <PrefsBody />
          </Sheet>
        )}
        {sheet === 'board' && (
          <Sheet key="board" title={s.board.title} roomy="board" onClose={() => setSheet(null)}>
            <BoardBody
              table={t}
              names={realNames}
              teamNames={teamNames}
              tricks={t.tricks.slice(0, eff)}
            />
          </Sheet>
        )}
        {sheet === 'last' && (
          <Sheet key="last" title={s.centre.lastTrickTitle} onClose={() => setSheet(null)}>
            <LastTrickBody trick={lastTrick(t)} names={realNames} />
          </Sheet>
        )}
        {sheet === 'keys' && (
          <Sheet key="keys" title={s.keys.title} onClose={() => setSheet(null)}>
            <KeysBody />
          </Sheet>
        )}
        {sheet === 'summary' && last && (
          <Sheet
            key="summary"
            title={s.summary.title(t.history.length)}
            full
            onClose={closeSummary}
          >
            <HandSummary
              handNo={t.history.length}
              hand={last}
              bagsBefore={{ a: prior.a.bags, b: prior.b.bags }}
              before={{ a: prior.a.score, b: prior.b.score }}
              after={after}
              names={realNames}
              teamNames={teamNames}
              verdict={verdict}
              tricks={last.tricks ?? null}
              footer={summaryFooter}
            />
          </Sheet>
        )}
        {sheet === 'invite' && inviteSeat !== null && (
          <TableInviteSheet
            key="invite"
            title={s.menu.inviteTitle(
              realNames[inviteSeat] === s.seat.empty ? '' : realNames[inviteSeat],
            )}
            subtitle={s.menu.inviteSub}
            exclude={t.seats.flatMap((x) => (x.who ? [x.who.userId] : []))}
            onClose={() => setSheet(null)}
            onPick={async (u) => {
              await seatEp.create(t.id, { userId: u.userId, seat: String(inviteSeat) });
              showToast(s.toast.invited(u.name));
              setSheet(null);
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {confirm && confirmText && (
          <Modal
            key="confirm"
            text={confirmText.text}
            body={confirmText.body}
            ok={confirmText.ok}
            cancel={s.menu.keep}
            danger={confirm !== 'leave'}
            onOk={() => void doConfirm()}
            onCancel={() => setConfirm(null)}
          />
        )}
      </AnimatePresence>
      <ToastPill toast={toast} />
      <p aria-live="polite" className="sr-only">
        {said}
      </p>
      {flight.node}
    </div>
  );
}

function Wide({
  label,
  onClick,
  accent,
}: {
  label: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`press relative isolate min-h-[52px] w-full rounded-[16px] px-5 text-16 font-bold ${accent ? 'mat-cta mat-cta-on mat-tone-accent text-ink-on-accent' : 'mat-fill-s'}`}
    >
      {accent && <span aria-hidden className="mat-fill absolute inset-0 -z-10 rounded-[inherit]" />}
      {label}
    </button>
  );
}

function ToastPill({ toast }: { toast: Toast | null }) {
  const rm = useReducedMotion();
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute inset-x-0 top-[calc(var(--sat)+0.375rem)] z-[70] grid justify-items-center px-14"
    >
      <AnimatePresence>
        {toast && (
          <m.div
            key={toast.id}
            initial={rm ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.9 }}
            animate={rm ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: rm ? 0 : -10 }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
            className="mat-toast col-start-1 row-start-1 flex min-h-11 max-w-full items-center rounded-full px-4 py-1.5 text-15 font-semibold leading-tight [text-wrap:balance]"
          >
            {toast.msg}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Reactions({
  open,
  setOpen,
  onSend,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  onSend: (emoji: string) => void;
}) {
  const rm = useReducedMotion();
  return (
    <>
      <button
        type="button"
        aria-label={open ? s.reactions.close : s.reactions.open}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="press absolute -top-[50px] right-3 z-[9] grid h-11 w-11 place-items-center rounded-full border border-[var(--hairline-2)] bg-[color-mix(in_srgb,var(--bg)_60%,transparent)] text-20"
      >
        ☺
      </button>
      <AnimatePresence>
        {open && (
          <m.div
            role="group"
            aria-label={s.reactions.group}
            initial={rm ? { opacity: 0 } : { opacity: 0, scale: 0.9, x: 12 }}
            animate={rm ? { opacity: 1 } : { opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 520, damping: 30 }}
            className="mat-sheet absolute -top-[52px] right-[60px] z-[9] flex origin-right gap-0.5 rounded-full p-[3px]"
          >
            {REACTIONS.map((e) => (
              <button
                key={e}
                type="button"
                aria-label={s.reactions.send(e)}
                onClick={() => onSend(e)}
                className="press grid h-11 w-11 place-items-center rounded-full text-22"
              >
                {e}
              </button>
            ))}
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}

const FLOAT_AT: Record<number, string> = {
  0: 'left-1/2 top-[80%]',
  1: 'left-[15%] top-[40%]',
  2: 'left-1/2 top-[8%]',
  3: 'left-[85%] top-[40%]',
};

/** Reactions float up from the sender's seat and fade. */
function Floats({
  floats,
  viewer,
  onDone,
}: {
  floats: Float[];
  viewer: Seat;
  onDone: (id: number) => void;
}) {
  const rm = useReducedMotion();
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[9]">
      {floats.map((f) => (
        <m.span
          key={f.id}
          className={`absolute -ml-4 -mt-5 text-[32px] ${FLOAT_AT[placeOf(f.seat, viewer)]}`}
          initial={rm ? { opacity: 0 } : { opacity: 0, y: 0, scale: 0.5 }}
          animate={
            rm
              ? { opacity: [0, 1, 0] }
              : {
                  opacity: [0, 1, 0],
                  y: [0, -30, -100],
                  x: [0, 0, (f.id % 40) - 20],
                  scale: [0.5, 1.4, 1],
                }
          }
          transition={{ duration: rm ? 1.2 : 1.6, times: [0, 0.25, 1], ease: [0.32, 0.72, 0, 1] }}
          onAnimationComplete={() => onDone(f.id)}
        >
          {f.emoji}
        </m.span>
      ))}
    </div>
  );
}
