import { AnimatePresence, m } from 'framer-motion';
import { useState } from 'react';
import type { Team } from '@/games/ishaara/domain';
import { deleteIshaaraGame } from '@/games/ishaara/state/lists';
import { table as s } from '@/games/ishaara/strings/table';
import { Icon } from '@/components/ui/Icons';
import { MenuButton, MenuRow } from '@/components/ui/MenuRows';
import { Modal } from '@/components/ui/Modal';
import { Sheet } from '@/components/ui/Sheet';
import { stagger } from '@/components/ui/stagger';

const b = s.board;

/**
 * The board's menu: how to play, back to games (the game keeps going), resigning for either team, and for the host
 * ending a game started by mistake with no result (ISH-F22). Leaving while a turn's timer runs asks first, since only
 * the board ends an overdue turn.
 */
export function BoardMenu({
  onClose,
  onRules,
  onLeave,
  onResign,
  canResign,
  gameId,
  host = false,
  timed = false,
}: {
  onClose: () => void;
  onRules: () => void;
  onLeave: () => void;
  onResign: (t: Team) => void;
  canResign: boolean;
  gameId?: string;
  host?: boolean;
  /** A turn's deadline is running. */
  timed?: boolean;
}) {
  const [ask, setAsk] = useState<'leave' | 'end' | null>(null);
  const [err, setErr] = useState('');
  const end = async () => {
    setAsk(null);
    try {
      await deleteIshaaraGame(gameId!);
      onLeave();
    } catch {
      setErr(b.endFailed);
    }
  };
  return (
    <>
      <Sheet title={b.menu} onClose={onClose}>
        <MenuRow i={0} icon={Icon.rules} label={b.rules} onClick={onRules} rule={false} />
        <MenuRow
          i={1}
          icon={Icon.cards}
          label={b.leave}
          onClick={() => (host && timed ? setAsk('leave') : onLeave())}
          rule
        />
        <m.p {...stagger(2)} className="px-2 pb-3 pt-1 text-14 text-[var(--tx2)]">
          {host && timed ? b.leaveTimedNote : b.leaveNote}
        </m.p>
        <m.div {...stagger(3)} className="grid grid-cols-2 gap-2">
          {(['sun', 'moon'] as const).map((t) => (
            <MenuButton
              key={t}
              icon={Icon.flag}
              label={b.resign(t)}
              neg
              disabled={!canResign}
              onClick={() => onResign(t)}
            />
          ))}
        </m.div>
        {host && gameId && (
          <m.div {...stagger(4)} className="mt-2 grid">
            <MenuButton icon={Icon.close} label={b.endNoResult} neg onClick={() => setAsk('end')} />
            {err && (
              <p role="alert" className="px-2 pt-2 text-15 font-medium text-[var(--warn)]">
                {err}
              </p>
            )}
          </m.div>
        )}
      </Sheet>
      <AnimatePresence>
        {ask === 'leave' && (
          <Modal
            key="leave"
            text={b.leaveTimedAsk}
            ok={b.leave}
            cancel={b.stay}
            onCancel={() => setAsk(null)}
            onOk={() => (setAsk(null), onLeave())}
          />
        )}
        {ask === 'end' && (
          <Modal
            key="end"
            text={b.endAsk}
            ok={b.endOk}
            cancel={b.keepPlaying}
            danger
            onCancel={() => setAsk(null)}
            onOk={() => void end()}
          />
        )}
      </AnimatePresence>
    </>
  );
}
