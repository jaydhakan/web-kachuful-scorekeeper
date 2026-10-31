import { lazy, Suspense, useState, type ReactNode } from 'react';
import { useApp } from '@/state/store';
import type { SheetState } from '@/state/types';
import { Sheet } from '@/components/ui/Sheet';
import { AvatarBody, RenameBody, SeatBody } from './SeatBodies';
import { BoardBody } from './BoardBody';
import { EditBody } from './EditBody';
import { MenuBody } from './MenuBody';
import { RulesBody } from './RulesBody';
import { UpcomingBody } from './UpcomingBody';

const ShareBody = lazy(() => import('./ShareBody'));

interface Spec {
  title: string;
  body: ReactNode;
  full?: boolean;
}

function specFor(
  s: SheetState,
  game: ReturnType<typeof useApp>['state']['game'],
  seatName?: string,
): Spec {
  switch (s.type) {
    case 'menu':
      return { title: 'Menu', body: <MenuBody /> };
    case 'rules':
      return { title: 'How to play', body: <RulesBody game={game} /> };
    case 'board':
      return { title: 'Scoreboard', body: <BoardBody />, full: true };
    case 'edit':
      return { title: `Edit round ${s.i + 1}`, body: <EditBody i={s.i} />, full: true };
    case 'upcoming':
      return { title: 'Upcoming rounds', body: <UpcomingBody />, full: true };
    case 'seat':
      return { title: seatName ?? 'Seat', body: <SeatBody k={s.k} /> };
    case 'rename':
      return { title: 'Rename', body: <RenameBody k={s.k} /> };
    case 'avatar':
      return { title: 'Choose avatar', body: <AvatarBody k={s.k} /> };
    case 'share':
      return {
        title: 'Share',
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
  const { title, body, full } = specFor(s, state.game, seatName);
  return (
    <Sheet title={title} full={full} onClose={() => actions.openSheet(null)}>
      {body}
    </Sheet>
  );
}
