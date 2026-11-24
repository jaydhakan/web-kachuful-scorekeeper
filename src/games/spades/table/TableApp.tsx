import { Suspense, type ReactElement } from 'react';
import { DeskShell } from '@/games/spades/chunks';
import type { TablePage } from '@/games/spades/nav';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { MQ } from '@/theme/breakpoints';
import { SpTableProvider, useSp } from './state/store';
import { SpCrowns } from './SpCrowns';
import Shell from './screens/Screens';

function Root({ page }: { page: TablePage | null }) {
  const big = useMediaQuery(MQ.big);
  return (
    <SpCrowns g={useSp().state.game}>
      {big ? (
        <Suspense fallback={<div className="app-root scr-bg h-full w-full" />}>
          <DeskShell page={page} />
        </Suspense>
      ) : (
        <Shell page={page} />
      )}
    </SpCrowns>
  );
}

/** The scorekeeper at a real table (`/spades?keep`); `page` opens History or the leaderboard from Spades' home. */
const TableApp: (props: { page: TablePage | null }) => ReactElement | null = ({ page }) => (
  <SpTableProvider>
    <Root page={page} />
  </SpTableProvider>
);
export default TableApp;
