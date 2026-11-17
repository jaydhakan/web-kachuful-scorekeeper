import { m } from 'framer-motion';
import { useState } from 'react';
import { byCode } from '@/progression/catalogue';
import { peekProgression, type GameProgression } from '@/progression/registry';
import type { GameId } from '@/progression/types';
import { agoTxt, sgnN } from '@/lib/format';
import { ep } from '@/sync/endpoints';
import { newsworthy, type Activity } from '@/sync/types';
import { useRemote } from '@/sync/useRemote';
import { RemoteGate } from '@/components/RemoteGate';
import { EmptyState, PageFrame } from '@/components/ui/PageParts';
import { stagger } from '@/components/ui/stagger';
import { t } from '@/strings';
import { icon } from '@/components/ui/IconsMore';
import { useProgressionEnv } from './env';

const ac = t.hub.activity;

/**
 * What happened lately: achievements, finished games, new players, season closes. One game's feed by default, or
 * every game's (`all`). Kachuful's feed keeps its old cache key.
 */
export function ActivityPage({ game }: { game?: GameId | 'all' }) {
  const env = useProgressionEnv();
  const feed = game ?? env.prog.id;
  const first = useRemote(
    env.signedIn ? (feed === 'kachuful' ? 'activity' : `${feed}:activity`) : null,
    () => ep.activity(null, feed),
  );
  const [more, setMore] = useState<Activity[]>([]);
  const [cursor, setCursor] = useState<string | null | undefined>(undefined);
  const next = cursor === undefined ? first.data?.nextCursor : cursor;
  const [paging, setPaging] = useState<'idle' | 'busy' | 'failed'>('idle');
  const loadMore = async () => {
    if (!next || paging === 'busy') return;
    setPaging('busy');
    try {
      const p = await ep.activity(next, feed);
      setMore((m) => [...m, ...p.items]);
      setCursor(p.nextCursor);
      setPaging('idle');
    } catch {
      setPaging('failed');
    }
  };
  if (!env.signedIn)
    return (
      <PageFrame onBack={env.onBack} title={ac.title}>
        <EmptyState icon="news" title={t.hub.leaderboard.signedOutTitle} />
      </PageFrame>
    );
  return (
    <PageFrame onBack={env.onBack} title={ac.title}>
      <RemoteGate r={first}>
        {(p) =>
          !p.items.length ? (
            <EmptyState icon="news" title={ac.empty} />
          ) : (
            <>
              <ul className="flex flex-col gap-2">
                {[...p.items, ...more].filter(newsworthy).map((a, i) => (
                  <m.li key={a.id} {...stagger(Math.min(i, 10))}>
                    <Row a={a} />
                  </m.li>
                ))}
              </ul>
              {next && (
                <>
                  {paging === 'failed' && (
                    <p role="alert" className="mt-4 text-14 text-[var(--warn)]">
                      {t.hub.common.errorTitle}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => void loadMore()}
                    disabled={paging === 'busy'}
                    aria-busy={paging === 'busy'}
                    className="press glass mt-4 min-h-12 w-full rounded-2xl font-bold disabled:opacity-60"
                  >
                    {paging === 'busy'
                      ? ac.loadingMore
                      : paging === 'failed'
                        ? t.hub.common.retry
                        : ac.more}
                  </button>
                </>
              )}
            </>
          )
        }
      </RemoteGate>
    </PageFrame>
  );
}

/** The catalogue a feed item's code belongs to: its game's when loaded, else the page's own. */
const progOf = (a: Activity, own: GameProgression) =>
  !a.gameKind || a.gameKind === own.id ? own : (peekProgression(a.gameKind) ?? null);

function Row({ a }: { a: Activity }) {
  const { prog, openGame, openPlayer } = useProgressionEnv();
  const code = typeof a.data.code === 'string' ? a.data.code : null;
  const who = a.player;
  const top = a.game?.players.find((p) => p.place === 1);
  const p = progOf(a, prog);
  const [emoji, text] =
    a.kind === 'achievement' && code
      ? [
          (p && byCode(p).get(code)?.emoji) ?? '🏅',
          ac.earned(who?.displayName ?? '', p?.strings.achievements[code]?.name ?? code),
        ]
      : a.kind === 'game_finished'
        ? [icon('flag', 'h-6 w-6'), ac.finished(top?.name ?? '', top ? sgnN(top.points) : '')]
        : a.kind === 'player_joined'
          ? [icon('wave', 'h-6 w-6'), ac.joined(who?.displayName ?? '')]
          : [
              icon('crown', 'h-6 w-6 text-[var(--gold-tx)]'),
              ac.season(String(a.data.season ?? '')),
            ];
  const go = () => (a.game && openGame ? openGame(a) : who ? openPlayer(who.id) : undefined);
  return (
    <button
      type="button"
      onClick={go}
      className="press glass flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left"
    >
      <span aria-hidden className="text-24">
        {emoji}
      </span>
      <span className="min-w-0 flex-1 text-15 [overflow-wrap:anywhere]">{text}</span>
      <span className="shrink-0 text-13 text-[var(--tx2)]">{agoTxt(a.createdAt)}</span>
    </button>
  );
}
