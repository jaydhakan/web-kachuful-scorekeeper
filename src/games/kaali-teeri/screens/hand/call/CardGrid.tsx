import { m } from 'framer-motion';
import type { ReactNode } from 'react';
import {
  RANKS,
  SUITS,
  type CardRef,
  type Copy,
  type Rank,
  type Suit,
} from '@/games/kaali-teeri/domain';
import { cardText, ktBidding } from '@/games/kaali-teeri/strings/bidding';
import { isRed } from '@/lib/cards';
import { TR } from '@/theme/trumps';
import { PRESS_SM, SPRING_POP } from '@/components/ui/motion';
import { cardOption, rankOpen, suitOpen } from './options';

export interface Draft {
  rank: Rank | null;
  suit: Suit | null;
  copy: Copy | null;
}

export const EMPTY_DRAFT: Draft = { rank: null, suit: null, copy: null };

/** The finished card, or null while the draft still needs a rank, a suit, or (two decks) a copy that can be called. */
export function draftCard(d: Draft, called: CardRef[], n: number): CardRef | null {
  if (!d.rank || !d.suit) return null;
  const o = cardOption(d.rank, d.suit, called, n);
  if (o.why) return null;
  if (!o.needsCopy) return { rank: d.rank, suit: d.suit };
  return d.copy !== null && o.copies.includes(d.copy)
    ? { rank: d.rank, suit: d.suit, copy: d.copy }
    : null;
}

const COPIES: Copy[] = [1, 2, 'other'];

/** A suit glyph's colour on a key: red or the text colour, and the selection's ink once picked (pink on pink fails). */
export const suitColor = (suit: Suit, on: boolean) =>
  on ? undefined : isRed(suit) ? 'var(--suit-red-ui)' : 'var(--tx)';
const s = ktBidding.call;

function Key({
  on,
  off,
  label,
  why,
  layoutId,
  onPick,
  onRefuse,
  className = '',
  children,
}: {
  on: boolean;
  off: boolean;
  label?: string;
  why?: string;
  layoutId: string;
  onPick: () => void;
  onRefuse: (why: string) => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <m.button
      type="button"
      aria-pressed={on}
      aria-disabled={off || undefined}
      aria-label={label}
      title={off ? why : undefined}
      whileTap={off ? undefined : PRESS_SM}
      onClick={() => (off ? onRefuse(why ?? '') : onPick())}
      className={`relative grid min-h-12 min-w-11 place-items-center rounded-[18px] font-bold ${off ? 'mat-key-no' : 'mat-key'} ${on ? 'text-ink-on-accent' : ''} ${className}`}
    >
      {on && (
        <m.span
          layoutId={layoutId}
          transition={SPRING_POP}
          aria-hidden
          className="mat-key-on absolute inset-0 rounded-[18px]"
        />
      )}
      <span className="relative">{children}</span>
    </m.button>
  );
}

const Label = ({ children, first }: { children: ReactNode; first?: boolean }) => (
  <h3 className={`mono-label mb-2 px-1 text-12 text-[var(--accent)] ${first ? '' : 'mt-4'}`}>
    {children}
  </h3>
);

interface CardGridProps {
  uid: string;
  n: number;
  /** The cards already called, against which this one is checked (without the card being changed). */
  called: CardRef[];
  draft: Draft;
  onDraft: (d: Draft) => void;
  /** Why a tapped option can't be used, for the status line; null clears it. */
  onWhy: (why: string | null) => void;
}

/** Rank, then suit, then (both copies in play) which copy: every option the rules rule out is disabled with a reason. */
export function CardGrid({ uid, n, called, draft, onDraft, onWhy }: CardGridProps) {
  const opt = draft.rank && draft.suit ? cardOption(draft.rank, draft.suit, called, n) : null;
  const pick = (d: Draft) => {
    onWhy(null);
    onDraft(d);
  };
  const whyCard = (rank: Rank, suit: Suit) => {
    const o = cardOption(rank, suit, called, n);
    return o.why === 'out'
      ? s.out(cardText(rank, suit))
      : o.why
        ? s.called(cardText(rank, suit))
        : null;
  };
  return (
    <div>
      <Label first>{s.rank}</Label>
      <div role="group" aria-label={s.rank} className="grid grid-cols-7 gap-1.5">
        {RANKS.map((r) => {
          const why = draft.suit
            ? whyCard(r, draft.suit)
            : rankOpen(r, called, n)
              ? null
              : s.allOut(r);
          return (
            <Key
              key={r}
              on={draft.rank === r}
              off={!!why}
              why={why ?? undefined}
              layoutId={uid + 'rank'}
              onPick={() => pick({ ...draft, rank: r, copy: null })}
              onRefuse={onWhy}
              className="disp text-20"
            >
              {r}
            </Key>
          );
        })}
      </div>
      <Label>{s.suit}</Label>
      <div role="group" aria-label={s.suit} className="grid grid-cols-4 gap-2">
        {SUITS.map((st) => {
          const why = draft.rank
            ? whyCard(draft.rank, st)
            : suitOpen(st, called, n)
              ? null
              : s.allOut(TR[st].name);
          const on = draft.suit === st;
          return (
            <Key
              key={st}
              on={on}
              off={!!why}
              why={why ?? undefined}
              label={TR[st].name}
              layoutId={uid + 'suit'}
              onPick={() => pick({ ...draft, suit: st, copy: null })}
              onRefuse={onWhy}
              className="min-h-14 text-28 leading-none"
            >
              <span aria-hidden style={{ color: suitColor(st, on) }}>
                {TR[st].sym}
              </span>
            </Key>
          );
        })}
      </div>
      {opt?.needsCopy && !opt.why && (
        <>
          <Label>{s.copy}</Label>
          <div role="group" aria-label={s.copy} className="grid grid-cols-3 gap-2">
            {COPIES.map((c) => {
              const off = !opt.copies.includes(c);
              return (
                <Key
                  key={String(c)}
                  on={draft.copy === c}
                  off={off}
                  why={off ? s.copyTaken(s.copies[c]) : undefined}
                  layoutId={uid + 'copy'}
                  onPick={() => pick({ ...draft, copy: c })}
                  onRefuse={onWhy}
                  className="px-2 py-1.5 text-15 leading-tight"
                >
                  {s.copies[c]}
                </Key>
              );
            })}
          </div>
          <p className="mt-2 px-1 text-13 leading-[1.35] text-[var(--tx2)]">
            {draft.copy === 'other' ? s.otherHint : s.copyHint}
          </p>
        </>
      )}
    </div>
  );
}
