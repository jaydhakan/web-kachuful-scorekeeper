import type { CrownKind } from '@/sync/types';
import { kursi } from './kursi';
import { medals } from './medals';
import { sikke } from './sikke';

const list = (names: string[]) =>
  names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} & ${names.at(-1)}`;

/**
 * The server's crown changes and bounties (backend-requests §6, REWARDS-PLAN §6.3–§6.4): the banner on the other
 * phones at the table, the winner screen's bounty chips, the feed and round 1's bounty line.
 */
export const crowns = {
  glyph: {
    medal1: medals.glyph[1],
    medal2: medals.glyph[2],
    medal3: medals.glyph[3],
    kursi: kursi.glyph,
    sitara: medals.sitara,
    legend: medals.legend,
  } satisfies Record<CrownKind, string>,
  /** The banner's headline and lines; Kursi and medal lines reuse the table's own words. */
  kursiTaken: kursi.taken,
  kursiFirst: kursi.first,
  kursiLine: (to: string[], from: string[]) => kursi.takenBy(to, from),
  newBadshah: (to: string[]) => medals.newBadshah(list(to)),
  wasBadshah: (from: string[]) => `${list(from)} ${medals.wasBadshah}`,
  newMedal: (m: 2 | 3, to: string[]) => medals.movedTo(m, list(to)),
  newSitara: (to: string[]) => medals.newSitara(list(to)),
  newLegend: (to: string[]) => `${medals.legend} Naya Legend: ${list(to)}`,
  bounty: (amount: number, winner: string, holder: string) =>
    `${sikke.plus(amount)} bounty: ${winner} beat ${holder}`,
  /** The banner as a button: tap or Escape closes it. */
  dismiss: 'Dismiss',
  /** The winner screen's chips. */
  bountyHeading: 'Bounties',
  bountyChip: (amount: number) => `${sikke.plus(amount)} bounty`,
  bountyBeat: (holder: string) => `beat ${holder}`,
  bountySaid: (amount: number, winner: string, holder: string) =>
    `${winner} earned a ${amount} Sikke bounty for beating ${holder}`,
  /** Round 1's line under the crown, when a holder sits at a table of 3+ (§6.4). */
  beat: (holders: string[], amount: number) =>
    `Beat ${holders.join(' or ')}: ${sikke.plus(amount)}${holders.length > 1 ? ' each' : ''}`,
} as const;
