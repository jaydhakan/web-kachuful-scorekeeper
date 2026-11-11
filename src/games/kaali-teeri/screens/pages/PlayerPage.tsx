import { useMemo } from 'react';
import { opponents, playerGames, playerStats } from '@/games/kaali-teeri/domain';
import { useKt } from '@/games/kaali-teeri/state/store';
import { useKtPlayerStats } from '@/games/kaali-teeri/sync/boards';
import { kpg } from '@/games/kaali-teeri/strings/pages';
import { dayLabel } from '@/lib/dates';
import { fmt } from '@/lib/format';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState, Section } from '@/components/ui/PageParts';
import { Gate, KtPage, RowButton, Tile, Tiles, useWho } from './parts';
import { useKtGames } from './source';

const p = kpg.player,
  tl = p.tiles;

/** One player's stats over every game on this device: games, bidding, partnering, recent games and who they play with. */
export function PlayerPage({ id }: { id: string }) {
  const src = useKtGames();
  const { actions } = useKt();
  const who = useWho(src.games);
  const w = who(id);
  const local = useMemo(() => playerStats(src.games, id), [src.games, id]);
  // Signed in, a registered player's numbers cover every synced game; a name-only seat, or no answer, stays local.
  const remote = useKtPlayerStats(id.startsWith('name:') ? null : id);
  const s = remote.online && remote.data ? remote.data : local;
  const recent = useMemo(() => playerGames(src.games, id).slice(0, 6), [src.games, id]);
  const rivals = useMemo(() => opponents(src.games, id).slice(0, 5), [src.games, id]);
  const mate = s.mostPartner && who(s.mostPartner.playerId);
  const h2h = (b: string) => actions.openPage({ page: 'h2h', a: id, b });
  return (
    <KtPage wide eyebrow={p.eyebrow} title={w.name}>
      <div className="mb-5 flex justify-center">
        <Avatar p={w} className="grid h-24 w-24 place-items-center rounded-full text-52" />
      </div>
      <Gate src={src}>
        {() =>
          !s.games ? (
            <EmptyState icon="cards" title={p.notFound} body={p.notFoundBody} />
          ) : (
            <>
              <Section title={p.games}>
                <Tiles>
                  <Tile label={tl.games} value={s.games} />
                  <Tile
                    label={tl.wins}
                    value={s.wins}
                    sub={s.winRate == null ? undefined : `${tl.winRate} ${kpg.pct(s.winRate)}`}
                  />
                  <Tile
                    label={tl.avgPlace}
                    value={s.avgPlace == null ? '–' : s.avgPlace.toFixed(1)}
                  />
                  <Tile label={tl.points} value={fmt(s.points)} />
                  <Tile label={tl.best} value={s.bestGame ? fmt(s.bestGame.points) : '–'} />
                </Tiles>
              </Section>
              <Section title={p.bidding}>
                <Tiles>
                  <Tile label={tl.handsBid} value={s.handsBid} />
                  <Tile
                    label={tl.made}
                    value={kpg.pct(s.madeRate)}
                    sub={p.madeOf(s.bidsMade, s.handsBid)}
                  />
                  <Tile label={tl.avgBid} value={s.avgBid == null ? '–' : Math.round(s.avgBid)} />
                  <Tile label={tl.highest} value={s.highestMade ?? '–'} />
                  <Tile label={tl.lost} value={s.handsLost} />
                  <Tile label={tl.sweeps} value={s.sweeps} />
                  <Tile
                    label={tl.streak}
                    value={s.madeStreak.current}
                    sub={p.bestStreak(s.madeStreak.best)}
                  />
                </Tiles>
              </Section>
              <Section title={p.partner}>
                <Tiles>
                  <Tile label={tl.called} value={s.timesPartner} />
                  <Tile
                    label={tl.partnerRate}
                    value={kpg.pct(s.partnerWinRate)}
                    sub={p.madeOf(s.partnerMade, s.timesPartner)}
                  />
                  <Tile label={tl.double} value={s.doubleSlots} />
                </Tiles>
                {mate && s.mostPartner && (
                  <div className="mt-2">
                    <RowButton
                      label={p.vs(w.name, mate.name)}
                      onClick={() => h2h(s.mostPartner!.playerId)}
                    >
                      <Avatar
                        p={mate}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-20"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-13 font-bold uppercase tracking-[0.08em] text-[var(--tx2)]">
                          {p.mostWith}
                        </span>
                        <span className="block text-17 font-bold [overflow-wrap:anywhere]">
                          {mate.name}
                        </span>
                      </span>
                      <span className="text-14 text-[var(--tx2)]">
                        {p.together(s.mostPartner.hands, s.mostPartner.made)}
                      </span>
                    </RowButton>
                  </div>
                )}
              </Section>
              <div className="grid grid-cols-1 gap-x-6 [[data-desk]_&]:grid-cols-2">
                <Section title={p.recent}>
                  <ul className="flex flex-col gap-2">
                    {recent.map((g) => (
                      <li key={g.gameId}>
                        <RowButton onClick={() => actions.openPage({ page: 'game', id: g.gameId })}>
                          <span className="disp w-8 text-20 font-extrabold">
                            {p.place(g.place)}
                          </span>
                          <span className="flex-1 text-15">
                            {g.ended ? dayLabel(g.at) : p.unfinished}
                          </span>
                          <span className="disp text-18 font-extrabold">{fmt(g.points)}</span>
                        </RowButton>
                      </li>
                    ))}
                  </ul>
                </Section>
                <Section title={p.opponents}>
                  <ul className="flex flex-col gap-2">
                    {rivals.map((o) => {
                      const ow = who(o.playerId);
                      return (
                        <li key={o.playerId}>
                          <RowButton label={p.vs(w.name, ow.name)} onClick={() => h2h(o.playerId)}>
                            <Avatar
                              p={ow}
                              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-18"
                            />
                            <span className="flex-1 text-16 font-bold [overflow-wrap:anywhere]">
                              {ow.name}
                            </span>
                            <span className="text-14 text-[var(--tx2)]">{p.shared(o.games)}</span>
                          </RowButton>
                        </li>
                      );
                    })}
                  </ul>
                </Section>
              </div>
            </>
          )
        }
      </Gate>
    </KtPage>
  );
}
