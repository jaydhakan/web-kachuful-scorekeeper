import { createContext, useContext, type ReactNode } from 'react';
import type { Mark } from '@/progression/banter';
import type { Holder, MedalChange, MedalChase } from '@/progression/medals';

/**
 * What a table knows about the month's medals, Aaj ka Sitara and the Legend (REWARDS-PLAN §6.1, §6.7), for any game.
 * Every map is keyed by the game's own seat id (`Player.id`).
 */
export interface TableCrowns {
  /** Medals as they stood before this game. */
  held: ReadonlyMap<string, Holder>;
  /** Medals if the game ended now. */
  after: ReadonlyMap<string, Holder>;
  chase: MedalChase;
  marks: ReadonlyMap<string, Mark>;
  /** Every medal that would move if the game ended now, gold first, with names (a holder may not be seated). */
  changes: (MedalChange & { name: string })[];
  /** The seat id of a Badshah who kept gold and finished above every other medallist at the table. */
  defended: string | null;
  /** Aaj ka Sitara's seats: before this game, and with it as it stands. */
  sitara: { held: ReadonlySet<string>; now: ReadonlySet<string>; rising: string[] };
  /** The Legend's seats (the most season titles, all-time). */
  legend: ReadonlySet<string>;
  /** The deal's other line: a rivalry or a milestone among the seated, worded (§6.5). */
  intel: string | null;
  /** The deal's line under a seated Badshah at a table of 3+: "Beat Riya: +40 🪙" (§6.4). */
  bounty: string | null;
}

/** Nothing to show: no game at the table, or no board yet. */
export const NO_CROWNS: TableCrowns = {
  held: new Map(),
  after: new Map(),
  chase: { slipping: new Set(), onTrack: new Map() },
  marks: new Map(),
  changes: [],
  defended: null,
  sitara: { held: new Set(), now: new Set(), rising: [] },
  legend: new Set(),
  intel: null,
  bounty: null,
};

const Ctx = createContext<TableCrowns>(NO_CROWNS);

/** The crowns of the game a screen shows; a game's root provides them (`useWinRateCrowns`). */
export const useCrowns = (): TableCrowns => useContext(Ctx);

export function CrownsValue({ value, children }: { value: TableCrowns; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
