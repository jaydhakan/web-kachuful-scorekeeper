import { lazy, Suspense, useState, type ReactNode } from 'react';
import { useApp } from '@/state/store';
import type { SetupState, SheetState } from '@/state/types';
import { Sheet, type Presentation } from '@/components/ui/Sheet';
import { AvatarBody, RenameBody, SeatBody } from './SeatBodies';
import { BoardBody } from './BoardBody';
import { EditBody } from './EditBody';
import { MenuBody } from './MenuBody';
import { UpcomingBody } from './UpcomingBody';
import { t } from '@/strings';

const ThemeBody = lazy(() => import('./ThemeBody').then((m) => ({ default: m.ThemeBody })));
const ShareBody = lazy(() => import('./ShareBody'));
// The rules are long text read now and then: not part of the first download.
const RulesBody = lazy(() => import('./RulesBody').then((m) => ({ default: m.RulesBody })));
const AddPlayerBody = lazy(() =>
  import('./AddPlayerBody').then((m) => ({ default: m.AddPlayerBody })),
);

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
  setup: SetupState | null,
): Spec {
  switch (s.type) {
    case 'menu':
      return { title: t.sheets.menu.title, body: <MenuBody /> };
    case 'rules':
      return {
        title: t.sheets.rulesTitle,
        body: (
          <Suspense fallback={null}>
            <RulesBody game={game} />
          </Suspense>
        ),
        roomy: 'panel',
      };
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
      return { title: setup?.seats[s.k]?.name ?? t.sheets.seatTitle, body: <SeatBody k={s.k} /> };
    case 'addPlayer': {
      const k = setup?.seats.findIndex((x) => !x) ?? -1;
      return {
        title: setup && k >= 0 ? t.setup.seatOf(k + 1, setup.n ?? 0) : t.setup.everyoneSeated,
        body: (
          <Suspense fallback={null}>
            <AddPlayerBody name={s.name} />
          </Suspense>
        ),
        full: true,
      };
    }
    case 'rename':
      return { title: t.sheets.rename, body: <RenameBody k={s.k} /> };
    case 'avatar':
      return { title: t.sheets.avatarTitle, body: <AvatarBody k={s.k} /> };
    case 'theme':
      return {
        title: t.theme.own,
        body: (
          <Suspense fallback={null}>
            <ThemeBody />
          </Suspense>
        ),
      };
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
  const { title, body, full, roomy } = specFor(s, state.game, state.setup);
  return (
    <Sheet title={title} full={full} roomy={roomy} onClose={() => actions.openSheet(null)}>
      {body}
    </Sheet>
  );
}
