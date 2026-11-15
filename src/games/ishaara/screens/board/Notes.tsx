import { m } from 'framer-motion';
import type { Identity, Team } from '@/games/ishaara/domain';
import { table as s } from '@/games/ishaara/strings/table';
import { Icon } from '@/components/ui/Icons';
import { EASE } from '@/components/ui/motion';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { FACE, Mark } from './marks';
import type { Notice } from './useBoard';

const b = s.board;
const IN = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0 } };

/** "Guess DOSA?" with Cancel and Confirm: the shared screen's version of touching a card. */
export function ConfirmBar({
  word,
  canSend,
  onCancel,
  onConfirm,
  compact,
}: {
  word: string;
  canSend: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  compact?: boolean;
}) {
  const w = word.toUpperCase();
  return (
    <m.div
      {...IN}
      className={`glass flex gap-3 p-3 pl-4 ${compact ? 'flex-col pl-3' : 'items-center'}`}
    >
      <p className="min-w-0 flex-1 text-17 font-bold leading-tight dt:text-22">{b.guessAsk(w)}</p>
      <div className="flex shrink-0 gap-2">
        <PrimaryButton tone="glass" onClick={onCancel} className="!h-12 px-5 !text-16">
          {b.cancel}
        </PrimaryButton>
        <PrimaryButton
          onClick={onConfirm}
          disabled={!canSend}
          className="!h-12 flex-1 px-6 !text-16"
        >
          {b.confirm}
        </PrimaryButton>
      </div>
    </m.div>
  );
}

export type Moment = {
  kind: 'own' | 'other' | 'blank' | 'trap' | 'penalty';
  card: number;
  word: string;
  /** The team that picked (or, for a penalty, the team the word was revealed for). */
  team: Team;
  id: Identity;
};

export function momentText(mo: Moment): string {
  const w = mo.word.toUpperCase();
  switch (mo.kind) {
    case 'own':
      return b.reveal.own(w, mo.team);
    case 'other':
      return b.reveal.other(w, mo.id as Team);
    case 'blank':
      return b.reveal.blank(w);
    case 'trap':
      return b.reveal.trap(w);
    case 'penalty':
      return b.reveal.penalty(w, mo.team);
  }
}

/** The reveal moment: the card's own colour and shape with what it means, for a couple of seconds. */
export function MomentNote({ mo }: { mo: Moment }) {
  return (
    <m.p
      {...IN}
      className={`flex min-h-14 items-center gap-3 rounded-[18px] px-5 py-3 text-17 font-extrabold uppercase leading-tight dt:text-22 ${FACE[mo.id]}`}
    >
      <Mark id={mo.id} className="h-5 w-5" />
      <span className="min-w-0 flex-1">{momentText(mo)}</span>
    </m.p>
  );
}

/** A turn that ended without a card turning: time ran out, End turn, an undo or a skipped penalty. */
export function NoticeNote({ n, next }: { n: Notice; next: Team }) {
  return (
    <m.p
      {...IN}
      role="status"
      className={`flex min-h-14 items-center gap-3 rounded-[18px] px-5 py-3 text-17 font-bold leading-tight dt:text-22 ${n.kind === 'timeout' ? 'glass text-[var(--warn)]' : 'glass'}`}
    >
      <span aria-hidden className="[&_svg]:h-5 [&_svg]:w-5">
        {n.kind === 'undo' ? Icon.undo : Icon.history}
      </span>
      <span className="min-w-0 flex-1">{b.notice.line(n.kind, next, n.word)}</span>
    </m.p>
  );
}

/**
 * The game's last card: the trap, or the last word found. It holds over the board (the trap until "See the
 * result", a win a few seconds) on the side away from the card, so the card and the turned key stay in view.
 */
export function EndNote({
  mo,
  winner,
  found,
  top,
  onDone,
}: {
  mo: Moment;
  winner: Team | null;
  found: number;
  top: boolean;
  onDone: () => void;
}) {
  const trap = mo.kind === 'trap';
  return (
    <m.div
      initial={{ opacity: 0, y: top ? -12 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: EASE, delay: trap ? 0.5 : 0.3 }}
      role="status"
      className={`absolute inset-x-2 z-20 mx-auto flex max-w-[30rem] flex-col gap-3 rounded-[24px] bg-[var(--sheet-bg)] p-4 shadow-xl dt:max-w-[40rem] dt:p-6 ${top ? 'top-2' : 'bottom-2'}`}
    >
      <p
        className={`flex min-h-14 items-center gap-3 rounded-[18px] px-4 py-3 text-19 font-extrabold uppercase leading-tight dt:text-28 ${FACE[trap ? 'trap' : (winner ?? mo.id)]}`}
      >
        <Mark id={trap ? 'trap' : (winner ?? mo.id)} className="h-6 w-6" />
        <span className="min-w-0 flex-1">
          {trap ? momentText(mo) : winner ? s.win.wins(winner) : momentText(mo)}
        </span>
      </p>
      <p className="text-16 text-[var(--tx2)] dt:text-19">
        {trap
          ? b.reveal.trapBody(mo.team, mo.word.toUpperCase())
          : winner
            ? s.win.how('all-found', winner, found, null)
            : momentText(mo)}
      </p>
      <PrimaryButton onClick={onDone} className="w-full">
        {b.reveal.seeResult}
      </PrimaryButton>
    </m.div>
  );
}

/** §2.2: the other team's clue-giver picks a free word; the host may skip after a minute. */
export function PenaltyNote({
  name,
  picker,
  skipIn,
  canSend,
  onSkip,
}: {
  name: string;
  picker: Team;
  /** Ms until Skip opens; 0 or less once it may be tapped. */
  skipIn: number;
  canSend: boolean;
  onSkip: () => void;
}) {
  const open = skipIn <= 0;
  return (
    <m.div {...IN} className="glass flex flex-col gap-3 p-4">
      <p className="flex items-start gap-2 text-17 font-bold leading-snug">
        <Mark id={picker} className="mt-1 h-4 w-4" />
        {b.penalty(name, picker)}
      </p>
      <p className="text-15 text-[var(--tx2)]">
        {b.penaltyWhy(picker === 'sun' ? 'moon' : 'sun')} {open && b.skipWhy}
      </p>
      <PrimaryButton
        tone="glass"
        onClick={onSkip}
        disabled={!open || !canSend}
        className="!h-12 w-full !text-16"
      >
        {open ? b.skip : b.skipIn(s.clock(skipIn))}
      </PrimaryButton>
    </m.div>
  );
}
