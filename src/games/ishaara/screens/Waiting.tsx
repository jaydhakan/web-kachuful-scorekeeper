import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { clueGiverOf, type IshaaraPublic, type Seated, type Team } from '@/games/ishaara/domain';
import { gameLink } from '@/games/ishaara/state/gameLink';
import { deleteIshaaraGame } from '@/games/ishaara/state/lists';
import { canShareLink, copyText, shareLink } from '@/lib/clip';
import { table as s } from '@/games/ishaara/strings/table';
import { Avatar } from '@/components/ui/Avatar';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icons';
import { Modal } from '@/components/ui/Modal';
import { Scaffold } from '@/components/ui/Scaffold';
import { SPRING_POP } from '@/components/ui/motion';
import { stagger } from '@/components/ui/stagger';
import { Mark } from './board/marks';
import { JoinQr } from './JoinQr';

const w = s.waiting;

/** A link that opens this game straight at the clue-giver's gate, for when the QR's address isn't enough. */
function CopyLink({ id }: { id: string }) {
  const [said, setSaid] = useState('');
  const url = gameLink(id);
  const send = async () => {
    if (canShareLink()) return shareLink(url, w.linkText);
    setSaid((await copyText(url)) ? w.copied : w.copyFailed);
  };
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <button
        type="button"
        onClick={() => void send()}
        className="press mat-fill-s inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-15 font-bold"
      >
        <span aria-hidden className="[&_svg]:h-4 [&_svg]:w-4">
          {Icon.share}
        </span>
        {canShareLink() ? w.shareLink : w.copyLink}
      </button>
      <span role="status" className="text-15 text-[var(--tx2)]">
        {said}
      </span>
    </div>
  );
}

/**
 * Each clue-giver and whether they have opened their key. Joining is a moment: the avatar drops in, the pill turns to
 * Joined with a check, and once both are in the rows pulse together before the board opens (A5).
 */
function Givers({
  givers,
  game,
}: {
  givers: { t: Team; p: Seated | undefined }[];
  game: IshaaraPublic;
}) {
  const rm = useReducedMotion();
  const both = game.joined.sun && game.joined.moon;
  return (
    <ul className="glass mt-5 overflow-hidden pane:mt-0" aria-live="polite">
      {givers.map(({ t, p }, k) => {
        const joined = game.joined[t];
        return (
          <m.li
            key={t}
            animate={both && !rm ? { scale: [1, 1.02, 1] } : { scale: 1 }}
            transition={{ duration: 0.5, delay: k * 0.08 }}
            className="relative flex min-h-[4.5rem] items-center gap-3 px-4 py-3"
          >
            {k > 0 && <span aria-hidden className="absolute left-4 right-4 top-0 h-px bg-ov/10" />}
            {p && (
              <m.span
                key={joined ? 'in' : 'out'}
                initial={joined && !rm ? { y: -14, opacity: 0 } : false}
                animate={{ y: 0, opacity: joined ? 1 : 0.55 }}
                transition={rm ? { duration: 0.15 } : SPRING_POP}
                className="shrink-0"
              >
                <Avatar p={p} className="h-11 w-11 text-22" />
              </m.span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-19 font-bold">{p?.name ?? s.team[t]}</p>
              <p className="flex items-center gap-1.5 text-15 text-[var(--tx2)]">
                <Mark id={t} className="h-3 w-3" />
                {w.giverOf(t)}
              </p>
            </div>
            <AnimatePresence mode="popLayout" initial={false}>
              <m.span
                key={joined ? 'joined' : 'waiting'}
                initial={rm ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={rm ? { duration: 0.15 } : SPRING_POP}
                className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-16 font-bold ${joined ? 'text-[var(--pos)] shadow-[inset_0_0_0_1.5px_var(--pos)]' : 'text-[var(--tx2)] shadow-[inset_0_0_0_1.5px_var(--hairline-2)]'}`}
              >
                <span aria-hidden className="[&_svg]:h-4 [&_svg]:w-4">
                  {joined ? Icon.check : Icon.history}
                </span>
                {joined ? w.joined : w.notYet}
              </m.span>
            </AnimatePresence>
          </m.li>
        );
      })}
    </ul>
  );
}

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
        aside={<Givers givers={givers} game={game} />}
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
          <b className="break-all text-[var(--accent-tx)]">{clueUrl()}</b> {w.onPhone}
        </m.p>
        <m.div {...stagger(1)} className="mt-4 flex justify-center">
          <JoinQr className="h-40 w-40 p-1" />
        </m.div>
        <m.p {...stagger(1)} className="mt-3 text-16 text-[var(--tx2)]">
          {w.yourGames}
        </m.p>
        <m.div {...stagger(1)} className="mt-3">
          <CopyLink id={game.id} />
        </m.div>
        {err && (
          <p role="alert" className="mt-3 text-15 font-medium text-[var(--warn)]">
            {err}
          </p>
        )}
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
