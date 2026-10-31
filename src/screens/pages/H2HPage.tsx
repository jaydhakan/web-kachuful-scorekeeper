import { motion, useReducedMotion } from 'framer-motion';
import { useMemo } from 'react';
import { headToHead, type Facts } from '@/domain';
import { dayLabel } from '@/lib/dates';
import { fmt } from '@/lib/format';
import { useApp } from '@/state/store';
import { useDeviceFacts, whoIs } from '@/state/useFacts';
import { EmptyState, Page, Section } from '@/components/ui/Page';
import { SPRING_POP } from '@/components/ui/motion';
import { ep } from '@/sync/endpoints';
import { useRemote } from '@/sync/useRemote';
import type { GameSummary } from '@/sync/types';
import { t } from '@/strings';
import { AvatarFill } from '@/components/ui/Avatar';

const h = t.hub.h2h;

const ptsIn = (g: GameSummary, id: string) => g.players.find((p) => p.playerId === id)?.points ?? 0;

interface View {
  games: number;
  aAhead: number;
  bAhead: number;
  ties: number;
  aPoints: number;
  bPoints: number;
  biggest: { name: string; by: number } | null;
  last: { id: string; endedAt: number | null; a: [number, number]; b: [number, number] }[];
}

export function H2HPage({ a, b, facts }: { a: string; b: string; facts?: Facts }) {
  const device = useDeviceFacts();
  const f = facts ?? device;
  const { actions } = useApp();
  const rm = useReducedMotion();
  const signedIn = !!useApp().state.session;
  const remote = useRemote(signedIn ? `vs:${a}:${b}` : null, (o) =>
    ep.vs(a, b, undefined, undefined, o),
  );
  const x = useMemo((): View => {
    const r = remote.data;
    if (r)
      return {
        ...r,
        biggest: r.biggestWin && {
          name: whoIs(f, ptsIn(r.biggestWin.game, a) > ptsIn(r.biggestWin.game, b) ? a : b).name,
          by: r.biggestWin.by,
        },
        last: r.lastGames.map((g) => {
          const pa = g.players.find((p) => p.playerId === a),
            pb = g.players.find((p) => p.playerId === b);
          return {
            id: g.id,
            endedAt: g.endedAt,
            a: [pa?.place ?? 0, pa?.points ?? 0],
            b: [pb?.place ?? 0, pb?.points ?? 0],
          };
        }),
      };
    const h = headToHead(f, a, b);
    return {
      ...h,
      biggest: h.biggestWin && { name: whoIs(f, h.biggestWin.winner).name, by: h.biggestWin.by },
      last: h.lastGames.map((id) => {
        const pa = f.players.find((p) => p.gameId === id && p.playerId === a)!;
        const pb = f.players.find((p) => p.gameId === id && p.playerId === b)!;
        return {
          id,
          endedAt: pa.endedAt,
          a: [pa.place ?? 0, pa.points],
          b: [pb.place ?? 0, pb.points],
        };
      }),
    };
  }, [f, a, b, remote.data]);
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
        className="relative grid h-20 w-20 place-items-center rounded-full border-2 border-white/20 text-44"
        style={{ background: w.color }}
      >
        <AvatarFill p={w} />
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
            {x.biggest && <> · {h.biggest(x.biggest.name, x.biggest.by)}</>}
          </p>
          <Section title={h.last}>
            <ul className="flex flex-col gap-2">
              {x.last.map((g) => (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => actions.open({ screen: 'game', params: { id: g.id } })}
                    className="glass grid min-h-14 w-full grid-cols-[1fr_auto_1fr] items-center gap-3 px-4"
                  >
                    <span
                      className={`text-right text-18 font-extrabold ${g.a[0] < g.b[0] ? 'text-gold' : ''}`}
                    >
                      #{g.a[0]} · {fmt(g.a[1])}
                    </span>
                    <span className="text-13 text-[var(--tx2)]">
                      {g.endedAt ? dayLabel(g.endedAt) : ''}
                    </span>
                    <span
                      className={`text-left text-18 font-extrabold ${g.b[0] < g.a[0] ? 'text-gold' : ''}`}
                    >
                      #{g.b[0]} · {fmt(g.b[1])}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Section>
        </>
      )}
    </Page>
  );
}
