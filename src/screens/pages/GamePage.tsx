import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import { curRound, doneRounds, standings, type Game } from '@/domain';
import { dayLabel, timeLabel } from '@/lib/dates';
import { fmt } from '@/lib/format';
import { archive } from '@/state/archive';
import { useArchive } from '@/state/useArchive';
import { useApp } from '@/state/store';
import { BoardTable } from '@/sheets/BoardBody';
import { ChartLegend, ScoreChart } from '@/screens/desk/ScoreChart';
import { rankTone } from '@/screens/desk/DeskParts';
import { EmptyState, Page, Section, Skeleton } from '@/components/ui/Page';
import { fetchGame, queueDelete, resolveConflict } from '@/sync/engine';
import { Modal } from '@/components/ui/Modal';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SPRING_POP } from '@/components/ui/motion';
import { gameLine } from './HistoryPage';
import { t } from '@/strings';
import { Avatar } from '@/components/ui/Avatar';

const gt = t.hub.game;

export function GamePage({ id }: { id: string }) {
  const { state, actions } = useApp();
  const rec = useArchive((a) => a.get('games', id));
  const [ask, setAsk] = useState(false);
  const [load, setLoad] = useState<'idle' | 'loading' | 'failed'>('idle');
  const current = state.game.syncId === id;
  const signedIn = !!state.session;
  // Someone else's game (from a player page or the feed) is fetched once and kept.
  useEffect(() => {
    if (rec || current || !signedIn) return;
    setLoad('loading');
    fetchGame(id).then(
      () => setLoad('idle'),
      () => setLoad('failed'),
    );
  }, [id, rec, current, signedIn]);
  // The current game is shown live, not from its archived copy.
  const g: Game | undefined = current ? state.game : rec?.deleted ? undefined : rec?.game;
  if (!g)
    return (
      <Page title={gt.title}>
        {load === 'loading' ? (
          <Skeleton rows={4} />
        ) : (
          <EmptyState icon="🕳️" title={gt.notFound} body={gt.notFoundBody} />
        )}
      </Page>
    );
  const done = doneRounds(g),
    at = g.status === 'finished' ? (g.finishedAt ?? g.updatedAt) : g.createdAt;
  const remove = () => {
    if (rec) {
      archive.put('games', { ...rec, deleted: true, updatedAt: Date.now() });
      queueDelete(rec.syncId);
    }
    setAsk(false);
    actions.back();
    actions.say(gt.deleted);
  };
  const actionsRow: ReactNode[] = [];
  if (current && g.status === 'active')
    actionsRow.push(
      <PrimaryButton key="resume" className="px-7" onClick={actions.resume}>
        {gt.resume}
      </PrimaryButton>,
    );
  else if (
    !current &&
    g.status === 'active' &&
    !rec?.conflictOf &&
    (rec?.origin === 'local' || rec?.account === state.session?.user.id)
  )
    actionsRow.push(
      <PrimaryButton
        key="continue"
        className="px-7"
        onClick={() => {
          if (rec?.origin === 'remote') archive.put('games', { ...rec, origin: 'local' });
          actions.openGame(g);
        }}
      >
        {gt.continue}
      </PrimaryButton>,
    );
  if (rec?.conflictOf)
    actionsRow.push(
      <p key="note" className="w-full text-15 text-[var(--tx2)]">
        {t.hub.sync2.conflictNote}
      </p>,
      <PrimaryButton
        key="keep"
        className="px-6"
        onClick={() => (resolveConflict(rec.syncId, true), actions.back())}
      >
        {t.hub.sync2.keepThis}
      </PrimaryButton>,
      <PrimaryButton
        key="other"
        tone="glass"
        className="px-6"
        onClick={() => (resolveConflict(rec.syncId, false), actions.back())}
      >
        {t.hub.sync2.keepOther}
      </PrimaryButton>,
    );
  return (
    <Page
      wide
      label={gameLine(g)}
      eyebrow={`${g.status === 'finished' ? gt.finishedOn(dayLabel(at)) : gt.startedOn(dayLabel(at))} · ${timeLabel(at)}`}
      title={gameLine(g)}
    >
      {actionsRow.length > 0 && <div className="mb-5 flex flex-wrap gap-3">{actionsRow}</div>}
      {done.length > 0 && <Podium g={g} />}
      <Section title={gt.standings}>
        <Standings g={g} />
      </Section>
      {done.length > 1 && (
        <Section title={gt.chart}>
          <div className="glass flex flex-col gap-3 p-4">
            <div className="h-56 [[data-desk]_&]:h-72">
              <ScoreChart g={g} rounds={done} />
            </div>
            <ChartLegend g={g} />
          </div>
        </Section>
      )}
      <Section title={gt.rounds}>
        {done.length ? (
          <div className="rounded-2xl bg-sheet p-2">
            <BoardTable g={g} />
          </div>
        ) : (
          <p className="text-16 text-[var(--tx2)]">{gt.noRounds}</p>
        )}
      </Section>
      {!current && rec && (
        <button
          type="button"
          onClick={() => setAsk(true)}
          className="mt-2 min-h-12 rounded-2xl px-4 text-16 font-bold text-[var(--neg)]"
        >
          {gt.delete}
        </button>
      )}
      <AnimatePresence>
        {ask && (
          <Modal
            key="del"
            text={gt.deleteAsk}
            ok={t.hub.common.delete}
            danger
            onOk={remove}
            onCancel={() => setAsk(false)}
          />
        )}
      </AnimatePresence>
    </Page>
  );
}

