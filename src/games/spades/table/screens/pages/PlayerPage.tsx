import { m } from 'framer-motion';
import { useMemo } from 'react';
import { spHeadToHead, spPlayerStats } from '@/games/spades/domain/boards';
import { spTable } from '@/games/spades/strings/table';
import { useSpHeadToHead, useSpPlayerStats } from '@/games/spades/table/sync/boards';
import { signedInAs, useSession } from '@/sync/session';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState, Section, Skeleton } from '@/components/ui/PageParts';
import { stagger } from '@/components/ui/stagger';
import { Gate, SpPage } from './parts';
import { useSpGames, useWho } from './source';

const b = spTable.pages.board;
const p = spTable.pages.player;

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="glass flex min-h-[5.5rem] min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-2 text-center">
      <dt className="order-last text-13 font-bold text-[var(--tx2)]">{label}</dt>
      <dd className="disp text-24 font-extrabold leading-none tabular-nums">{value}</dd>
      {sub && <dd className="text-13 text-[var(--tx2)]">{sub}</dd>}
    </div>
  );
}

/**
 * One player's page from the leaderboard: their totals, partners by win rate, how they do with and against you, and
 * their achievements. Signed in, the numbers come from the server.
 */
export default function PlayerPage({ id }: { id: string }) {
  const src = useSpGames();
  const who = useWho(src.games)(id);
  const meId = signedInAs(useSession())?.player?.id ?? null;
  const serverId = id.startsWith('name:') ? null : (who.playerId ?? id);
  const remote = useSpPlayerStats(serverId);
  const local = useMemo(() => spPlayerStats(src.games, id), [src.games, id]);
  const stats = remote.online && remote.data ? remote.data : null;
  const t = stats ?? local;
  const partners = stats
    ? stats.partners.map((x) => ({ id: x.playerId, games: x.games, wins: x.wins }))
    : local.partners.map((x) => ({ id: x.player, games: x.games, wins: x.wins }));
  const meHere = !!meId && meId !== serverId;
  const vsRemote = useSpHeadToHead(meHere ? meId : null, meHere ? serverId : null);
  const vs = meHere ? (vsRemote.data ?? (meId ? spHeadToHead(src.games, meId, id) : null)) : null;
  const lookup = useWho(src.games);
  const waiting = remote.online && !remote.data && remote.loading;
  const failed = remote.online && !remote.data && !!remote.error;
  const ratio = (a: number, n: number) => (n ? p.ratio(a, n) : undefined);

  return (
    <SpPage
      title={
        <span className="flex min-w-0 items-center gap-2.5">
          <Avatar
            p={who}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-20"
          />
          <span className="min-w-0 [overflow-wrap:anywhere]">{who.name}</span>
        </span>
      }
      label={who.name}
      eyebrow={p.title}
      wide
    >
      <Gate src={src}>
        {() =>
          waiting ? (
            <div role="status" aria-label={p.loading}>
              <Skeleton rows={4} h={88} />
            </div>
          ) : !t.games ? (
            <EmptyState icon="cards" title={p.missing} />
          ) : (
            <>
              {failed && (
                <p role="alert" className="glass mb-4 p-3 text-14 text-[var(--warn)]">
                  {p.failed}
                </p>
              )}
              <Section title={p.stats}>
                <dl className="grid grid-cols-3 gap-2">
                  <Tile label={p.games} value={String(t.games)} />
                  <Tile label={p.wins} value={String(t.wins)} />
                  <Tile label={p.winRate} value={b.pct(t.winRate)} />
                  <Tile label={p.made} value={b.pct(t.madeRate)} sub={ratio(t.bidsMade, t.bids)} />
                  <Tile label={p.nil} value={b.pct(t.nilRate)} sub={ratio(t.nilsMade, t.nils)} />
                  <Tile
                    label={p.blindNil}
                    value={b.pct(t.blindNilRate)}
                    sub={ratio(t.blindNilsMade, t.blindNils)}
                  />
                  <Tile
                    label={p.bagsPerHand}
                    value={t.bagsPerHand == null ? p.dash : t.bagsPerHand.toFixed(1)}
                  />
                  <Tile label={p.sets} value={String(t.sets)} />
                  <Tile label={p.best} value={t.bestScore == null ? p.dash : String(t.bestScore)} />
                </dl>
                <p className="mt-2 text-13 text-[var(--tx2)]">{stats ? p.online : p.local}</p>
              </Section>

              {vs && (
                <Section title={p.vsTitle(who.name)}>
                  <dl className="grid grid-cols-2 gap-2">
                    <div className="glass flex flex-col gap-1 px-4 py-3">
                      <dt className="text-13 font-bold text-[var(--tx2)]">{p.together}</dt>
                      <dd className="text-16 font-bold">
                        {p.togetherLine(vs.togetherWins, vs.together)}
                      </dd>
                    </div>
                    <div className="glass flex flex-col gap-1 px-4 py-3">
                      <dt className="text-13 font-bold text-[var(--tx2)]">{p.against}</dt>
                      <dd className="text-16 font-bold">
                        {p.againstLine(vs.aWins, vs.bWins, vs.draws)}
                      </dd>
                    </div>
                  </dl>
                </Section>
              )}

              <Section title={p.partners}>
                {partners.length ? (
                  <ol className="flex flex-col gap-2">
                    {partners
                      .slice()
                      .sort((x, y) => y.wins / y.games - x.wins / x.games || y.games - x.games)
                      .slice(0, 8)
                      .map((x, i) => {
                        const w = lookup(x.id);
                        return (
                          <m.li
                            key={x.id}
                            {...stagger(Math.min(i, 8))}
                            className="glass flex min-h-14 items-center gap-3 px-3 py-2"
                          >
                            <Avatar
                              p={w}
                              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-16"
                            />
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className="[overflow-wrap:anywhere] text-16 font-bold">
                                {w.name}
                              </span>
                              <span className="text-13 text-[var(--tx2)]">
                                {p.partnerLine(x.wins, x.games)}
                              </span>
                            </span>
                            <span className="disp text-20 font-extrabold tabular-nums">
                              {b.pct(x.wins / x.games)}
                            </span>
                          </m.li>
                        );
                      })}
                  </ol>
                ) : (
                  <p className="text-14 text-[var(--tx2)]">{p.noPartners}</p>
                )}
              </Section>
            </>
          )
        }
      </Gate>
    </SpPage>
  );
}
