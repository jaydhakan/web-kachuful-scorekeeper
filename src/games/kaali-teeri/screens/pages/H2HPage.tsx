import { useMemo } from 'react';
import { headToHead } from '@/games/kaali-teeri/domain';
import { useKtHeadToHead } from '@/games/kaali-teeri/sync/boards';
import { useKt } from '@/games/kaali-teeri/state/store';
import { kpg } from '@/games/kaali-teeri/strings/pages';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState, Section } from '@/components/ui/PageParts';
import { Gate, KtPage, Tile, Tiles, useWho, type Who } from './parts';
import { useKtGames } from './source';

const x = kpg.h2h;

/** Two players over the games they shared: who finished ahead, hands on one team, and bids against each other. */
export function H2HPage({ a, b }: { a: string; b: string }) {
  const src = useKtGames();
  const who = useWho(src.games);
  const wa = who(a),
    wb = who(b);
  const local = useMemo(() => headToHead(src.games, a, b), [src.games, a, b]);
  const named = (k: string) => (k.startsWith('name:') ? null : k);
  const remote = useKtHeadToHead(named(a), named(b));
  const o = remote.online && remote.data ? remote.data : local;
  return (
    <KtPage eyebrow={x.title} title={`${wa.name} · ${wb.name}`}>
      <div className="mb-5 flex items-center justify-center gap-6">
        <Face w={wa} />
        <span aria-hidden className="disp text-20 font-extrabold text-[var(--tx2)]">
          ×
        </span>
        <Face w={wb} />
      </div>
      <Gate src={src}>
        {() =>
          !o.games ? (
            <EmptyState icon="handshake" title={x.none} body={x.noneBody} />
          ) : (
            <>
              <Section>
                <Tiles>
                  <Tile label={x.games} value={o.games} />
                  <Tile label={x.ahead(wa.name)} value={o.aAhead} />
                  <Tile label={x.ahead(wb.name)} value={o.bAhead} />
                  <Tile label={x.level} value={o.level} />
                </Tiles>
              </Section>
              <Section>
                <Tiles>
                  <Tile
                    label={x.together}
                    value={o.together}
                    sub={x.madeOf(o.togetherMade, o.together)}
                  />
                  <Tile
                    label={x.against(wa.name)}
                    value={o.aBidAgainstB}
                    sub={x.madeOf(o.aMadeAgainstB, o.aBidAgainstB)}
                  />
                  <Tile
                    label={x.against(wb.name)}
                    value={o.bBidAgainstA}
                    sub={x.madeOf(o.bMadeAgainstA, o.bBidAgainstA)}
                  />
                </Tiles>
              </Section>
            </>
          )
        }
      </Gate>
    </KtPage>
  );
}

/** A player's face and name; tapping opens their stats. */
function Face({ w }: { w: Who }) {
  const { actions } = useKt();
  return (
    <button
      type="button"
      onClick={() => actions.openPage({ page: 'player', id: w.id })}
      className="press flex min-h-12 flex-col items-center gap-1.5 rounded-2xl px-2 py-1"
    >
      <Avatar p={w} className="grid h-16 w-16 place-items-center rounded-full text-36" />
      <span className="text-15 font-bold [overflow-wrap:anywhere]">{w.name}</span>
    </button>
  );
}
