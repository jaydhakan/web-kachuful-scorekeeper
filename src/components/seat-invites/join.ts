import { GAME_IDS, go, type GameId } from '@/platform/route';
import { dropInvite, gameOfKind, type SeatInvite } from '@/sync/seatInvites';
import { joinHandler } from '@/sync/seatInviteSignals';
import { acceptInvite, type Answer } from '@/sync/seatInvitesLive';

/** The address that opens an invite's game when that game isn't mounted to open it in place. */
export const joinSearch = (inv: SeatInvite) => `?game=${encodeURIComponent(inv.gameId)}`;

function open(inv: SeatInvite) {
  const game = gameOfKind(inv.kind);
  const here = joinHandler(game);
  if (here) return here(inv);
  if ((GAME_IDS as readonly string[]).includes(game)) go(game as GameId, joinSearch(inv));
}

/**
 * Join: accept, then open the game (in place when it is mounted, else by address). Ishaara's accept only records
 * the answer (the key route is the real join), so it opens at once; Spades waits for its seat.
 */
export async function joinInvite(inv: SeatInvite): Promise<Answer> {
  if (inv.kind === 'ishaara') {
    dropInvite(inv.id);
    void acceptInvite(inv);
    open(inv);
    return 'ok';
  }
  const r = await acceptInvite(inv);
  if (r === 'ok') open(inv);
  return r;
}