const STEP_H = ['h-24', 'h-16', 'h-12'];

/** The top three on steps: first in the middle. */
function Podium({ g }: { g: Game }) {
  const st = standings(g).slice(0, 3);
  const order = st.length === 3 ? [st[1], st[0], st[2]] : st;
  return (
    <div className="mb-6 flex items-end justify-center gap-3" aria-hidden>
      {order.map((s) => {
        const k = st.indexOf(s);
        return (
          <motion.div
            key={s.p.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING_POP, delay: 0.1 + (2 - k) * 0.08 }}
            className="flex w-28 flex-col items-center gap-1.5 text-center"
          >
            <Avatar
              p={s.p}
              className="grid h-14 w-14 place-items-center rounded-full border-2 border-white/20 text-30"
            />
            <span className="text-15 font-bold leading-tight [overflow-wrap:anywhere]">
              {s.p.name}
            </span>
            <span className={`disp text-20 font-extrabold ${rankTone(s.rank)}`}>{fmt(s.t)}</span>
            <motion.span
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ ...SPRING_POP, delay: 0.2 + (2 - k) * 0.08 }}
              className={`w-full origin-bottom rounded-t-2xl bg-white/[.08] ${STEP_H[k]} grid place-items-start justify-center pt-2 text-22 font-extrabold ${rankTone(s.rank)}`}
            >
              {s.rank}
            </motion.span>
          </motion.div>
        );
      })}
    </div>
  );
}

function Standings({ g }: { g: Game }) {
  const st = standings(g),
    r = curRound(g);
  return (
    <ol className="glass flex flex-col divide-y divide-white/[.06] px-4">
      {st.map((s) => (
        <li key={s.p.id} className="flex min-h-14 items-center gap-3 py-2">
          <span className={`disp w-6 text-center text-20 font-extrabold ${rankTone(s.rank)}`}>
            {s.rank}
          </span>
          <Avatar
            p={s.p}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-20"
          />
          <span className="min-w-0 flex-1 text-17 font-bold [overflow-wrap:anywhere]">
            {s.p.name}
            {g.status === 'active' && r.dealerIndex === s.i && (
              <span className="ml-2 text-13 font-medium text-[var(--tx2)]">
                {t.table.deals.toLowerCase()}
              </span>
            )}
          </span>
          <span className={`disp text-22 font-extrabold ${s.t < 0 ? 'text-[var(--neg-tx)]' : ''}`}>
            {gt.points(fmt(s.t))}
          </span>
        </li>
      ))}
    </ol>
  );
}
