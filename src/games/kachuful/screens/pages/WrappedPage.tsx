import { useMemo, useState } from 'react';
import { StoryDeck, type Slide } from '@/games/kachuful/components/StoryDeck';
import { wrapped, type Facts, type Wrapped } from '@/games/kachuful/domain';
import { monthLabel, parseDay, shortDay } from '@/lib/dates';
import { sgnN } from '@/lib/format';
import { useDeviceFacts, whoIs } from '@/games/kachuful/state/useFacts';
import { Chip, ChipRow, EmptyState, Page } from '@/components/ui/Page';
import { Counter } from '@/components/ui/Counter';
import { pct } from '@/components/ui/Stats';
import { SuitGlyph } from '@/components/ui/SuitGlyph';
import { TR } from '@/theme/trumps';
import { useApp } from '@/games/kachuful/state/store';
import { ep } from '@/sync/endpoints';
import { useRemote } from '@/sync/useRemote';
import { RemotePending } from '@/components/RemoteGate';
import { t } from '@/strings';
import { icon } from '@/components/ui/IconsMore';
import { PlayerTag } from '@/components/ui/PlayerTag';
import { Avatar } from '@/components/ui/Avatar';

const wr = t.hub.wrapped;

// Slide art: the size of the 72px emoji it replaced.
const ART = 'h-[4.5rem] w-[4.5rem] text-[var(--accent-tx)]';
// The people slides show the player's own face at the same size.
const FACE = 'grid h-24 w-24 place-items-center rounded-full text-52';

function slidesOf(w: Wrapped, f: Facts | null): Slide[] {
  const out: Slide[] = [
    {
      kicker: wr.slides.totals(w.totals.rounds),
      big: <Counter from={0} to={w.totals.points} run />,
      sub: wr.slides.points,
      emoji: icon('cards', ART),
    },
  ];
  if (w.bestMonth)
    out.push({
      kicker: wr.slides.bestMonth,
      big: monthLabel(parseDay(w.bestMonth.month + '-01')),
      sub: sgnN(w.bestMonth.points),
      emoji: icon('calendar', ART),
    });
  if (w.bestDay)
    out.push({
      kicker: wr.slides.bestDay,
      big: shortDay(parseDay(w.bestDay.day)),
      sub: sgnN(w.bestDay.points),
      emoji: icon('sun', ART),
    });
  if (w.favouriteTrump)
    out.push({
      kicker: wr.slides.trump,
      big: (
        <>
          <SuitGlyph trump={w.favouriteTrump.trump} /> {TR[w.favouriteTrump.trump].name}
        </>
      ),
      sub: pct(w.favouriteTrump.accuracy),
      emoji: icon('clover', ART),
    });
  if (w.nemesis)
    out.push({
      kicker: wr.slides.nemesis,
      big: whoIs(f, w.nemesis.playerId).name,
      sub: `${w.nemesis.losses}×`,
      emoji: <Avatar p={whoIs(f, w.nemesis.playerId)} className={FACE} />,
    });
  if (w.partner)
    out.push({
      kicker: wr.slides.partner,
      big: whoIs(f, w.partner.playerId).name,
      sub: t.hub.player.games_(w.partner.games),
      emoji: <Avatar p={whoIs(f, w.partner.playerId)} className={FACE} />,
    });
  if (w.biggestRound)
    out.push({
      kicker: wr.slides.biggest,
      big: sgnN(w.biggestRound.points),
      emoji: icon('bolt', ART),
    });
  out.push({
    kicker: wr.slides.run,
    big: <Counter from={0} to={w.longestRun} run />,
    emoji: icon('fire', ART),
  });
  out.push({
    kicker: wr.slides.achievements,
    big: <Counter from={0} to={w.achievements} run />,
    emoji: icon('medal', ART),
  });
  out.push({
    kicker: wr.slides.rank,
    // The rank climbs the board from last place to the player's own.
    big: (run) =>
      w.rank.rank ? (
        <>
          #<Counter from={w.rank.outOf} to={w.rank.rank} run={run} />
        </>
      ) : (
        '–'
      ),
    sub: w.rank.rank ? `/ ${w.rank.outOf}` : wr.slides.unranked,
    emoji: icon('trophy', ART),
  });
  return out;
}

export function WrappedPage({
  year,
  playerId,
  data,
  facts,
}: {
  year: number;
  playerId?: string;
  data?: Wrapped;
  facts?: Facts;
}) {
  const device = useDeviceFacts();
  const f = facts ?? device;
  const ids = useMemo(() => [...new Set(f.rounds.map((r) => r.playerId))], [f]);
  const session = useApp().state.session;
  const [who, setWho] = useState(playerId ?? session?.player?.id ?? ids[0] ?? null);
  const remote = useRemote(session && who ? `wr:${year}:${who}` : null, (o) =>
    ep.wrapped(year, who!, o),
  );
  const w = useMemo(
    () =>
      data ?? (remote.data as Wrapped | null) ?? (who && !session ? wrapped(f, who, year) : null),
    [data, f, who, year, remote.data, session],
  );
  const slides = w && w.totals.rounds ? slidesOf(w, f) : [];
  return (
    <Page
      title={wr.title(year)}
      sub={
        !data &&
        ids.length > 1 && (
          <ChipRow label={t.hub.awards.pickPlayer}>
            {ids.map((id) => (
              <Chip key={id} on={who === id} onClick={() => setWho(id)}>
                <PlayerTag p={whoIs(f, id)} name={whoIs(f, id).name} />
              </Chip>
            ))}
          </ChipRow>
        )
      }
    >
      {!data && session && who && remote.data == null ? (
        <RemotePending r={remote} rows={3} />
      ) : !slides.length ? (
        <EmptyState icon="gift" title={wr.notEnough} body={wr.notEnoughBody} />
      ) : (
        <StoryDeck slides={slides} label={wr.tap} prev={wr.prev} next={wr.next} />
      )}
    </Page>
  );
}
