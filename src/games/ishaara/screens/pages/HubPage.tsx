import { useMemo, useState } from 'react';
import { GamePage } from './GamePage';
import { H2HPage } from './H2HPage';
import { HistoryPage } from './HistoryPage';
import { LeaderboardPage } from './LeaderboardPage';
import { PlayerPage } from './PlayerPage';
import { RulesPage } from './RulesPage';
import { HubNavCtx, type HubNav, type HubRoute } from './parts';

export type HubPageName = 'history' | 'leaderboard' | 'rules';

function Route({ r }: { r: HubRoute }) {
  switch (r.page) {
    case 'history':
      return <HistoryPage />;
    case 'game':
      return <GamePage id={r.id} summary={r.summary} />;
    case 'leaderboard':
      return <LeaderboardPage />;
    case 'player':
      return <PlayerPage who={r.who} />;
    case 'h2h':
      return <H2HPage a={r.a} b={r.b} />;
    case 'rules':
      return <RulesPage />;
  }
}

/**
 * Ishaara's hub: History, Leaderboard or How to play, and the pages they open (a game, a player, head-to-head) on a
 * local stack. Back pops it; at the bottom, `onBack` leaves the hub.
 */
export default function HubPage({ page, onBack }: { page: HubPageName; onBack: () => void }) {
  const [stack, setStack] = useState<HubRoute[]>([]);
  const nav = useMemo<HubNav>(
    () => ({
      open: (r) => setStack((s) => [...s, r]),
      back: () => (stack.length ? setStack((s) => s.slice(0, -1)) : onBack()),
    }),
    [onBack, stack.length],
  );
  const top: HubRoute = stack.at(-1) ?? { page };
  return (
    <HubNavCtx.Provider value={nav}>
      <div className="scr-bg relative h-full w-full">
        <Route key={stack.length} r={top} />
      </div>
    </HubNavCtx.Provider>
  );
}
