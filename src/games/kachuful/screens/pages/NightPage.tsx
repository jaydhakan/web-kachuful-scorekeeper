import { useMemo } from 'react';
import { nightOf, type Facts, type Night } from '@/games/kachuful/domain';
import { sgnN } from '@/lib/format';
import { useDeviceFacts, whoIs } from '@/games/kachuful/state/useFacts';
import { StoryDeck, type Slide } from '@/games/kachuful/components/StoryDeck';
import { night as s } from '@/games/kachuful/strings/night';
import { EmptyState, Page } from '@/components/ui/Page';
import { Avatar } from '@/components/ui/Avatar';
import { icon } from '@/components/ui/IconsMore';

const ART = 'h-[4.5rem] w-[4.5rem] text-[var(--accent-tx)]';
const FACE = 'grid h-24 w-24 place-items-center rounded-full text-52';

/** The night's cards, in the order the room retells it (plan §7.2); a card with nothing to say is left out. */
export function nightSlides(n: Night, f: Facts | null): Slide[] {
  const who = (id: string) => whoIs(f, id);
  const face = (id: string) => <Avatar p={who(id)} className={FACE} />;
  const out: Slide[] = [
    {
      kicker: s.games.kicker,
      big: s.games.big(n.gameIds.length),
      sub: s.games.sub(n.players.length),
      emoji: icon('cards', ART),
    },
  ];
  const top = n.players[0];
  if (n.winner && top)
    out.push({
      kicker: s.winner.kicker,
      big: who(n.winner).name,
      sub: s.winner.sub(top.wins, n.gameIds.length),
      emoji: face(n.winner),
    });
  if (n.swing)
    out.push({
      kicker: s.swing.kicker,
      big: sgnN(n.swing.points),
      sub: s.swing.sub(who(n.swing.playerId).name),
      emoji: face(n.swing.playerId),
    });
  if (n.bestBid)
    out.push({
      kicker: s.bid.kicker,
      big: String(n.bestBid.bid),
      sub: s.bid.sub(who(n.bestBid.playerId).name, n.bestBid.cards),
      emoji: face(n.bestBid.playerId),
    });
  if (n.braveCall && n.braveCall.bid > 1)
    out.push({
      kicker: s.brave.kicker,
      big: String(n.braveCall.bid),
      sub: s.brave.sub(who(n.braveCall.playerId).name, n.braveCall.cards),
      emoji: face(n.braveCall.playerId),
    });
  for (const k of n.kursi)
    out.push({
      kicker: s.kursi.kicker,
      big: '🪑',
      sub: s.kursi.line(
        k.to.map((id) => who(id).name),
        k.from.map((id) => who(id).name),
      ),
      emoji: face(k.to[0]),
    });
  const last = n.kursi.at(-1);
  out.push({
    kicker: s.story.kicker,
    big: n.winner ? s.story.won(who(n.winner).name, top.wins, n.gameIds.length) : s.story.none,
    sub: last ? s.story.chair(last.to.map((id) => who(id).name)) : undefined,
    emoji: icon('trophy', ART),
  });
  return out;
}

/** Baithak Wrapped for tonight, from this device's games: the table device shows it to the room. */
export function NightPage() {
  const f = useDeviceFacts();
  const n = useMemo(() => nightOf(f, Date.now()), [f]);
  const slides = n ? nightSlides(n, f) : [];
  return (
    <Page title={s.title}>
      {!n ? (
        <EmptyState icon="gift" title={s.empty} body={s.emptyBody} />
      ) : (
        <StoryDeck slides={slides} label={s.tap} prev={s.prev} next={s.next} />
      )}
    </Page>
  );
}
