import { m, useReducedMotion } from 'framer-motion';
import { useFxPrefs } from '@/fx/prefs';
import { doneRounds, pickIndex, type Game, type Round } from '@/games/kachuful/domain';
import { useMedals } from '@/games/kachuful/state/medals';
import { poolFor } from '@/games/kachuful/strings/banter';
import { EASE, REDUCED } from '@/components/ui/motion';

/** The round's banter (REWARDS-PLAN §6.7), worded from its pool; null with none, or with "Table banter" off. */
export function useRoundBanter(g: Game, r: Round): string | null {
  const { banter: log } = useMedals();
  const [fx] = useFxPrefs();
  if (!fx.banter) return null;
  const b = log[doneRounds(g).indexOf(r)];
  if (!b) return null;
  const pool = poolFor(b.kind, b.mark);
  if (!pool.length) return null;
  const name = (id?: string) => g.players.find((p) => p.id === id)?.name ?? '';
  return pool[pickIndex(`${g.syncId}:${r.index}`, pool.length)](name(b.who), name(b.other));
}

/** One cheeky line over the standings; announced once, as the line arrives after the status exists. */
export function BanterLine({
  text,
  show,
  anim,
  className = '',
}: {
  text: string;
  show: boolean;
  anim: boolean;
  className?: string;
}) {
  const rm = useReducedMotion();
  return (
    <p
      role="status"
      data-banter
      className={`min-h-5 font-semibold leading-5 text-[var(--gold-tx)] [text-wrap:balance] ${className}`}
    >
      {show && (
        <m.span
          className="inline-block"
          initial={anim ? { opacity: 0, y: rm ? 0 : 6 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: rm ? REDUCED : 0.25, ease: EASE }}
        >
          {text}
        </m.span>
      )}
    </p>
  );
}
