import { PODIUM_BG, rankTone } from './rankTones';

/**
 * A place in a standings list. Once the game is over the top three get the podium's gold, silver and bronze discs,
 * as on Winner and Awards; while it runs, and from fourth down, the number.
 */
export function RankMark({ rank, final }: { rank: number; final: boolean }) {
  if (final && rank <= 3)
    return (
      <span
        className={`disp grid h-7 w-7 shrink-0 place-items-center rounded-full text-15 font-extrabold text-ink-podium ${PODIUM_BG[rank as 1 | 2 | 3]}`}
      >
        {rank}
      </span>
    );
  return (
    <span className={`disp w-7 shrink-0 text-center text-20 font-extrabold ${rankTone(rank)}`}>
      {rank}
    </span>
  );
}
