import { ApiError } from './api';
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

/** Email and password in, a session out (with the linked player). */
export async function signIn(email: string, password: string): Promise<Session> {
  const { user } = await ep.login(email.trim(), password);
  const me = await ep.me().catch((e: unknown) => {
    if (e instanceof ApiError && e.offline) return { user, player: null };
    throw e;
  });
  return sessionOf(me.user, me.player);
}
