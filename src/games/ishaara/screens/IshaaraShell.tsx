import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import { tableScreen, useIshaara } from '@/games/ishaara/state/store';
import { useTable } from '@/games/ishaara/state/useTable';
import { table as s } from '@/games/ishaara/strings/table';
import { useVisualViewport } from '@/hooks/useVisualViewport';
import { whenIdle } from '@/lib/idle';
import { ErrorState, EmptyState } from '@/components/ui/PageParts';
import { Loader } from '@/components/ui/Loader';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { EASE } from '@/components/ui/motion';
import type { BoardProps } from './board/Board';
import Home, { type HubLink } from './Home';

// Never the first screen, so out of the first load; setup is fetched once the page is idle.
const loadSetup = () => import('./setup/Setup');
const Setup = lazy(loadSetup);
const Board = lazy(() => import('./board/Board').then((x) => ({ default: x.Board })));
const Waiting = lazy(() => import('./Waiting'));
const Win = lazy(() => import('./Win'));
const ClueHome = lazy(() => import('./clue/ClueHome'));
const HubPage = lazy(() => import('./pages/HubPage'));

type Hub = 'history' | 'leaderboard' | 'rules';

/** A hub page over whatever is under it, which stays mounted (and inert) so a game in progress keeps its link. */
function Over({ page, onBack }: { page: Hub; onBack: () => void }) {
  return (
    <div className="scr-bg absolute inset-0 z-50">
      <Suspense fallback={<Loader />}>
        <HubPage page={page} onBack={onBack} />
      </Suspense>
    </div>
  );
}

/** One game on the table: a single live link across waiting, the board and the result. */
function TableGame({
  id,
  onRules,
  Board,
}: {
  id: string;
  onRules: () => void;
  Board: ComponentType<BoardProps>;
}) {
  const { nav, actions } = useIshaara();
  const t = useTable(id);
  const status = t.game?.status;
  const onBoard = nav.screen === 'board';
  // The board shows how a game ended before handing over, so it moves on to the result itself.
  useEffect(() => {
    if (status && !(status === 'finished' && onBoard)) actions.track(status);
  }, [status, onBoard, actions]);
  const finished = useCallback(() => actions.track('finished'), [actions]);

  if (!t.game) {
    if (t.status === 'gone')
      return (
        <Centre>
          <EmptyState
            icon="warn"
            title={s.board.gone}
            body={s.board.goneBody}
            action={<PrimaryButton onClick={actions.leave}>{s.board.leave}</PrimaryButton>}
          />
        </Centre>
      );
    if (t.status === 'error')
      return (
        <Centre>
          <ErrorState msg={s.board.loadFailed} onRetry={t.reload} />
          <button
            type="button"
            onClick={actions.leave}
            className="press mx-auto block min-h-11 rounded-xl px-3 text-16 font-semibold underline"
          >
            {s.board.leave}
          </button>
        </Centre>
      );
    return <Loader />;
  }
  // Drawn from the game itself, so a game opened mid-play never flashes the waiting screen first.
  const screen = status === 'finished' && onBoard ? 'board' : tableScreen(t.game.status);
  // Its own boundary: loading a screen's chunk must never suspend this component, which holds the link.
  return (
    <Suspense fallback={<Loader />}>
      {screen === 'waiting' ? (
        <Waiting game={t.game} onLeave={actions.leave} />
      ) : screen === 'win' ? (
        <Win game={t.game} />
      ) : (
        <Board table={t} onLeave={actions.leave} onRules={onRules} onFinished={finished} />
      )}
    </Suspense>
  );
}

const Centre = ({ children }: { children: ReactNode }) => (
  <div className="absolute inset-0 grid place-content-center p-6">{children}</div>
);

/**
 * Ishaara's phone UI: the hub, setup, and one game on the table (waiting, board, result); a clue-giver's phone gets
 * the clue screens. Hub pages open over the screen under them. The desk shell passes its own board.
 */
export default function IshaaraShell({
  board = Board,
  desk,
}: {
  board?: ComponentType<BoardProps>;
  desk?: boolean;
}) {
  const { nav, actions } = useIshaara();
  const rm = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  useVisualViewport(root);
  const [hub, setHub] = useState<Hub | null>(null);
  useEffect(() => whenIdle(() => void loadSetup()), []);
  const closeHub = useCallback(() => setHub(null), []);

  const clue =
    nav.screen === 'clue-list' ||
    nav.screen === 'key' ||
    (nav.role === 'clue' && nav.screen !== 'home' && nav.screen !== 'history');
  const open = (l: HubLink) => (l === 'clues' ? actions.go('clue-list') : setHub(l));

  let key: string = nav.screen,
    content: ReactNode;
  if (nav.screen === 'history')
    content = <HubPage page="history" onBack={() => actions.go('home')} />;
  else if (clue) {
    key = 'clue';
    content = <ClueHome />;
  } else if (nav.gameId) {
    key = `game-${nav.gameId}`;
    content = <TableGame id={nav.gameId} onRules={() => setHub('rules')} Board={board} />;
  } else if (nav.screen === 'setup') content = <Setup />;
  else content = <Home onOpen={open} />;

  return (
    <div
      ref={root}
      data-game="ishaara"
      {...(desk ? { 'data-desk': '' } : {})}
      className="app-root scr-bg grain relative h-full w-full"
    >
      <div className="absolute inset-0" {...(hub ? { inert: '' as const } : {})}>
        <div
          aria-hidden
          className="ambient pointer-events-none absolute -top-48 left-1/2 box-content h-[max(360px,45vh)] w-[max(520px,70vw)] rounded-full p-16 opacity-90"
        />
        <AnimatePresence initial={false} mode="popLayout">
          <m.div
            key={key}
            initial={rm ? { opacity: 0 } : { opacity: 0, x: 36, scale: 0.985 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.26, ease: EASE } }}
            transition={{ duration: 0.42, ease: EASE }}
            className="absolute inset-0"
          >
            <Suspense fallback={<Loader />}>{content}</Suspense>
          </m.div>
        </AnimatePresence>
      </div>
      {hub && <Over page={hub} onBack={closeHub} />}
    </div>
  );
}
