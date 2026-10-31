import { ACH } from '@/domain';
import { agoTxt } from '@/lib/format';
import { useApp } from '@/state/store';
import { ep } from '@/sync/endpoints';
import { newsworthy } from '@/sync/types';
import { useRemote } from '@/sync/useRemote';
import { achName } from '@/strings/achievements';
import { t } from '@/strings';

/** Signed in: my all-time rank and the latest activity, as small cards that open their screens. */
export function HomeOnline({ className = '' }: { className?: string }) {
  const { state, actions } = useApp();
  const me = state.session?.player?.id ?? null;
  const prof = useRemote(me ? `p:${me}` : null, (o) => ep.player(me!, o));
  const feed = useRemote(state.session ? 'activity' : null, () => ep.activity(null));
  if (!state.session) return null;
  const rank = prof.data?.rank;
  return (
    <section
      aria-label={t.hub.activity.title}
      className={`flex w-full flex-col gap-2 ${className}`}
    >
      {me && rank && (
        <button
          type="button"
          onClick={() => actions.open({ screen: 'player', params: { id: me } })}
          className="glass flex min-h-14 items-center gap-3 px-4 text-left"
        >
          <span aria-hidden className="text-24">
            🏆
          </span>
          <span className="flex-1 text-16 font-bold">
            {rank.global ? t.hub.player.rank(rank.global, rank.outOf) : t.hub.boards.unrankedShort}
          </span>
        </button>
      )}
      {(feed.data?.items ?? [])
        .filter(newsworthy)
        .slice(0, 3)
        .map((a) => {
          const code = typeof a.data.code === 'string' ? a.data.code : null;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => actions.open({ screen: 'activity' })}
              className="glass flex min-h-12 items-center gap-3 px-4 text-left text-14"
            >
              <span aria-hidden className="text-20">
                {code ? ACH.get(code)?.emoji : a.kind === 'game_finished' ? '🏁' : '👋'}
              </span>
              <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                {code
                  ? t.hub.activity.earned(a.player?.displayName ?? '', achName(code))
                  : a.kind === 'game_finished'
                    ? t.hub.activity.finished(
                        a.game?.players.find((p) => p.place === 1)?.name ?? '',
                        '',
                      )
                    : t.hub.activity.joined(a.player?.displayName ?? '')}
              </span>
              <span className="text-13 text-[var(--tx2)]">{agoTxt(a.createdAt)}</span>
            </button>
          );
        })}
    </section>
  );
}
