import { m } from 'framer-motion';
import type { Identity, Team } from '@/games/ishaara/domain';
import { table as s } from '@/games/ishaara/strings/table';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { FACE, Mark } from './marks';

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
      className={`glass flex gap-3 p-3 pl-5 ${compact ? 'flex-col pl-3' : 'items-center'}`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-19 font-bold leading-tight">{b.guessAsk(w)}</p>
        {!compact && <p className="text-15 leading-snug text-[var(--tx2)]">{b.guessHint}</p>}
      </div>
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
export function MomentNote({ mo, onDone }: { mo: Moment; onDone?: () => void }) {
  return (
    <m.div {...IN} className="flex flex-col gap-2">
      <p
        className={`flex min-h-14 items-center gap-3 rounded-[18px] px-5 py-3 text-19 font-extrabold uppercase leading-tight ${FACE[mo.id]}`}
      >
        <Mark id={mo.id} className="h-5 w-5" />
        <span className="min-w-0 flex-1">{momentText(mo)}</span>
      </p>
      {mo.kind === 'trap' && (
        <>
          <p className="text-15 text-[var(--tx2)]">
            {b.reveal.trapBody(mo.team, mo.word.toUpperCase())}
          </p>
          {onDone && (
            <PrimaryButton onClick={onDone} className="w-full">
              {b.reveal.seeResult}
            </PrimaryButton>
          )}
        </>
      )}
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
