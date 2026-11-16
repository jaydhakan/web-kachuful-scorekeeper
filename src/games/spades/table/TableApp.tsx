import { lazy, Suspense, type ReactElement } from 'react';
import type { TablePage } from '@/games/spades/nav';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { MQ } from '@/theme/breakpoints';
import { SpTableProvider } from './state/store';
import Shell from './screens/Screens';

// Only tablets and desktops download the desk layout.
const DeskShell = lazy(() => import('./screens/desk/DeskShell'));

function Root({ page }: { page: TablePage | null }) {
  const big = useMediaQuery(MQ.big);
  return big ? (
    <Suspense fallback={<div className="app-root scr-bg h-full w-full" />}>
      <DeskShell page={page} />
    </Suspense>
  ) : (
    <Shell page={page} />
  );
}

/** The scorekeeper at a real table (`/spades?keep`); `page` opens History or the leaderboard from Spades' home. */
const TableApp: (props: { page: TablePage | null }) => ReactElement | null = ({ page }) => (
  <SpTableProvider>
    <Root page={page} />
  </SpTableProvider>
);
export default TableApp;
