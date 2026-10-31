import { lazy, Suspense, useState, type ReactNode } from 'react';
import { useApp } from '@/state/store';
import type { SheetState } from '@/state/types';
import { Sheet, type Presentation } from '@/components/ui/Sheet';
import { AvatarBody, RenameBody, SeatBody } from './SeatBodies';
import { BoardBody } from './BoardBody';
import { EditBody } from './EditBody';
import { MenuBody } from './MenuBody';
import { RulesBody } from './RulesBody';
import { UpcomingBody } from './UpcomingBody';
import { t } from '@/strings';

const ShareBody = lazy(() => import('./ShareBody'));

interface Spec {
  title: string;
  body: ReactNode;
  full?: boolean;
  /** What it becomes from tablet width up (a modal when omitted). */
  roomy?: Presentation;
}

function specFor(
  s: SheetState,
  game: ReturnType<typeof useApp>['state']['game'],
  seatName?: string,
): Spec {
  switch (s.type) {
    case 'menu':
      return { title: t.sheets.menu.title, body: <MenuBody /> };
    case 'rules':
      return { title: t.sheets.rulesTitle, body: <RulesBody game={game} />, roomy: 'panel' };
    case 'board':
      return { title: t.sheets.boardTitle, body: <BoardBody />, full: true, roomy: 'board' };
    case 'edit':
      return {
        title: t.sheets.editTitle(s.i + 1),
        body: <EditBody i={s.i} />,
        full: true,
        roomy: 'panel',
      };
    case 'upcoming':
      return { title: t.sheets.upcomingTitle, body: <UpcomingBody />, full: true, roomy: 'panel' };
    case 'seat':
      return { title: seatName ?? t.sheets.seatTitle, body: <SeatBody k={s.k} /> };
    case 'rename':
      return { title: t.sheets.rename, body: <RenameBody k={s.k} /> };
    case 'avatar':
      return { title: t.sheets.avatarTitle, body: <AvatarBody k={s.k} /> };
    case 'share':
      return {
        title: t.sheets.shareTitle,
        body: (
          <Suspense fallback={null}>
            <ShareBody />
          </Suspense>
        ),
      };
  }
}

/** Captures the sheet at mount so its content stays put while it animates out. */
export function SheetHost() {
  const { state, actions } = useApp();
  const [s] = useState(state.sheet);
  if (!s) return null;
  const seatName = 'k' in s ? state.setup?.seats[s.k]?.name : undefined;
  const { title, body, full, roomy } = specFor(s, state.game, seatName);
  return (
    <Sheet title={title} full={full} roomy={roomy} onClose={() => actions.openSheet(null)}>
      {body}
    </Sheet>
  );
}
