import { AnimatePresence, m } from 'framer-motion';
import type { CardRef } from '@/games/kaali-teeri/domain';
import { cardText, ktBidding } from '@/games/kaali-teeri/strings/bidding';
import { Icon } from '@/components/ui/Icons';
import { PlayingCard, type CardSize } from '@/components/ui/PlayingCard';
import { PRESS, PRESS_SM, SPRING, SPRING_POP } from '@/components/ui/motion';
import { SOLID } from '../bidding/BidTable';
import type { Draft } from './CardGrid';

const s = ktBidding.call;
const W: Record<CardSize, string> = { xs: 'w-8', sm: 'w-12', md: 'w-[4.5rem]', lg: 'w-28' };

interface SlotsProps {
  count: number;
  called: CardRef[];
  draft: Draft;
  onRemove: (i: number) => void;
  /** Change a called card (rank, suit or copy). */
  onOpen: (i: number) => void;
}

/** One place per partner card: the called cards face up, the one being picked outlined, the rest waiting. */
export function Slots({ count, called, draft, onRemove, onOpen }: SlotsProps) {
  const size: CardSize = count <= 2 ? 'lg' : 'md';
  return (
    <ol
      className={`flex flex-wrap justify-center gap-y-2 pt-3 ${count > 2 ? 'gap-x-2' : 'gap-x-4'}`}
    >
      {Array.from({ length: count }, (_, k) => {
        const c = called[k];
        const active = !c && k === called.length;
        const note = c
          ? c.copy !== undefined
            ? s.copies[c.copy]
            : null
          : active
            ? s.picking
            : null;
        return (
          <li
            key={k}
            className={`flex flex-col items-center gap-1.5 ${count > 2 ? 'w-[4.5rem]' : 'w-28'}`}
          >
            <div className={`relative ${W[size]} aspect-[5/7]`}>
              <AnimatePresence mode="popLayout" initial={false}>
                {c ? (
                  <m.button
                    key={cardText(c.rank, c.suit) + String(c.copy)}
                    type="button"
                    aria-label={s.change(cardText(c.rank, c.suit))}
                    initial={{ opacity: 0, scale: 0.85, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={SPRING}
                    whileTap={PRESS}
                    onClick={() => onOpen(k)}
                    className="absolute inset-0"
                    style={{ borderRadius: 8 }}
                  >
                    <PlayingCard rank={c.rank} suit={c.suit} size={size} />
                  </m.button>
                ) : (
                  <m.div
                    key="empty"
                    aria-label={s.empty(k + 1)}
                    role="img"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 grid place-items-center border-2 border-dashed border-ov/25"
                    style={{ borderRadius: 8, ...(active ? { borderColor: 'var(--accent)' } : {}) }}
                  >
                    {active && draft.rank && draft.suit ? (
                      <PlayingCard
                        rank={draft.rank}
                        suit={draft.suit}
                        size={size}
                        className="opacity-60"
                      />
                    ) : (
                      <span aria-hidden className="disp text-28 font-bold text-[var(--tx2)]">
                        ?
                      </span>
                    )}
                  </m.div>
                )}
              </AnimatePresence>
              {c && (
                <m.button
                  type="button"
                  aria-label={s.remove(cardText(c.rank, c.suit))}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={SPRING_POP}
                  whileTap={PRESS_SM}
                  onClick={() => onRemove(k)}
                  className="absolute z-[2] grid h-11 w-11 place-items-center"
                  style={{ top: -16, right: -16 }}
                >
                  <span
                    className="grid h-8 w-8 place-items-center rounded-full text-[var(--tx)] [&_svg]:h-4 [&_svg]:w-4"
                    style={SOLID}
                  >
                    {Icon.close}
                  </span>
                </m.button>
              )}
            </div>
            <span className="flex flex-col items-center text-center leading-4">
              <span className={`text-14 font-bold ${c ? '' : 'text-[var(--tx2)]'}`}>
                {s.slot(k + 1)}
              </span>
              {note && (
                <span
                  className={`text-13 font-medium ${active ? 'text-[var(--accent-tx)]' : 'text-[var(--tx2)]'}`}
                >
                  {note}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
