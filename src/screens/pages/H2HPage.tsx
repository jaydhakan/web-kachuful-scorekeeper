import { motion, useReducedMotion } from 'framer-motion';
import { useMemo } from 'react';
import { headToHead, type Facts } from '@/domain';
import { dayLabel } from '@/lib/dates';
import { fmt } from '@/lib/format';
import { useApp } from '@/state/store';
import { useDeviceFacts, whoIs } from '@/state/useFacts';
import { EmptyState, Page, Section } from '@/components/ui/Page';
import { SPRING_POP } from '@/components/ui/motion';
import { t } from '@/strings';

const h = t.hub.h2h;

export function H2HPage({ a, b, facts }: { a: string; b: string; facts?: Facts }) {
  const device = useDeviceFacts();
  const f = facts ?? device;
  const { actions } = useApp();
  const rm = useReducedMotion();
  const x = useMemo(() => headToHead(f, a, b), [f, a, b]);
  const A = whoIs(f, a),
    B = whoIs(f, b);
  const side = (w: typeof A, from: number) => (
    <motion.div
      initial={rm ? false : { opacity: 0, x: from }}
      animate={{ opacity: 1, x: 0 }}
      transition={SPRING_POP}
      className="flex flex-1 flex-col items-center gap-2 text-center"
    >
      <motion.span
        aria-hidden
        animate={rm ? undefined : { scale: [1, 1.12, 1] }}
        transition={{ delay: 0.45, duration: 0.35 }}
        className="grid h-20 w-20 place-items-center rounded-full border-2 border-white/20 text-44"
        style={{ background: w.color }}
      >
        {w.emoji}
      </motion.span>
      <span className="text-18 font-bold [overflow-wrap:anywhere]">{w.name}</span>
    </motion.div>
  );
  const stat = (label: string, l: number | string, r: number | string) => (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2.5">
      <span className="disp text-right text-28 font-extrabold">{l}</span>
      <span className="text-center text-13 font-bold uppercase tracking-[0.08em] text-[var(--tx2)]">
        {label}
      </span>
      <span className="disp text-28 font-extrabold">{r}</span>
    </div>
  );
  return (
    <Page title={h.title(A.name, B.name)}>
      <div className="mb-6 flex items-start gap-2">
        {side(A, -60)}
        <span className="disp mt-6 text-28 font-extrabold text-[var(--accent)]">{h.vs}</span>
        {side(B, 60)}
      </div>
      {!x.games ? (
        <EmptyState icon="🤝" title={h.never} />
      ) : (
        <>
          <div className="glass mb-6 divide-y divide-white/[.06] px-4">
            {stat(h.ahead(''), x.aAhead, x.bAhead)}
            {stat(h.ties, x.ties, x.ties)}
            {stat(h.points, fmt(x.aPoints), fmt(x.bPoints))}
          </div>
          <p className="mb-6 text-center text-15 text-[var(--tx2)]">
            {h.games}: {x.games}
            {x.biggestWin && (
              <> · {h.biggest(whoIs(f, x.biggestWin.winner).name, x.biggestWin.by)}</>
            )}
          </p>
          <Section title={h.last}>
            <ul className="flex flex-col gap-2">
              {x.lastGames.map((id) => {
                const pa = f.players.find((p) => p.gameId === id && p.playerId === a)!;
                const pb = f.players.find((p) => p.gameId === id && p.playerId === b)!;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => actions.open({ screen: 'game', params: { id } })}
                      className="glass grid min-h-14 w-full grid-cols-[1fr_auto_1fr] items-center gap-3 px-4"
                    >
                      <span
                        className={`text-right text-18 font-extrabold ${pa.place! < pb.place! ? 'text-gold' : ''}`}
                      >
                        #{pa.place} · {fmt(pa.points)}
                      </span>
                      <span className="text-13 text-[var(--tx2)]">
                        {pa.endedAt ? dayLabel(pa.endedAt) : ''}
                      </span>
                      <span
                        className={`text-left text-18 font-extrabold ${pb.place! < pa.place! ? 'text-gold' : ''}`}
                      >
                        #{pb.place} · {fmt(pb.points)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Section>
        </>
      )}
    </Page>
  );
}
