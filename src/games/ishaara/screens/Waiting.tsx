import { AnimatePresence, m } from 'framer-motion';
import { useState } from 'react';
import { clueGiverOf, type IshaaraPublic, type Team } from '@/games/ishaara/domain';
import { deleteIshaaraGame } from '@/games/ishaara/state/lists';
import { table as s } from '@/games/ishaara/strings/table';
import { Avatar } from '@/components/ui/Avatar';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icons';
import { Modal } from '@/components/ui/Modal';
import { Scaffold } from '@/components/ui/Scaffold';
import { stagger } from '@/components/ui/stagger';
import { Mark } from './board/marks';
import { JoinQr } from './JoinQr';

const w = s.waiting;

/** Where clue-givers open the game: this app's own address, so it is right in development as well. */
export const clueUrl = () =>
  `${typeof location === 'undefined' ? 'play.vectanix.com' : location.host}/ishaara`;

/**
 * Waiting for both clue-givers to open their key: who, where, and a tick as each joins. The board opens by itself
 * once both have (the shell follows the game's status).
 */
export default function Waiting({ game, onLeave }: { game: IshaaraPublic; onLeave: () => void }) {
  const [ask, setAsk] = useState(false);
  const [err, setErr] = useState('');
  const teams: Team[] = ['sun', 'moon'];
  const givers = teams.map((t) => ({ t, p: clueGiverOf(game, t) }));
  const names = givers.map((g) => g.p?.name ?? s.team[g.t]);
  const cancel = async () => {
    setAsk(false);
    try {
      await deleteIshaaraGame(game.id);
      onLeave();
    } catch {
      setErr(w.cancelFailed);
    }
  };
  return (
    <>
      <Scaffold
        left={
          <IconButton chrome label={w.leave} onClick={onLeave}>
            {Icon.back}
          </IconButton>
        }
        navTitle={
          <span className="text-15 font-medium text-[var(--tx2)]">{s.setup.stepOf(3)}</span>
        }
        title={w.title}
        bar={
          <div className="flex w-full flex-col gap-1">
            <p role="status" className="text-center text-15 text-[var(--tx2)]">
              {w.startsWhen}
            </p>
            <button
              type="button"
              onClick={() => setAsk(true)}
              className="press mx-auto min-h-11 rounded-xl px-3 text-15 font-bold text-[var(--neg)]"
            >
              {w.cancel}
            </button>
          </div>
        }
      >
        <m.p {...stagger(0)} className="text-22 leading-snug [text-wrap:balance]">
          <b>{w.open(names[0], names[1])}</b>{' '}
          <b className="break-all text-[var(--accent)]">{clueUrl()}</b> {w.onPhone}
        </m.p>
        <m.div {...stagger(1)} className="mt-4 flex justify-center">
          <JoinQr className="h-40 w-40 p-1" />
        </m.div>
        <m.p {...stagger(1)} className="mt-3 text-16 text-[var(--tx2)]">
          {w.yourGames}
        </m.p>
        {err && (
          <p role="alert" className="mt-3 text-15 font-medium text-[var(--warn)]">
            {err}
          </p>
        )}
        <m.ul {...stagger(2)} className="glass mt-5 overflow-hidden" aria-live="polite">
          {givers.map(({ t, p }, k) => {
            const joined = game.joined[t];
            return (
              <li key={t} className="relative flex min-h-[4.5rem] items-center gap-3 px-4 py-3">
                {k > 0 && (
                  <span aria-hidden className="absolute left-4 right-4 top-0 h-px bg-ov/10" />
                )}
                {p && <Avatar p={p} className="h-11 w-11 shrink-0 text-22" />}
                <div className="min-w-0 flex-1">
                  <p className="text-19 font-bold">{p?.name ?? s.team[t]}</p>
                  <p className="flex items-center gap-1.5 text-15 text-[var(--tx2)]">
                    <Mark id={t} className="h-3 w-3" />
                    {w.giverOf(t)}
                  </p>
                </div>
                <span
                  className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-16 font-bold ${joined ? 'text-[var(--pos)] shadow-[inset_0_0_0_1.5px_var(--pos)]' : 'text-[var(--tx2)] shadow-[inset_0_0_0_1.5px_var(--hairline-2)]'}`}
                >
                  <span aria-hidden className="[&_svg]:h-4 [&_svg]:w-4">
                    {joined ? Icon.check : Icon.history}
                  </span>
                  {joined ? w.joined : w.notYet}
                </span>
              </li>
            );
          })}
        </m.ul>
      </Scaffold>
      <AnimatePresence>
        {ask && (
          <Modal
            key="cancel"
            text={w.cancelAsk}
            ok={w.cancelOk}
            cancel={w.keep}
            danger
            onCancel={() => setAsk(false)}
            onOk={() => void cancel()}
          />
        )}
      </AnimatePresence>
    </>
  );
}
