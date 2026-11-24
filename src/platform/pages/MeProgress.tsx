import { peekProgression } from '@/progression/registry';
import { shownCatalogue, type GameId } from '@/progression/types';
import { ep } from '@/sync/endpoints';
import { newsworthy, type Page as Paged } from '@/sync/types';
import { useRemote } from '@/sync/useRemote';
import { useApp } from '@/games/kachuful/state/store';
import { useProgressionEnv } from '@/games/kachuful/components/useProgressionEnv';
import { RemoteGate } from '@/components/RemoteGate';
import { ActivityRow, useEveryCatalogue } from '@/components/progression/ActivityPage';
import { ProgressionScope } from '@/components/progression/env';
import { NightReadyCard, useReadyNight } from '@/games/kachuful/components/NightReady';
import { nights as ns } from '@/games/kachuful/strings/night';
import { Icon } from '@/components/ui/Icons';
import { icon } from '@/components/ui/IconsMore';
import { Section } from '@/components/ui/Page';
import { ProgressRing } from '@/components/ui/Stats';
import { t } from '@/strings';
import { platform } from '@/strings/platform';
import { progression as ps } from '@/strings/progression';

const GAMES: readonly GameId[] = ['kachuful', 'kaali-teeri', 'spades', 'ishaara'];
const PREVIEW = 3;

/** The different achievements I hold in each game: every page of my rows, the four games at once. */
async function myCodes(id: string): Promise<Record<GameId, string[]>> {
  const one = async (game: GameId) => {
    const codes = new Set<string>();
    let cursor: string | null = null;
    do {
      const p: Paged<{ code: string }> = await ep.achievements(id, cursor, game);
      for (const e of p.items) codes.add(e.code);
      cursor = p.nextCursor;
    } while (cursor);
    return [game, [...codes]] as const;
  };
  return Object.fromEntries(await Promise.all(GAMES.map(one))) as Record<GameId, string[]>;
}

/** Each game's achievements I hold out of its catalogue; a row opens that game's Achievements page on me. */
export function MeAchievements({ id }: { id: string }) {
  const { actions } = useApp();
  const cats = useEveryCatalogue(true);
  // Codes, not counts, so a retired code counts only where it was earned (a new cache key: the old held numbers).
  const r = useRemote(`me:achc:${id}`, () => myCodes(id));
  return (
    <Section title={ps.everyGame}>
      <RemoteGate r={cats ? r : { ...r, data: null, error: null }} rows={GAMES.length}>
        {(counts) => (
          <ul className="glass overflow-hidden">
            {GAMES.map((g, i) => {
              const mine = new Set(counts[g] ?? []);
              const of = shownCatalogue(peekProgression(g)?.catalogue ?? [], mine).length;
              const n = mine.size;
              const name = platform.games[g].name;
              return (
                <li key={g} className={i ? 'border-t border-ov/10' : ''}>
                  <button
                    type="button"
                    aria-label={ps.gameAchSaid(name, n, of)}
                    onClick={() =>
                      actions.open({ screen: 'achievements', params: { id, game: g } })
                    }
                    className="press flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left"
                  >
                    <ProgressRing share={of ? n / of : 0} className="h-8 w-8 shrink-0" />
                    <span className="min-w-0 flex-1 text-16 font-bold [overflow-wrap:anywhere]">
                      {name}
                    </span>
                    <span className="num shrink-0 text-15 font-bold">
                      {n}
                      <span className="font-normal text-[var(--tx2)]"> / {of}</span>
                    </span>
                    <span aria-hidden className="text-[var(--tx2)]">
                      {Icon.chev}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </RemoteGate>
    </Section>
  );
}

/** The newest few things that happened in any game, with the whole feed a tap away. */
export function MeActivity() {
  const { actions } = useApp();
  const env = useProgressionEnv(null);
  const cats = useEveryCatalogue(true);
  // The same cache key as the every-game Activity page, so opening it shows these at once.
  const r = useRemote('all:activity', () => ep.activity(null, 'all'));
  return (
    <Section title={t.hub.activity.title}>
      <ProgressionScope env={env}>
        <RemoteGate r={cats ? r : { ...r, data: null, error: null }} rows={PREVIEW}>
          {(p) => {
            const items = p.items.filter(newsworthy).slice(0, PREVIEW);
            return !items.length ? (
              <p className="glass px-4 py-3 text-15 text-[var(--tx2)]">{t.hub.activity.empty}</p>
            ) : (
              <>
                <ul className="flex flex-col gap-2">
                  {items.map((a) => (
                    <li key={a.id}>
                      <ActivityRow a={a} every />
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => actions.open({ screen: 'activity', params: { game: 'all' } })}
                  className="press glass mt-2 flex min-h-12 w-full items-center gap-3 px-4 text-left text-15 font-bold"
                >
                  <span className="flex-1">{ps.feed.seeAll}</span>
                  <span aria-hidden className="text-[var(--tx2)]">
                    {Icon.chev}
                  </span>
                </button>
              </>
            );
          }}
        </RemoteGate>
      </ProgressionScope>
    </Section>
  );
}

/** "Your night is ready" while a night I sat waits unopened, and the way to every night of mine. */
export function MeNights({ id }: { id: string }) {
  const { actions } = useApp();
  const ready = useReadyNight(id);
  return (
    <div className="mb-6 flex flex-col gap-2">
      {ready && (
        <NightReadyCard
          ready={ready}
          onOpen={() => actions.open({ screen: 'night', params: { id: ready.id } })}
        />
      )}
      <button
        type="button"
        onClick={() => actions.open({ screen: 'night' })}
        className="press glass flex min-h-14 w-full items-center gap-3 px-4 text-left text-16 font-bold"
      >
        <span aria-hidden className="text-[var(--tx2)]">
          {icon('moon', 'h-6 w-6')}
        </span>
        <span className="flex-1">{ns.title}</span>
        <span aria-hidden className="text-[var(--tx2)]">
          {Icon.chev}
        </span>
      </button>
    </div>
  );
}
