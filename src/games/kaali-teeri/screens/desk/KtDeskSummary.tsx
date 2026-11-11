import { doneHands } from '@/games/kaali-teeri/domain';
import { useKt } from '@/games/kaali-teeri/state/store';
import { kp } from '@/games/kaali-teeri/strings/play';
import { DeskPage, GhostButton, Kbd, PageHead } from '@/components/desk/DeskParts';
import { Glass } from '@/components/ui/Glass';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import Summary, { ResultLine, StandingsList, useSummaryData } from '../hand/Summary';
import type { KtGame, KtHand } from '@/games/kaali-teeri/domain';

/** After a hand on a large screen: the standings on the left, what happened and who deals next on the right. */
export function KtDeskSummary() {
  const g = useKt().state.game;
  const h = g ? doneHands(g).at(-1) : undefined;
  // No hand done yet (only after an odd undo): the phone screen's empty state says so.
  if (!g || !h) return <Summary />;
  return <Body g={g} h={h} />;
}

function Body({ g, h }: { g: KtGame; h: KtHand }) {
  const { actions } = useKt();
  const d = useSummaryData(g, h);
  return (
    <DeskPage>
      <PageHead
        eyebrow={kp.summary.nextShort(h.index + 1)}
        title={kp.summary.title(h.index + 1)}
        actions={
          <>
            <GhostButton onClick={() => actions.ask('finish')}>{kp.summary.endGame}</GhostButton>
            <PrimaryButton className="h-12 px-6" onClick={actions.nextHand}>
              {kp.summary.nextHand}
              <Kbd className="ml-2">↵</Kbd>
            </PrimaryButton>
          </>
        }
      />
      <div className="grid min-h-0 flex-1 gap-6 rail:grid-cols-[minmax(0,1fr)_minmax(18rem,26rem)]">
        <div className="flex min-h-0 flex-col">
          <StandingsList d={d} h={h} />
        </div>
        <div className="flex flex-col gap-3">
          <ResultLine d={d} h={h} />
          <Glass spot={false} className="px-5 py-4 text-17 leading-[1.4]">
            {kp.summary.next(d.next + 1, d.nD.name, d.nF.name)}
          </Glass>
        </div>
      </div>
    </DeskPage>
  );
}
