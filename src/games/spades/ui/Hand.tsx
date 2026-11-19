import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { cardId, displaySort, rankValue, sameCard } from '@/games/spades/domain/cards';
import { playProblem, type PlayProblem } from '@/games/spades/domain/legal';
import { ledSuit } from '@/games/spades/domain/trick';
import type { Card, Play, Suit } from '@/games/spades/domain/types';
import { play as s } from '@/games/spades/strings/play';
import { anim, boxOf, mid, OUT, reducedMotion, type Box } from './fx';
import { CARD_RATIO, LIFT, NUDGE, fanLayout, indexSize, strip } from './fan';
import { SpCard, cardName } from './SpCard';

export type SortOrder = 'up' | 'down';

/** Suits in the display order (colours alternate, spades on the right), ranks low to high or high to low. */
export function sortHand(cards: readonly Card[], order: SortOrder): Card[] {
  const up = displaySort(cards);
  if (order === 'up') return up;
  const bySuit = new Map<Suit, Card[]>();
  for (const c of up) bySuit.set(c.suit, [...(bySuit.get(c.suit) ?? []), c]);
  return [...bySuit.values()].flatMap((cs) =>
    cs.slice().sort((a, b) => rankValue(b) - rankValue(a)),
  );
}

/** Why a card can't be played right now, as the toast says it. */
export function problemText(p: PlayProblem, trick: readonly Play[]): string {
  const led = ledSuit(trick);
  return p === 'must-follow' && led ? s.hand.cant['must-follow'](led) : (s.hand.cant[p] as string);
}
function problemAria(p: PlayProblem, trick: readonly Play[]): string {
  const led = ledSuit(trick);
  return p === 'must-follow' && led
    ? s.hand.cantAria['must-follow'](led)
    : (s.hand.cantAria[p] as string);
}

/** Drag a card at least this far up (px) and it is played on release. */
export const PLAY_DRAG = 70;
/** Movement before a press becomes a drag. */
const SLOP = 8;
/** The flip runs left to right this far apart (ms), then the hand sorts. */
const FLIP_GAP = 45;

export interface HandDeal {
  /** Bumps once per deal: a new key replays the landing. */
  key: number;
  /** Where the deck sits, in viewport coordinates. */
  from: Box | null;
  /** Each card's start (ms from now), in the order the cards are given. */
  delays: number[];
  /** How long one card's flight takes. */
  flight: number;
}

export interface HandProps {
  /** The cards, in the server's order; null while they are hidden from this phone (the Blind Nil gate). */
  cards: Card[] | null;
  /** How many backs to show while `cards` is null. */
  count: number;
  /** Face up: false until the deal lands, while the Look gate waits, and through a Blind Nil. */
  reveal: boolean;
  /** Changes once per hand: the order resets to the deal's and sorts again after the flip. */
  handKey: string;
  sort: SortOrder;
  /** It's this phone's turn to play and the table is live: legal cards can be played. */
  playable: boolean;
  /** Lifts the hand and lights it: this phone's turn (bid or play). */
  myTurn: boolean;
  trick: readonly Play[];
  broken: boolean;
  onPlay: (card: Card, from: Box) => void;
  /** A refused tap: the parent says why (toast) and buzzes; the card shakes here. */
  onBlocked: (card: Card, why: string) => void;
  deal?: HandDeal | null;
  /** A card the server refused, flying back into the hand from where it was shown. */
  returning?: { card: Card; from: Box; key: number } | null;
  /** The hand's width in px (the parent measures it) and the tallest card the space allows. */
  width: number;
  maxCw?: number;
  /** Shown under the fan: "YOUR TURN · 24s". */
  turnText?: ReactNode;
}

interface Drag {
  id: number;
  x0: number;
  y0: number;
  moved: boolean;
  dx: number;
  dy: number;
}

/**
 * Your 13 cards in an arc that always fits (plan §10). Tap lifts a card and a second tap plays it; or drag it up past
 * the line, the card following the finger 1:1 from where it was grabbed and springing back if let go early. Illegal
 * cards are dimmed and say why. Arrow keys move along the hand and Enter plays: one roving tab stop.
 */
