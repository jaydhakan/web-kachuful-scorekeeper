import type { KtGame, KtHand } from '@/games/kaali-teeri/domain';
import { useKt } from '@/games/kaali-teeri/state/store';
import { ktDesk as kd } from '@/games/kaali-teeri/strings/desk';
import { kp } from '@/games/kaali-teeri/strings/play';
import { KeyHints } from '@/components/desk/DeskParts';
import { Avatar } from '@/components/ui/Avatar';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { CalledCards } from '../hand/Play';

/** The hand in play: who bid what, the called cards to mark as they land, and Hand over. */
export function PlayPane({ g, h }: { g: KtGame; h: KtHand }) {
  const { actions } = useKt();
  const bidder = g.players.find((p) => p.id === h.bidder);
  if (!bidder || h.bid == null) return null;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex items-center gap-3">
        <Avatar
          p={bidder}
          className="mat-av grid h-12 w-12 shrink-0 place-items-center rounded-full text-26"
        />
        <p className="min-w-0 flex-1 leading-tight">
          <span className="disp block text-22 font-extrabold tracking-[-0.02em] [overflow-wrap:anywhere]">
            {kd.play.bidLine(bidder.name, h.bid)}
          </span>
          <span className="text-15 text-[var(--tx2)]">{kp.play.leadsLine(bidder.name)}</span>
        </p>
      </div>
      <div className="scroll-thin -mx-1 min-h-0 flex-1 overflow-y-auto px-1">
        <CalledCards g={g} h={h} id="kt-desk-called" className="" />
      </div>
      <div className="flex shrink-0 flex-col gap-3">
        <PrimaryButton className="w-full" onClick={actions.toResult}>
          {kp.play.handOver}
        </PrimaryButton>
        <KeyHints
          items={[
            [h.called.length > 1 ? `1 – ${h.called.length}` : '1', kd.hints.card],
            ['⏎', kd.hints.confirm],
          ]}
        />
      </div>
    </div>
  );
}
