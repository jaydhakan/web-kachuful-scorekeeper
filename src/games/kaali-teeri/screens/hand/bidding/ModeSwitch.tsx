import { m } from 'framer-motion';
import { useKt } from '@/games/kaali-teeri/state/store';
import { curHand } from '@/games/kaali-teeri/state/select';
import { ktBidding } from '@/games/kaali-teeri/strings/bidding';
import { ToggleTrack } from '@/components/ui/Toggle';

/** Quick mode on or off: the hand's mode, remembered on this device by the store. */
export function ModeSwitch() {
  const { state, actions } = useKt();
  const g = state.game;
  if (!g) return null;
  const quick = curHand(g).mode === 'quick';
  const s = ktBidding.mode;
  return (
    <m.button
      type="button"
      role="switch"
      aria-checked={quick}
      onClick={() => actions.setMode(quick ? 'auction' : 'quick')}
      whileTap="press"
      className="mb-2 flex min-h-12 w-full shrink-0 items-center justify-between gap-3 rounded-2xl px-1 text-left"
    >
      <span className="flex min-w-0 flex-col">
        <span className="text-16 font-bold tracking-[-0.01em]">{s.quick}</span>
        <span className="text-14 leading-5 text-[var(--tx2)]">
          {quick ? s.quickHint : s.auctionHint}
        </span>
      </span>
      <ToggleTrack on={quick} />
    </m.button>
  );
}
