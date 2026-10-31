import { ep } from './endpoints';
import type { Player, User } from './types';
import type { Session } from '@/state/persistence';

/** The session the app keeps from the server's user and player. */
export const sessionOf = (user: User, player: Player | null): Session => ({
  user: { id: user.id, email: user.email, role: user.role, playerId: user.playerId },
  player: player && {
    id: player.id,
    displayName: player.displayName,
    emoji: player.emoji,
    color: player.color,
  },
});

/** Email and password in, a session out (with the linked player, which login returns). */
export async function signIn(email: string, password: string): Promise<Session> {
  const { user, player } = await ep.login(email.trim(), password);
  return sessionOf(user, player);
}
