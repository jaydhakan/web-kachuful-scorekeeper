import { useEffect, useMemo } from 'react';
import { nightOf, type Night } from '@/games/kachuful/domain';
import { sgnN } from '@/lib/format';
import { useDeviceFacts, whoIs, type Who } from '@/games/kachuful/state/useFacts';
import { useApp } from '@/games/kachuful/state/store';
import { StoryDeck, type Slide } from '@/games/kachuful/components/StoryDeck';
import { markNightOpened } from '@/games/kachuful/components/NightReady';
import { YourNights } from '@/games/kachuful/components/YourNights';
import { night as s, nights as ns } from '@/games/kachuful/strings/night';
import { byCode } from '@/progression/catalogue';
import { SIKKE } from '@/progression/sikke';
import { peekProgression } from '@/progression/registry';
import { useEveryCatalogue } from '@/components/progression/ActivityPage';
import { ep } from '@/sync/endpoints';
import type { NightData, PlayerSummary } from '@/sync/types';
import { useRemote } from '@/sync/useRemote';
import { RemotePending } from '@/components/RemoteGate';
import { sikke } from '@/strings/sikke';
import { EmptyState, Page } from '@/components/ui/Page';
import { Avatar } from '@/components/ui/Avatar';
import { icon } from '@/components/ui/IconsMore';

const ART = 'h-[4.5rem] w-[4.5rem] text-[var(--accent-tx)]';
const FACE = 'grid h-24 w-24 place-items-center rounded-full text-52';
// A list card shows this many lines, then "and N more", so it never outgrows the card on a small phone.
const LINES = 4;

type WhoOf = (id: string) => Who & { photoUrl?: string | null };

/** The night's people as the server names them; anyone it left out falls back to this device's registry. */
export const whoFrom =
  (players: PlayerSummary[]): WhoOf =>
  (id) => {
    const p = players.find((x) => x.id === id);
    return p
      ? { id, name: p.displayName, emoji: p.emoji, color: p.color, photoUrl: p.photoUrl }
      : whoIs(null, id);
  };

function Lines({ lines }: { lines: string[] }) {
  const shown = lines.slice(0, LINES);
  return (
    <span className="flex flex-col gap-1 text-16">
      {shown.map((l, k) => (
        <span key={k} className="[overflow-wrap:anywhere]">
          {l}
        </span>
      ))}
      {lines.length > LINES && <span>{ns.achievements.more(lines.length - LINES)}</span>}
    </span>
  );
}

/**
 * The night's cards, in the order the room retells it (plan §7.2); a card with nothing to say is left out. `more`
 * (the server's cards) go before the story.
 */
export function nightSlides(n: Night, who: WhoOf, more: Slide[] = []): Slide[] {
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
  out.push(...more);
  out.push({
    kicker: s.story.kicker,
    big: n.winner ? s.story.won(who(n.winner).name, top.wins, n.gameIds.length) : s.story.none,
    emoji: icon('trophy', ART),
  });
  return out;
}

/** What only the server knows: tonight's Sitara, the achievements earned and the Sikke paid. */
export function serverSlides(d: NightData, who: WhoOf): Slide[] {
  const out: Slide[] = [];
  if (d.sitara.length)
    out.push({
      kicker: ns.sitara.kicker,
      big: ns.sitara.big(d.sitara.map((id) => who(id).name)),
      sub: ns.sitara.sub(sikke.plus(SIKKE.sitara)),
      emoji: '⭐',
    });
  if (d.achievements.length)
    out.push({
      kicker: ns.achievements.kicker,
      big: String(d.achievements.length),
      sub: (
        <Lines
          lines={d.achievements.map((a) => {
            const p = peekProgression(a.game);
            const def = p && byCode(p).get(a.code);
            const name = p?.strings.achievements[a.code]?.name ?? a.code;
            return ns.achievements.line(def?.emoji ?? '🏅', name, who(a.playerId).name);
          })}
        />
      ),
      emoji: icon('medal', ART),
    });
  const paid = Object.entries(d.sikke)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  if (paid.length)
    out.push({
      kicker: ns.sikke.kicker,
      big: ns.sikke.total(paid.reduce((t, [, v]) => t + v, 0)),
      sub: <Lines lines={paid.map(([id, v]) => ns.sikke.line(who(id).name, sikke.plus(v)))} />,
      emoji: sikke.glyph,
    });
  return out;
}

const deck = (slides: Slide[]) => (
  <StoryDeck slides={slides} label={s.tap} prev={s.prev} next={s.next} />
);

/** The counted night's story; mounted with its data, so the catalogues it names achievements from load then. */
function ServerStory({ d, players }: { d: NightData; players: PlayerSummary[] }) {
  // Re-renders once every game's catalogue has loaded (an unknown code reads as itself meanwhile).
  useEveryCatalogue(d.achievements.length > 0);
  const who = whoFrom(players);
  return deck(nightSlides(d, who, serverSlides(d, who)));
}

/** One night as the server counted it, on every phone that sat (backend-requests §7). */
function ServerNight({ id }: { id: string }) {
  const r = useRemote(`night:${id}`, (o) => ep.night(id, o));
  const d = r.data?.data ?? null;
  useEffect(() => {
    if (d) markNightOpened(id);
  }, [d, id]);
  if (!r.data) return <RemotePending r={r} rows={3} />;
  if (!d)
    return (
      <EmptyState
        icon="hourglass"
        title={ns.counting}
        body={ns.countingBody}
        action={
          <button
            type="button"
            onClick={r.reload}
            disabled={r.loading}
            className="press glass min-h-12 rounded-2xl px-5 text-16 font-bold disabled:opacity-60"
          >
            {ns.checkAgain}
          </button>
        }
      />
    );
  return <ServerStory d={d} players={r.data.players} />;
}

/** Tonight from this device's own games (the table device shows it to the room), and signed in, my nights. */
function NightsHome({ me }: { me: string | null }) {
  const f = useDeviceFacts();
  const n = useMemo(() => nightOf(f, Date.now()), [f]);
  return (
    <Page title={n || !me ? s.title : ns.title}>
      {n ? (
        <div className="mb-8">{deck(nightSlides(n, (id) => whoIs(f, id)))}</div>
      ) : (
        !me && <EmptyState icon="gift" title={s.empty} body={s.emptyBody} />
      )}
      {me && <YourNights playerId={me} titled={!!n} />}
    </Page>
  );
}

/** Baithak Wrapped for a night: with an id, that night from the server; without, tonight and my nights. */
export function NightPage({ id }: { id?: string }) {
  const { state, actions } = useApp();
  const session = state.session;
  if (!id) return <NightsHome me={session?.player?.id ?? null} />;
  return (
    <Page title={s.title}>
      {session ? (
        <ServerNight id={id} />
      ) : (
        <EmptyState
          icon="gift"
          title={ns.signedOut}
          body={ns.signedOutBody}
          action={
            <button
              type="button"
              onClick={() => actions.open({ screen: 'signin' })}
              className="press glass min-h-12 rounded-2xl px-5 text-16 font-bold"
            >
              {ns.signIn}
            </button>
          }
        />
      )}
    </Page>
  );
}
