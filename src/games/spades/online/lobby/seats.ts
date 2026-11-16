import { partnerOf, type Seat, type SpPublic } from '../../domain';

/** Where a chair sits on screen: the viewer at the bottom, their partner at the top, play running S → W → N → E. */
export type Place = 'S' | 'W' | 'N' | 'E';
const ORDER: readonly Place[] = ['S', 'W', 'N', 'E'];

export const placeOf = (seat: Seat, anchor: Seat): Place => ORDER[(seat - anchor + 4) % 4];

/** "Your partner" or "Opponent" from the viewer's seat; nothing for their own chair or a viewer not seated. */
export function bandOf(seat: Seat, me: Seat | null): 'partner' | 'opponent' | null {
  if (me === null || seat === me) return null;
  return seat === partnerOf(me) ? 'partner' : 'opponent';
}

export const allSeated = (t: Pick<SpPublic, 'seats'>) => t.seats.every((x) => !!x.who);

/** Draw for deal lights once all four are seated, connected and ready (D12). */
export const canDraw = (t: Pick<SpPublic, 'seats'>, presence: readonly boolean[]) =>
  t.seats.every((x, i) => !!x.who && x.ready && presence[i]);
