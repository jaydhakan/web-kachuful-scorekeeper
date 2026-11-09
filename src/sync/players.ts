import { archive } from '@/state/archive';
import { recFromServer } from '@/state/registry';
import { ApiError } from './api';
import { ep } from './endpoints';
import type { Player } from './types';

/**
 * The players registry's side of sync, shared by every game's engine (one registry for all games): new players go
 * up before any game that seats them, and the registry comes down page by page.
 */

/** A write can commit with a time a little before our last read: ask again from a bit earlier. */
const OVERLAP = 5000;

export function upsertPlayers(list: Player[]) {
  archive.put('players', ...list.map((p) => recFromServer(p, archive.get('players', p.id))));
}

/** The registry's changes since the last pull (every player on the first). */
export async function pullPlayers() {
  const since = (archive.get('cache', 'players:since')?.value as number | undefined) ?? 0;
  let cursor: string | null = null;
  let max = since;
  do {
    const page = await ep.players(Math.max(0, since - OVERLAP), cursor);
    upsertPlayers(page.items);
    max = Math.max(max, ...page.items.map((p) => p.updatedAt));
    cursor = page.nextCursor;
  } while (cursor);
  archive.put('cache', { key: 'players:since', value: max, fetchedAt: Date.now() });
}

const nameMatch = (id: string, data: Record<string, unknown>) =>
  archive.put('inbox', {
    id: `nameMatch:${id}`,
    kind: 'nameMatch',
    key: id,
    data,
    createdAt: Date.now(),
  });

/** Creates players made signed in; `remap` rewrites games when the server already had that person. */
export async function pushPlayers(remap: (map: Record<string, string>) => void) {
  for (const p of archive.all('players').filter((x) => x.pendingCreate && !x.mergedInto)) {
    // A player goes up with its email; one without waits for someone to add it (the inbox asks).
    if (!p.email) {
      nameMatch(p.id, { name: p.displayName, playerId: p.id, field: 'email', missing: true });
      archive.put('players', { ...p, pendingCreate: false });
      continue;
    }
    try {
      const out = await ep.createPlayer({
        id: p.id,
        displayName: p.displayName,
        email: p.email,
        emoji: p.emoji,
        color: p.color,
        ...(p.firstName && { firstName: p.firstName }),
        ...(p.lastName && { lastName: p.lastName }),
      });
      archive.put('players', recFromServer(out, p));
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 409) throw e;
      if (e.code === 'same_player') {
        // Name and email are someone the server already has: that player it is.
        const same = e.body.player as Player;
        archive.put('players', recFromServer(same, archive.get('players', same.id)), {
          ...p,
          mergedInto: same.id,
          pendingCreate: false,
        });
        remap({ [p.id]: same.id });
        continue;
      }
      // The name or the email belongs to someone else, who isn't named: the person picks another (the games wait).
      archive.put('players', { ...p, pendingCreate: false });
      nameMatch(p.id, {
        name: p.displayName,
        playerId: p.id,
        field: e.code === 'email_taken' ? 'email' : 'name',
      });
    }
  }
}

/** Whether a player is waiting to be created on the server. */
export const playersWaiting = () =>
  archive.all('players').some((p) => p.pendingCreate && !p.mergedInto);
