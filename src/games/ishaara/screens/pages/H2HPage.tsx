import { useIshaaraHeadToHead } from '@/games/ishaara/state/lists';
import { ipg } from '@/games/ishaara/strings/pages';
import { RemoteGate } from '@/components/RemoteGate';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState, Section } from '@/components/ui/PageParts';
import { StatTile, TileGrid } from '@/components/ui/Stats';
import { IshPage, useHubNav, type Who } from './parts';

const x = ipg.h2h;

/** Two players over the finished games they both sat in: as teammates and across the table. */
export function H2HPage({ a, b }: { a: Who; b: Who }) {
  const r = useIshaaraHeadToHead(a.id, b.id);
  return (
    <IshPage eyebrow={x.title} title={`${a.name} · ${b.name}`}>
      <div className="mb-5 flex items-center justify-center gap-6">
        <Face w={a} />
        <span aria-hidden className="disp text-20 font-extrabold text-[var(--tx2)]">
          ×
        </span>
        <Face w={b} />
      </div>
      <RemoteGate r={r}>
        {(o) =>
          !o.games ? (
            <EmptyState icon="handshake" title={x.none} body={x.noneBody} />
          ) : (
            <>
              <Section>
                <TileGrid>
                  <StatTile label={x.games} value={o.games} />
                  <StatTile
                    label={x.together}
                    value={o.together}
                    sub={x.togetherSub(o.togetherWins)}
                  />
                  <StatTile label={x.against} value={o.against} />
                </TileGrid>
              </Section>
              {o.against > 0 && (
                <Section title={x.against}>
                  <TileGrid>
                    <StatTile label={x.wins(a.name)} value={o.aWins} />
                    <StatTile label={x.wins(b.name)} value={o.bWins} />
                  </TileGrid>
                </Section>
              )}
            </>
          )
        }
      </RemoteGate>
    </IshPage>
  );
}

/** A player's face and name; tapping opens their stats. */
function Face({ w }: { w: Who }) {
  const { open } = useHubNav();
  return (
    <button
      type="button"
      onClick={() => open({ page: 'player', who: w })}
      className="press flex min-h-12 flex-col items-center gap-1.5 rounded-2xl px-2 py-1"
    >
      <Avatar p={w} className="grid h-16 w-16 place-items-center rounded-full text-36" />
      <span className="text-15 font-bold [overflow-wrap:anywhere]">{w.name}</span>
    </button>
  );
}
