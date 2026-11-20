import { MedalName } from '@/components/ui/MedalName';
import { useMedalOf } from '@/games/kachuful/state/medals';

/** A seated player's name with their month's medal, if they hold one (REWARDS-PLAN §6.7). */
export function SeatName({ p, glyph }: { p: { id?: string; name: string }; glyph?: boolean }) {
  const { mark, slipping } = useMedalOf()(p.id ?? '');
  return <MedalName name={p.name} mark={mark} slipping={slipping} glyph={glyph} />;
}
