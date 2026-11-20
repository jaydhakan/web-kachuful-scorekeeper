import { MedalName } from '@/components/ui/MedalName';
import { useMedalOf, useMedals } from '@/games/kachuful/state/medals';
import { medals } from '@/strings/medals';

/**
 * A seated player's name with their month's medal, if they hold one (REWARDS-PLAN §6.7). `chase` adds the
 * "On track for 🥇" chip when the game as it stands would give them a better medal.
 */
export function SeatName({
  p,
  glyph,
  chase = false,
  after = false,
}: {
  p: { id?: string; name: string };
  glyph?: boolean;
  chase?: boolean;
  /** The medals as the game leaves them (the winner screen), not as it found them. */
  after?: boolean;
}) {
  const id = p.id ?? '';
  const { mark, slipping } = useMedalOf(after)(id);
  const track = useMedals().chase.onTrack.get(id);
  return (
    <>
      <MedalName name={p.name} mark={mark} slipping={slipping} glyph={glyph} />
      {chase && track && (
        <span
          data-on-track={track}
          className={`ml-1.5 inline-block whitespace-nowrap rounded-full border border-current px-1.5 align-middle text-13 font-bold leading-5 medal-${track}`}
        >
          <span aria-hidden>{medals.onTrack(track)}</span>
          <span className="sr-only">{medals.onTrackSr(p.name, track)}</span>
        </span>
      )}
    </>
  );
}
