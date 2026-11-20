import { m, useReducedMotion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { Dot } from '@/components/ui/Dot';
import { SPRING_POP } from '@/components/ui/motion';
import type { SikkePerson } from '@/components/sikke/GameSikke';
import { playCue } from '@/fx/feedback';
import { crowns as s } from '@/strings/crowns';
import { useGameStatus } from '@/sync/news';

/**
 * "+40 🪙 bounty" per player who beat a crown holder in this game (REWARDS-PLAN §6.4), from the server's answer to
 * the game's upload. Signed out, or with no bounty paid, it shows nothing.
 */
export function BountyChips({ gameId, people }: { gameId: string; people: SikkePerson[] }) {
  const rm = useReducedMotion();
  const st = useGameStatus(gameId);
  const rows = (st?.bounties ?? []).map((b) => {
    const seat = people.find((p) => p.id === b.winner.id);
    const held = people.find((p) => p.id === b.holder.id);
    return {
      b,
      face: seat ?? b.winner,
      winner: seat?.name ?? b.winner.displayName,
      holder: held?.name ?? b.holder.displayName,
    };
  });
  const rung = useRef(false);
  useEffect(() => {
    if (!rows.length || rung.current) return;
    rung.current = true;
    playCue({ name: 'coin', gain: 0.9 });
  }, [rows.length]);
  if (!rows.length) return null;
  return (
    <ul data-bounties aria-label={s.bountyHeading} className="mt-3 flex flex-wrap gap-2">
      {rows.map(({ b, face, winner, holder }, i) => (
        <m.li
          key={`${b.winner.id}:${b.holder.id}`}
          aria-label={s.bountySaid(b.amount, winner, holder)}
          initial={rm ? false : { opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...SPRING_POP, delay: 0.2 + i * 0.12 }}
          className="glass flex min-h-11 max-w-full items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 text-14"
        >
          <Dot p={face} s={28} />
          <span aria-hidden className="min-w-0 [overflow-wrap:anywhere]">
            <span className="font-bold">{winner}</span>{' '}
            <span className="num font-bold text-[var(--gold-tx)]">{s.bountyChip(b.amount)}</span>{' '}
            <span className="text-[var(--tx2)]">{s.bountyBeat(holder)}</span>
          </span>
        </m.li>
      ))}
    </ul>
  );
}
