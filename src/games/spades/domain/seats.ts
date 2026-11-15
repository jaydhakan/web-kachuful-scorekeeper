import type { Seat, TeamId } from './types';

export const SEATS: readonly Seat[] = [0, 1, 2, 3];
export const TEAMS: readonly TeamId[] = ['a', 'b'];

export const isSeat = (x: unknown): x is Seat => x === 0 || x === 1 || x === 2 || x === 3;
export const teamOf = (s: Seat): TeamId => (s % 2 === 0 ? 'a' : 'b');
export const partnerOf = (s: Seat): Seat => ((s + 2) % 4) as Seat;
export const seatsOf = (t: TeamId): [Seat, Seat] => (t === 'a' ? [0, 2] : [1, 3]);
/** Clockwise: the next seat to bid, play or deal. */
export const nextSeat = (s: Seat): Seat => ((s + 1) % 4) as Seat;
export const otherTeam = (t: TeamId): TeamId => (t === 'a' ? 'b' : 'a');
