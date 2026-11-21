import { useMemo } from 'react';
import { nightOf } from '@/games/kachuful/domain';
import { useApp } from '@/games/kachuful/state/store';
import { useDeviceFacts, whoIs } from '@/games/kachuful/state/useFacts';
import { Avatar } from '@/components/ui/Avatar';
import { night as s } from '@/games/kachuful/strings/night';
import { icon } from '@/components/ui/IconsMore';

/** Chips shown for tonight's standing; the rest are in the Wrapped. */
const SHOWN = 6;

/**
 * "Tonight so far" and a way into Tonight's Wrapped, on the winner screen once tonight has two games or more
 * (REWARDS-PLAN §7.1: the dead spot between games): each player's wins tonight and who took the Kursi.
 */
export function NightLink({ className = '' }: { className?: string }) {
  const { actions } = useApp();
  const f = useDeviceFacts();
  const n = useMemo(() => nightOf(f, Date.now()), [f]);
  if (!n || n.gameIds.length < 2) return null;
  const last = n.kursi.at(-1);
  const name = (id: string) => whoIs(f, id).name;
  return (
    <section aria-labelledby="tonight-so-far" className={className}>
      <h2 id="tonight-so-far" className="mb-2 text-15 font-bold text-[var(--tx2)]">
        {s.soFar.title}
      </h2>
      <ul className="mb-2 flex flex-wrap gap-1.5">
        {n.players.slice(0, SHOWN).map((p) => (
          <li
            key={p.playerId}
            className="glass flex min-h-11 min-w-0 items-center gap-2 rounded-full py-1 pl-1 pr-3"
          >
            <Avatar
              p={whoIs(f, p.playerId)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-17"
            />
            <span className="min-w-0 text-14 [overflow-wrap:anywhere]">
              <span className="font-bold">{name(p.playerId)}</span>{' '}
              <span className="text-[var(--tx2)]">{s.soFar.wins(p.wins)}</span>
            </span>
          </li>
        ))}
      </ul>
      {last && (
        <p className="mb-2 text-14 [overflow-wrap:anywhere]">
          <span aria-hidden>🪑 </span>
          {s.kursi.line(last.to.map(name), last.from.map(name))}
        </p>
      )}
      <button
        type="button"
        data-night-link
        onClick={() => actions.open({ screen: 'night' })}
        className="press glass flex min-h-14 w-full items-center gap-3 rounded-2xl px-4 py-2 text-left"
      >
        <span aria-hidden className="text-[var(--accent-tx)]">
          {icon('gift', 'h-7 w-7')}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-16 font-bold">{s.open}</span>
          <span className="text-14 text-[var(--tx2)]">{s.openHint(n.gameIds.length)}</span>
        </span>
      </button>
    </section>
  );
}
