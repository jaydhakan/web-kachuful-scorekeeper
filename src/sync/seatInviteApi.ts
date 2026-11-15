import { del, get, post } from './api';
import type { SeatInvite } from './seatInvites';

/** Someone the host may invite (`GET /api/me/circle`): only people with an account, never the host. */
export interface CircleMember {
  userId: string;
  playerId: string;
  name: string;
  emoji: string;
  color: string;
  photoUrl: string | null;
  /** Epoch ms of their last stream ping; "online now" is within a minute of the server's clock. */
  lastSeenAt: number | null;
  lastPlayedAt: number | null;
}

/** "Online now" in the invite picker: seen on the user stream within the last minute (server clock). */
export const ONLINE_MS = 60_000;

const enc = encodeURIComponent;

/** One function per seat-invite route (backend-requests.md §1.3); writes carry the CSRF header through api.ts. */
export const seatEp = {
  mine: () => get<{ items: SeatInvite[]; serverNow: number }>('/seat-invites'),
  circle: () => get<{ items: CircleMember[] }>('/me/circle'),
  /** Spades only: the host invites `userId` to `seat` of table `tableId`. */
  create: (tableId: string, b: { userId: string; seat: string }) =>
    post<SeatInvite>(`/spades/tables/${enc(tableId)}/seat-invites`, b),
  accept: (id: string) => post<unknown>(`/seat-invites/${enc(id)}/accept`),
  decline: (id: string) => post<unknown>(`/seat-invites/${enc(id)}/decline`),
  cancel: (id: string) => del(`/seat-invites/${enc(id)}`),
};