export function Hand({
  cards,
  count,
  reveal,
  handKey,
  sort,
  playable,
  myTurn,
  trick,
  broken,
  onPlay,
  onBlocked,
  deal,
  returning,
  width,
  maxCw,
  turnText,
}: HandProps) {
  const [sorted, setSorted] = useState(false);
  const [upTo, setUpTo] = useState(0);
  const [lifted, setLifted] = useState<string | null>(null);
  const [focus, setFocus] = useState(0);
  const nodes = useRef(new Map<string, HTMLButtonElement>());
  const drag = useRef<Drag | null>(null);
  const keyRef = useRef(handKey);
  const first = useRef(true);

  // A new hand starts in the deal's order, face down, and sorts after it turns over (a mount shows it settled).
  if (keyRef.current !== handKey) {
    keyRef.current = handKey;
    setSorted(false);
    setUpTo(0);
    setLifted(null);
  }

  const n = cards ? cards.length : count;
  useEffect(() => {
    const instant = first.current || reducedMotion();
    first.current = false;
    if (!reveal || !cards) return;
    if (instant) {
      setUpTo(cards.length);
      setSorted(true);
      return;
    }
    if (sorted) return;
    // Every card turns in this one render; each waits its turn in CSS (flipDelay), so nothing re-renders 13 times.
    setUpTo(cards.length);
    const done = setTimeout(() => setSorted(true), cards.length * FLIP_GAP + 450);
    return () => clearTimeout(done);
    // Runs when the cards become visible or a new hand arrives; card removals don't restart the turn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal, !!cards, handKey]);

  const shown = useMemo<(Card | null)[]>(() => {
    if (!cards) return Array.from({ length: count }, () => null);
    return sorted ? sortHand(cards, sort) : cards;
  }, [cards, count, sorted, sort]);
  const fan = useMemo(() => fanLayout(shown.length, width, maxCw), [shown.length, width, maxCw]);
  const ch = fan.cw * CARD_RATIO;
  // One rank size for the whole hand, set by its tightest strip, so no card's index is half-covered.
  const ixSize = indexSize(fan.cw, strip(fan, 0));

  const problems = useMemo(() => {
    const m = new Map<string, PlayProblem>();
    if (!cards || !playable) return m;
    for (const c of cards) {
      const p = playProblem(c, cards, trick, broken);
      if (p) m.set(cardId(c), p);
    }
    return m;
  }, [cards, playable, trick, broken]);

  // Nothing stays lifted once it isn't this phone's turn, or the lifted card has gone.
  useEffect(() => {
    if (!playable || (lifted && !cards?.some((c) => cardId(c) === lifted))) setLifted(null);
  }, [playable, cards, lifted]);

  const keyOf = (c: Card | null, i: number) => (c ? cardId(c) : `b${i}`);
  // When some cards can't be played, the ones that can sit a little higher: the lift says "yours", not the grey.
  const raised = (c: Card | null) => !!c && playable && problems.size > 0 && !problems.has(cardId(c));
  const base = (i: number, lift: boolean, up = false) => {
    const p = fan.slots[i];
    if (!p) return 'none';
    const y = p.y - (lift ? LIFT : 0) - (up ? NUDGE : 0);
    return `translate(${p.x}px, ${y}px) rotate(${p.r}deg)`;
  };

  // The deal: each card flies in from the deck to its place, face down, at its turn in the deal.
  useLayoutEffect(() => {
    if (!deal?.from) return;
    const from = mid(deal.from);
    const running = shown.map((c, i) => {
      const el = nodes.current.get(keyOf(c, i));
      const p = fan.slots[i];
      if (!el || !p) return null;
      const box = boxOf(el);
      const at = mid(box);
      const dx = from.x - at.x,
        dy = from.y - at.y;
      const spin = ((i * 37) % 80) - 40;
      return anim(
        el,
        [
          {
            transform: `translate(${p.x + dx}px, ${p.y + dy}px) rotate(${spin}deg) scale(0.8)`,
            opacity: 0,
          },
          {
            transform: `translate(${p.x + dx}px, ${p.y + dy}px) rotate(${spin}deg) scale(0.8)`,
            opacity: 1,
            offset: 0.02,
          },
          { transform: base(i, false), opacity: 1 },
        ],
        { duration: deal.flight, delay: deal.delays[i] ?? 0, easing: OUT, fill: 'backwards' },
      );
    });
    return () => running.forEach((r) => r?.cancel());
    // One landing per deal; the layout is read from the DOM as it starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal?.key]);

  // A refused card flies back to its place from wherever the table showed it.
  useLayoutEffect(() => {
    if (!returning) return;
    const i = shown.findIndex((c) => c && sameCard(c, returning.card));
    const el = nodes.current.get(cardId(returning.card));
    if (i < 0 || !el) return;
    const at = mid(boxOf(el)),
      from = mid(returning.from);
    const p = fan.slots[i];
    const a = anim(
      el,
      [
        { transform: `translate(${p.x + from.x - at.x}px, ${p.y + from.y - at.y}px) rotate(0deg)` },
        { transform: base(i, false) },
      ],
      { duration: 420, easing: OUT },
    );
    return () => a.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returning?.key]);

  const tryPlay = (c: Card, el: HTMLElement) => {
    const p = problems.get(cardId(c));
    if (p) return blocked(c, p, el);
    setLifted(null);
    onPlay(c, boxOf(el));
  };
  const blocked = (c: Card, p: PlayProblem, el: HTMLElement) => {
    const tf = el.style.transform;
    anim(
      el,
      [
        { transform: tf },
        { transform: `${tf} translateX(-6px)` },
        { transform: `${tf} translateX(6px)` },
        { transform: tf },
      ],
      { duration: 260 },
    );
    onBlocked(c, problemText(p, trick));
  };

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>, c: Card | null) => {
    if (!c || !playable || problems.has(cardId(c)) || drag.current) return;
    drag.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, moved: false, dx: 0, dy: 0 };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLButtonElement>, i: number) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    d.dx = e.clientX - d.x0;
    d.dy = e.clientY - d.y0;
    if (!d.moved && Math.hypot(d.dx, d.dy) > SLOP) {
      d.moved = true;
      e.currentTarget.dataset.drag = '';
    }
    if (!d.moved) return;
    const p = fan.slots[i];
    // 1:1 with the finger from where it was grabbed; down past the arc it stops, so it can't hide under the edge.
    e.currentTarget.style.transform = `translate(${p.x + d.dx}px, ${p.y + Math.min(0, d.dy)}px) rotate(${p.r * 0.3}deg) scale(1.06)`;
  };
  const onPointerUp = (e: PointerEvent<HTMLButtonElement>, c: Card | null, i: number) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    const el = e.currentTarget;
    delete el.dataset.drag;
    if (!d.moved) return;
    // Swallow the click that follows a drag.
    el.dataset.dragged = '';
    if (c && d.dy < -PLAY_DRAG) return tryPlay(c, el);
    el.style.transform = base(i, lifted === (c && cardId(c)), raised(c));
  };

  const onClick = (c: Card | null, el: HTMLButtonElement) => {
    if (el.dataset.dragged !== undefined) {
      delete el.dataset.dragged;
      return;
    }
    if (!c || !playable) return;
    const p = problems.get(cardId(c));
    if (p) return blocked(c, p, el);
    if (lifted === cardId(c)) return tryPlay(c, el);
    setLifted(cardId(c));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, c: Card | null, i: number) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const move = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (move) {
      e.preventDefault();
      const to = Math.max(0, Math.min(shown.length - 1, i + move));
      nodes.current.get(keyOf(shown[to], to))?.focus();
      return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && c && playable) {
      e.preventDefault();
      tryPlay(c, e.currentTarget);
    }
  };

  const stop = Math.min(focus, Math.max(0, n - 1));
  return (
    <div className="relative h-full w-full" data-hand>
      <div
        aria-hidden
        className={`sp-glow pointer-events-none absolute inset-x-[10%] top-[30px] h-[110px] rounded-[50%] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--accent)_35%,transparent),transparent)] ${myTurn ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        role="group"
        aria-label={s.hand.label}
        className="sp-fan absolute inset-x-0 top-0"
        style={{
          height: ch + 40,
          transform: myTurn ? 'translateY(-6px)' : 'none',
        }}
      >
        {shown.map((c, i) => {
          const id = keyOf(c, i);
          const lift = !!c && lifted === cardId(c);
          const p = c ? problems.get(cardId(c)) : undefined;
          const up = reveal && !!c && (sorted || i < upTo);
          const label =
            !c || !up ? s.hand.faceDown : cardName(c) + (p ? `, ${problemAria(p, trick)}` : '');
          return (
            <button
              key={id}
              ref={(el) => {
                if (el) nodes.current.set(id, el);
                else nodes.current.delete(id);
              }}
              type="button"
              data-card-id={c ? id : undefined}
              aria-label={label}
              aria-disabled={!!p || undefined}
              tabIndex={i === stop ? 0 : -1}
              onFocus={() => setFocus(i)}
              onPointerDown={(e) => onPointerDown(e, c)}
              onPointerMove={(e) => onPointerMove(e, i)}
              onPointerUp={(e) => onPointerUp(e, c, i)}
              onPointerCancel={(e) => onPointerUp(e, null, i)}
              onClick={(e) => onClick(c, e.currentTarget)}
              onKeyDown={(e) => onKeyDown(e, c, i)}
              className="sp-hc absolute left-0 top-0 touch-none rounded-[11%_/_7.9%] outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus)]"
              style={{
                width: fan.cw,
                height: ch,
                zIndex: lift ? 40 : i + 1,
                transform: base(i, lift, raised(c)),
              }}
            >
              <SpCard
                card={c}
                down={!up}
                size="hand"
                index={ixSize}
                flipDelay={up && !sorted ? i * FLIP_GAP : 0}
                className="w-full"
              />
              <span
                aria-hidden
                className={`sp-dim pointer-events-none absolute inset-0 rounded-[inherit] bg-[color-mix(in_srgb,var(--shade)_28%,transparent)] ${p ? 'opacity-100' : 'opacity-0'}`}
              />
              {lift && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[0_0_0_2.5px_var(--accent),0_12px_24px_-4px_color-mix(in_srgb,var(--shade)_45%,transparent)]"
                />
              )}
            </button>
          );
        })}
      </div>
      <p
        aria-hidden={!turnText}
        className={`pointer-events-none absolute inset-x-0 text-center text-13 font-bold tracking-[0.02em] text-[var(--accent-tx)] transition-opacity duration-300 ${turnText ? 'opacity-100' : 'opacity-0'}`}
        style={{ top: ch + 30 }}
      >
        {turnText ?? s.hand.yourTurn}
      </p>
    </div>
  );
}
