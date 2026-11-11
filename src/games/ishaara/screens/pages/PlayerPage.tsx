import { useIshaaraLeaderboard, useIshaaraPlayerStats } from '@/games/ishaara/state/lists';
import { ipg } from '@/games/ishaara/strings/pages';
import { RemoteGate } from '@/components/RemoteGate';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState, Section } from '@/components/ui/PageParts';
import { StatTile, TileGrid } from '@/components/ui/Stats';
import { whoOf } from './LeaderboardPage';
import { IshPage, RowButton, useHubNav, type Who } from './parts';

const p = ipg.player,
  tl = p.tiles;

/** One player's numbers over every finished game: guessing, clue-giving, and who to compare them with. */
export function PlayerPage({ who }: { who: Who }) {
  const r = useIshaaraPlayerStats(who.id);
  return (
    <IshPage wide eyebrow={p.eyebrow} title={who.name}>
      <div className="mb-5 flex justify-center">
        <Avatar p={who} className="grid h-24 w-24 place-items-center rounded-full text-52" />
      </div>
      <RemoteGate r={r}>
        {(s) =>
          !s.games ? (
            <EmptyState card icon="cards" title={p.emptyTitle} body={p.emptyBody} />
          ) : (
            <>
              <Section title={p.games}>
                <TileGrid>
                  <StatTile label={tl.games} value={s.games} />
                  <StatTile label={tl.wins} value={s.wins} />
                  <StatTile label={tl.winRate} value={ipg.pct(s.winRate)} />
                </TileGrid>
              </Section>
              <Section title={p.guessing}>
                <TileGrid>
                  <StatTile label={tl.found} value={s.wordsFound} />
                  <StatTile label={tl.wrong} value={s.wrongPicks} />
                  <StatTile label={tl.trap} value={s.trapHits} />
                </TileGrid>
              </Section>
              <Section title={p.giving}>
                {s.clueGames ? (
                  <TileGrid>
                    <StatTile label={tl.clueGames} value={s.clueGames} />
                    <StatTile label={tl.clueWins} value={s.clueWins} />
                    <StatTile label={tl.clues} value={s.cluesGiven} />
                    <StatTile
                      label={tl.avg}
                      value={s.avgClueNumber == null ? '–' : s.avgClueNumber.toFixed(1)}
                    />
                    <StatTile label={tl.penalties} value={s.penalties} />
                  </TileGrid>
                ) : (
                  <p className="text-16 text-[var(--tx2)]">{p.givingNone}</p>
                )}
              </Section>
              <Rivals who={who} />
            </>
          )
        }
      </RemoteGate>
    </IshPage>
  );
}

/** Everyone else on the all-time board, to open head-to-head with. */
function Rivals({ who }: { who: Who }) {
  const { open } = useHubNav();
  const board = useIshaaraLeaderboard('all', 'wins');
  const others = (board.data?.rows ?? []).filter((x) => x.player.id !== who.id).slice(0, 8);
  if (!board.data) return null;
  return (
    <Section title={p.vs}>
      {others.length ? (
        <ul className="flex flex-col gap-2">
          {others.map((x) => {
            const o = whoOf(x.player);
            return (
              <li key={o.id}>
                <RowButton
                  label={p.vsLabel(who.name, o.name)}
                  onClick={() => open({ page: 'h2h', a: who, b: o })}
                >
                  <Avatar
                    p={o}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-18"
                  />
                  <span className="flex-1 text-16 font-bold [overflow-wrap:anywhere]">
                    {o.name}
                  </span>
                  <span className="text-14 text-[var(--tx2)]">{ipg.common.games(x.games)}</span>
                </RowButton>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-16 text-[var(--tx2)]">{p.vsNone}</p>
      )}
    </Section>
  );
}
