import { motion } from 'framer-motion';
import { useState } from 'react';
import { ACH } from '@/domain';
import { agoTxt, sgnN } from '@/lib/format';
import { useApp } from '@/state/store';
import { ep } from '@/sync/endpoints';
import type { Activity } from '@/sync/types';
import { useRemote } from '@/sync/useRemote';
import { RemoteGate } from '@/components/RemoteGate';
import { EmptyState, Page } from '@/components/ui/Page';
import { stagger } from '@/components/ui/stagger';
import { achName } from '@/strings/achievements';
import { t } from '@/strings';

const ac = t.hub.activity;

/** What happened lately across everyone's games: achievements, finished games, new players, season closes. */
export function ActivityPage() {
  const { state } = useApp();
  const first = useRemote(state.session ? 'activity' : null, () => ep.activity(null));
  const [more, setMore] = useState<Activity[]>([]);
  const [cursor, setCursor] = useState<string | null | undefined>(undefined);
  const next = cursor === undefined ? first.data?.nextCursor : cursor;
  const loadMore = async () => {
    if (!next) return;
    const p = await ep.activity(next);
    setMore((m) => [...m, ...p.items]);
    setCursor(p.nextCursor);
  };
  if (!state.session)
    return (
      <Page title={ac.title}>
        <EmptyState icon="📰" title={t.hub.boards.signedOutTitle} />
      </Page>
    );
  return (
    <Page title={ac.title}>
      <RemoteGate r={first}>
        {(p) =>
          !p.items.length ? (
            <EmptyState icon="📰" title={ac.empty} />
          ) : (
            <>
              <ul className="flex flex-col gap-2">
                {[...p.items, ...more].map((a, i) => (
                  <motion.li key={a.id} {...stagger(Math.min(i, 10))}>
                    <Row a={a} />
                  </motion.li>
                ))}
              </ul>
              {next && (
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  className="glass mt-4 min-h-12 w-full rounded-2xl font-bold"
                >
                  {ac.more}
                </button>
              )}
            </>
          )
        }
      </RemoteGate>
    </Page>
  );
}

function Row({ a }: { a: Activity }) {
  const { actions } = useApp();
  const code = typeof a.data.code === 'string' ? a.data.code : null;
  const who = a.player;
  const top = a.game?.players.find((p) => p.place === 1);
  const [emoji, text] =
    a.kind === 'achievement' && code
      ? [ACH.get(code)?.emoji ?? '🏅', ac.earned(who?.displayName ?? '', achName(code))]
      : a.kind === 'game_finished'
        ? ['🏁', ac.finished(top?.name ?? '', top ? sgnN(top.points) : '')]
        : a.kind === 'player_joined'
          ? ['👋', ac.joined(who?.displayName ?? '')]
          : ['👑', ac.season(String(a.data.season ?? ''))];
  const go = () =>
    a.game
      ? actions.open({ screen: 'game', params: { id: a.game.id } })
      : who && actions.open({ screen: 'player', params: { id: who.id } });
  return (
    <button
      type="button"
      onClick={go}
      className="glass flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left"
    >
      <span aria-hidden className="text-24">
        {emoji}
      </span>
      <span className="min-w-0 flex-1 text-15 [overflow-wrap:anywhere]">{text}</span>
      <span className="shrink-0 text-13 text-[var(--tx2)]">{agoTxt(a.createdAt)}</span>
    </button>
  );
}
