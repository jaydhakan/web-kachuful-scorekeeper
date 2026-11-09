import { lazy, Suspense, useState, type ReactNode } from 'react';
import { Sheet, type Presentation } from '@/components/ui/Sheet';
import { useKt } from '@/games/kaali-teeri/state/store';
import type { KtSetup, KtSheet } from '@/games/kaali-teeri/state/types';
import { ktShell } from '@/games/kaali-teeri/strings/shell';
import { end } from '@/games/kaali-teeri/strings/end';
import { t } from '@/strings';
import { AvatarBody, RenameBody, SeatBody } from './SeatBodies';
import Menu from './Menu';
import CardPicker from './CardPicker';
import PlayedBy from './PlayedBy';

// Read now and then, or only while seating: not part of the game's first download.
const Rules = lazy(() => import('./Rules'));
const Scoreboard = lazy(() => import('./Scoreboard'));
const EditHand = lazy(() => import('./EditHand'));
const Share = lazy(() => import('./Share'));
const AddPlayerBody = lazy(() => import('./AddPlayerBody'));
const ThemeBody = lazy(() => import('./ThemeBody'));

interface Spec {
  title: string;
  body: ReactNode;
  full?: boolean;
  /** What it becomes from tablet width up (a modal when omitted). */
  roomy?: Presentation;
}

const later = (body: ReactNode) => <Suspense fallback={null}>{body}</Suspense>;

function specFor(s: KtSheet, setup: KtSetup | null): Spec {
  const sh = ktShell.sheets;
  switch (s.type) {
    case 'menu':
      return { title: end.menu.title, body: <Menu /> };
    case 'rules':
      return { title: end.rules.title, body: later(<Rules />), roomy: 'panel' };
    case 'board':
      return { title: sh.board, body: later(<Scoreboard />), full: true, roomy: 'board' };
    case 'edit':
      return { title: sh.edit(s.i + 1), body: later(<EditHand />), full: true, roomy: 'panel' };
    case 'share':
      return { title: t.sheets.shareTitle, body: later(<Share />) };
    case 'card':
      return { title: sh.card(s.i), body: <CardPicker />, full: true };
    case 'playedBy':
      return { title: sh.playedBy, body: <PlayedBy /> };
    case 'theme':
      return { title: ktShell.theme.title, body: later(<ThemeBody />) };
    case 'hub': {
      const name = ktShell.hub[s.page];
      return {
        title: name,
        body: (
          <p className="pb-4 text-16 leading-[1.5] text-[var(--tx2)]">{ktShell.hub.soon(name)}</p>
        ),
      };
    }
    case 'seat':
      return { title: setup?.seats[s.k]?.name ?? t.sheets.seatTitle, body: <SeatBody k={s.k} /> };
    case 'rename':
      return { title: t.sheets.rename, body: <RenameBody k={s.k} /> };
    case 'avatar':
      return { title: t.sheets.avatarTitle, body: <AvatarBody k={s.k} /> };
    case 'addPlayer': {
      const k = setup?.seats.findIndex((x) => !x) ?? -1;
      return {
        title: setup && k >= 0 ? t.setup.seatOf(k + 1, setup.n) : t.setup.everyoneSeated,
        body: later(<AddPlayerBody name={s.name} />),
        full: true,
      };
    }
  }
}

/** Every Kaali Teeri sheet; captures the sheet at mount so its content stays put while it animates out. */
export default function SheetHost() {
  const { state, actions } = useKt();
  const [s] = useState(state.sheet);
  if (!s) return null;
  const { title, body, full, roomy } = specFor(s, state.setup);
  return (
    <Sheet title={title} full={full} roomy={roomy} onClose={() => actions.openSheet(null)}>
      {body}
    </Sheet>
  );
}
