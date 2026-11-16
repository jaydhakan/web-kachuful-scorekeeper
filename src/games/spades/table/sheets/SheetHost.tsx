import { lazy, Suspense, useState, type ReactNode } from 'react';
import EditRules from '@/games/spades/sheets/EditRules';
import RulesLine from '@/games/spades/ui/RulesLine';
import { LazyPart } from '@/games/spades/screens/LazyPart';
import { home } from '@/games/spades/strings/home';
import { spTable } from '@/games/spades/strings/table';
import { useSp } from '@/games/spades/table/state/store';
import type { SpSetup, SpSheet } from '@/games/spades/table/state/types';
import { Sheet, type Presentation } from '@/components/ui/Sheet';
import { t } from '@/strings';
import Menu from './Menu';
import { AvatarBody, RenameBody, SeatBody } from './SeatBodies';

// Read now and then, or only while seating: not part of the scorekeeper's first download.
const Scoreboard = lazy(() => import('./Scoreboard'));
const EditHand = lazy(() => import('./EditHand'));
const Share = lazy(() => import('./Share'));
const AddPlayerBody = lazy(() => import('./SeatBodies'));
const loadRules = () => import('@/games/spades/sheets/RulesBody');

const later = (body: ReactNode) => <Suspense fallback={null}>{body}</Suspense>;

/** How to play, under the rules this game is played by (read-only once a game is on). */
function RulesSheetBody() {
  const { state, actions } = useSp();
  const rules = state.game?.rules ?? state.setup?.rules;
  return (
    <div className="flex flex-col gap-4">
      {rules && (
        <RulesLine
          rules={rules}
          online={false}
          editable={false}
          onOpen={() => actions.openSheet({ type: 'editRules' })}
        />
      )}
      <LazyPart
        load={loadRules}
        props={{}}
        loading={
          <p role="status" className="py-6 text-16 text-[var(--tx2)]">
            {home.rulesLoading}
          </p>
        }
        failed={(retry) => (
          <div role="alert" className="flex flex-col items-start gap-3 py-6">
            <p className="text-16">{home.rulesFailed}</p>
            <button
              type="button"
              onClick={retry}
              className="press mat-fill-s min-h-11 rounded-xl px-4 text-15 font-bold"
            >
              {home.retry}
            </button>
          </div>
        )}
      />
    </div>
  );
}

/** Edit rules: the setup's rules can change; a game's are shown read-only. */
function EditRulesBody() {
  const { state, actions } = useSp();
  const inSetup = state.screen === 'setup' && !!state.setup;
  const rules = inSetup ? state.setup!.rules : state.game?.rules;
  if (!rules) return null;
  return (
    <EditRules
      rules={rules}
      editable={inSetup}
      online={false}
      onChange={(r) => inSetup && actions.setupRules(r)}
      onClose={() => actions.openSheet(null)}
    />
  );
}

interface Spec {
  title: string;
  body: ReactNode;
  full?: boolean;
  roomy?: Presentation;
}

function specFor(s: SpSheet, setup: SpSetup | null): Spec {
  const sh = spTable.sheets;
  switch (s.type) {
    case 'menu':
      return { title: spTable.menu.title, body: <Menu /> };
    case 'rules':
      return { title: sh.rules, body: <RulesSheetBody />, full: true, roomy: 'panel' };
    case 'editRules':
      return { title: sh.editRules, body: <EditRulesBody />, roomy: 'panel' };
    case 'board':
      return { title: sh.board, body: later(<Scoreboard />), full: true, roomy: 'board' };
    case 'edit':
      return { title: sh.edit(s.i + 1), body: later(<EditHand />), full: true, roomy: 'panel' };
    case 'share':
      return { title: sh.share, body: later(<Share />) };
    case 'seat':
      return { title: setup?.seats[s.k]?.name ?? t.sheets.seatTitle, body: <SeatBody k={s.k} /> };
    case 'rename':
      return { title: t.sheets.rename, body: <RenameBody k={s.k} /> };
    case 'avatar':
      return { title: t.sheets.avatarTitle, body: <AvatarBody k={s.k} /> };
    case 'addPlayer': {
      const k = setup?.seats.findIndex((x) => !x) ?? -1;
      return {
        title: setup && k >= 0 ? t.setup.seatOf(k + 1, 4) : t.setup.everyoneSeated,
        body: later(<AddPlayerBody name={s.name} />),
        full: true,
      };
    }
  }
}

/** Every scorekeeper sheet; captures the sheet at mount so its content stays put while it animates out. */
export default function SheetHost() {
  const { state, actions } = useSp();
  const [s] = useState(state.sheet);
  if (!s) return null;
  const { title, body, full, roomy } = specFor(s, state.setup);
  return (
    <Sheet title={title} full={full} roomy={roomy} onClose={() => actions.openSheet(null)}>
      {body}
    </Sheet>
  );
}
