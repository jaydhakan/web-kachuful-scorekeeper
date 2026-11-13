import { m } from 'framer-motion';
import { useMemo, useState } from 'react';
import { roster } from '@/games/kaali-teeri/domain';
import { useKt } from '@/games/kaali-teeri/state/store';
import { kpg } from '@/games/kaali-teeri/strings/pages';
import { nameKey } from '@/people';
import { Avatar } from '@/components/ui/Avatar';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icons';
import { EmptyState } from '@/components/ui/PageParts';
import { stagger } from '@/components/ui/stagger';
import { Gate, KtPage, NoGames, RowButton, useWho } from './parts';
import { useKtGames } from './source';

const ps = kpg.players;

/** Everyone who has played a hand here, most games first; a row opens their stats. */
export function PlayersPage() {
  const src = useKtGames();
  const { actions } = useKt();
  const [q, setQ] = useState('');
  const who = useWho(src.games);
  const all = useMemo(() => roster(src.games), [src.games]);
  const shown = all.filter((r) => nameKey(who(r.playerId).name).includes(nameKey(q)));
  return (
    <KtPage
      title={ps.title}
      sub={
        all.length > 0 && (
          <Field label={ps.search} value={q} onChange={setQ} type="search" autoComplete="off" />
        )
      }
    >
      <Gate src={src} rows={6}>
        {() =>
          !all.length ? (
            <NoGames title={ps.emptyTitle} body={ps.emptyBody} />
          ) : !shown.length ? (
            <EmptyState
              icon="search"
              title={ps.noResults(q.trim())}
              action={
                <button
                  type="button"
                  onClick={() => setQ('')}
                  className="press min-h-12 px-3 text-16 font-bold text-[var(--accent-tx)]"
                >
                  {ps.clear}
                </button>
              }
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {shown.map((r, i) => {
                const w = who(r.playerId);
                return (
                  <m.li key={r.playerId} {...stagger(Math.min(i, 10))}>
                    <RowButton onClick={() => actions.openPage({ page: 'player', id: r.playerId })}>
                      <Avatar
                        p={w}
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-22"
                      />
                      <span className="min-w-0 flex-1 text-17 font-bold [overflow-wrap:anywhere]">
                        {w.name}
                      </span>
                      <span className="text-14 text-[var(--tx2)]">{ps.sub(r.games)}</span>
                      <span aria-hidden className="text-[var(--dis)]">
                        {Icon.chev}
                      </span>
                    </RowButton>
                  </m.li>
                );
              })}
            </ul>
          )
        }
      </Gate>
    </KtPage>
  );
}
