import { ACH } from '@/games/kachuful/domain';
import { agoTxt } from '@/lib/format';
import { useApp } from '@/games/kachuful/state/store';
import { ep } from '@/sync/endpoints';
import { newsworthy, type Activity } from '@/sync/types';
import { useRemote } from '@/sync/useRemote';
import { achName } from '@/games/kachuful/strings/achievements';
import { t } from '@/strings';
import { Icon } from '@/components/ui/Icons';

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
          className="press glass flex min-h-14 items-center gap-3 px-4 text-left"
        >
          <span aria-hidden className="grid h-6 w-6 text-gold">
            {Icon.trophy}
          </span>
          <span className="flex-1 text-16 font-bold">
            {rank.global
              ? t.hub.player.rank(rank.global, rank.outOf)
              : t.hub.leaderboard.unrankedShort}
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
              className="press glass flex min-h-12 items-center gap-3 px-4 text-left text-14"
            >
              <span aria-hidden className="text-20">
                {code ? ACH.get(code)?.emoji : a.kind === 'game_finished' ? Icon.flag : Icon.user}
              </span>
              <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{newsLine(a)}</span>
              <span className="text-13 text-[var(--tx2)]">{agoTxt(a.createdAt)}</span>
            </button>
          );
        })}
    </section>
  );
}

/** One feed item in words. */
function newsLine(a: Activity): string {
  const code = typeof a.data.code === 'string' ? a.data.code : null;
  if (code) return t.hub.activity.earned(a.player?.displayName ?? '', achName(code));
  if (a.kind === 'game_finished')
    return t.hub.activity.finished(a.game?.players.find((p) => p.place === 1)?.name ?? '', '');
  return t.hub.activity.joined(a.player?.displayName ?? '');
}

/** The phone's version: one card with my rank and the newest news, opening my player page. */
export function HomeOnlineStrip({ className = '' }: { className?: string }) {
  const { state, actions } = useApp();
  const me = state.session?.player?.id ?? null;
  const prof = useRemote(me ? `p:${me}` : null, (o) => ep.player(me!, o));
  const feed = useRemote(state.session ? 'activity' : null, () => ep.activity(null));
  const rank = prof.data?.rank;
  const news = (feed.data?.items ?? []).find(newsworthy);
  if (!me || !rank) return null;
  return (
    <button
      type="button"
      onClick={() => actions.open({ screen: 'player', params: { id: me } })}
      className={`press glass flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left ${className}`}
    >
      <span aria-hidden className="grid h-6 w-6 shrink-0 text-gold">
        {Icon.trophy}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-16 font-bold">
          {rank.global ? t.hub.home.yourRank(rank.global, rank.outOf) : t.hub.home.notRanked}
        </span>
        {news && (
          <span className="block text-13 text-[var(--tx2)] [overflow-wrap:anywhere]">
            {newsLine(news)} · {agoTxt(news.createdAt)}
          </span>
        )}
      </span>
      <span aria-hidden className="text-[var(--dis)]">
        {Icon.chev}
      </span>
    </button>
  );
}
