import { m } from 'framer-motion';
import { ToggleTrack } from '@/components/ui/Toggle';
import { lastGame as s } from '@/games/kachuful/strings/night';

/** "Last game of the night" beside the rematch (REWARDS-PLAN §7.1): the next game deals as the Final game. */
export function LastGameToggle({
  on,
  onChange,
  className = '',
}: {
  on: boolean;
  onChange: (on: boolean) => void;
  className?: string;
}) {
  return (
    <m.button
      type="button"
      role="switch"
      aria-checked={on}
      aria-describedby="last-game-hint"
      data-last-game
      onClick={() => onChange(!on)}
      whileTap="press"
      className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl text-left ${className}`}
    >
      <span className="flex min-w-0 flex-col">
        <span className="text-15 font-bold">{s.toggle}</span>
        <span id="last-game-hint" className="sr-only">
          {s.toggleHint}
        </span>
      </span>
      <ToggleTrack on={on} />
    </m.button>
  );
}
