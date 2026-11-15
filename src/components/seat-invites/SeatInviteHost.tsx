import { useEffect } from 'react';
import { startSeatInvites } from '@/sync/seatInvitesLive';
import { InviteBanner } from './InviteBanner';

/** The lazy half of seat invites: follows this account's invites and draws the banner. Mounted only signed in. */
export default function SeatInviteHost() {
  useEffect(() => startSeatInvites(), []);
  return <InviteBanner />;
}
