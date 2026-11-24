import { useFxPrefs } from '@/fx/prefs';
import { doneRounds, pickIndex, type Game, type Round } from '@/games/kachuful/domain';
import { useMedals } from '@/games/kachuful/state/medals';
import { poolFor } from '@/games/kachuful/strings/banter';

export { BanterLine } from '@/components/crowns/BanterLine';

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
