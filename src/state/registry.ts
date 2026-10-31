import { COLORS, emailKey, nameKey, pidOf, tidyName, type Game, type Player } from '@/domain';
import { uuid } from '@/lib/ids';
import { archive, type PlayerRec } from './archive';
import { KEYS, storage } from './persistence';

/**
 * The people this device knows: one row per player, unique by name key. Signed out these are local rows; signed
 * in they mirror the server's registry. Games refer to them by `Player.playerId`.
 */

/** Follows merges to the player an id ended up as. */
export function resolveId(id: string): string {
  let cur = id;
  for (let i = 0; i < 20; i++) {
    const next = archive.get('players', cur)?.mergedInto;
    if (!next) return cur;
    cur = next;
  }
  return cur;
}

/** Live (not merged) players. */
export const livePlayers = (): PlayerRec[] => archive.all('players').filter((p) => !p.mergedInto);

/** The live player with this name; the server's copy wins over a same-named one made on this device. */
export const findByName = (name: string): PlayerRec | undefined => {
  const k = nameKey(name);
  const all = livePlayers().filter((p) => p.nameKey === k);
  return all.find((p) => !p.local) ?? all[0];
};

/** The registry row for a seat: by id when it has one, else by name, else a new local player. */
export function ensurePlayer(
  seat: { name: string; emoji: string; color: string; playerId?: string; email?: string },
  online = false,
) {
  if (seat.playerId) {
    const p = archive.get('players', resolveId(seat.playerId));
    if (p) return p;
  }
  const found = findByName(seat.name);
  if (found) return found;
  const now = Date.now();
  const rec: PlayerRec = {
    id: seat.playerId ?? uuid(),
    displayName: tidyName(seat.name),
    nameKey: nameKey(seat.name),
    ...(seat.email && { email: emailKey(seat.email) }),
    emoji: seat.emoji,
    color: seat.color,
    createdAt: now,
    updatedAt: now,
    local: true,
    // Signed in, a new name becomes a server player on the next sync.
    ...(online && { pendingCreate: true }),
  };
  archive.put('players', rec);
  return rec;
}

/** A player's registry id in a game: its own (after merges), or the registry player with its name. */
export function idOf(p: Player): string {
  if (p.playerId) return resolveId(p.playerId);
  return findByName(p.name)?.id ?? pidOf(p);
}

/** Games with every seat pointing at a live registry player, so stats count each person once. */
export const identify = (games: Game[]): Game[] =>
  games.map((g) => ({ ...g, players: g.players.map((p) => ({ ...p, playerId: idOf(p) })) }));

/**
 * Gives every name this device has seen (archived games, recent names) a registry row, once the archive has
 * loaded. Older games keep their shape: they are matched by name when read.
 */
export function backfillRegistry() {
  const known = new Set(livePlayers().map((p) => p.nameKey));
  const add: PlayerRec[] = [];
  const now = Date.now();
  const see = (name: string, emoji: string, color: string, at: number) => {
    const k = nameKey(name);
    if (!k || known.has(k)) return;
    known.add(k);
    add.push({
      id: uuid(),
      displayName: tidyName(name),
      nameKey: k,
      emoji,
      color,
      createdAt: at,
      updatedAt: now,
      local: true,
    });
  };
  for (const r of archive.games())
    for (const p of r.game.players)
      if (!p.playerId) see(p.name, p.emoji, p.color, r.game.createdAt);
  for (const n of storage.get<string[]>(KEYS.recentNames, [])) see(n, '🙂', COLORS[0], now);
  archive.put('players', ...add);
}

export interface Person extends PlayerRec {
  games: number;
  lastPlayedAt: number | null;
}

/** Live players with how often and how recently they played on this device, most recent first. */
export function people(): Person[] {
  const stats = new Map<string, { games: number; last: number }>();
  for (const r of archive.games()) {
    if (r.conflictOf) continue;
    for (const p of r.game.players) {
      const id = idOf(p);
      const s = stats.get(id) ?? { games: 0, last: 0 };
      s.games++;
      s.last = Math.max(s.last, r.updatedAt);
      stats.set(id, s);
    }
  }
  return livePlayers()
    .map((p) => {
      const s = stats.get(p.id);
      return {
        ...p,
        games: Math.max(p.games ?? 0, s?.games ?? 0),
        lastPlayedAt: s?.last ?? p.lastPlayedAt ?? null,
      };
    })
    .sort(
      (a, b) =>
        (b.lastPlayedAt ?? 0) - (a.lastPlayedAt ?? 0) || a.displayName.localeCompare(b.displayName),
    );
}

const cached = (k: string): string[] => (archive.get('cache', k)?.value as string[]) ?? [];

/**
 * Signed in, setup suggests only this account's circle (HANDOFF §5.7): players it created, people it has shared a
 * game with, players confirmed at setup, its own player, and this device's own players. Anyone else is added by
 * name and email.
 */
export function circle(userId: string, playerId: string | null): Person[] {
  const met = new Set([...cached('met'), ...cached('same')]);
  for (const r of archive.games()) {
    if (r.conflictOf) continue;
    const ids = r.game.players.map(idOf);
    if (r.account === userId || r.owner?.id === userId || (playerId && ids.includes(playerId)))
      ids.forEach((id) => met.add(id));
  }
  return people().filter(
    (p) => p.local || p.id === playerId || p.createdBy === userId || met.has(p.id),
  );
}

/** A player confirmed as "the same person" at setup joins the circle. */
export const rememberSame = (id: string) =>
  archive.put('cache', {
    key: 'same',
    value: [...new Set([...cached('same'), id])],
    fetchedAt: Date.now(),
  });

/** Who may change a player's email or photo (HANDOFF §5.7): the admin, its creator and its linked user. */
export const mayEdit = (
  p: Pick<PlayerRec, 'createdBy' | 'linkedUserId'>,
  user: { id: string; role: string } | null | undefined,
) => !!user && (user.role === 'admin' || p.createdBy === user.id || p.linkedUserId === user.id);

/** Keeps a server answer about a player (a new photo, a new email) in the registry copy. */
export function keepPlayer(id: string, patch: Partial<PlayerRec>) {
  const p = archive.get('players', id);
  if (p) archive.put('players', { ...p, ...patch });
}

/** Counts one player as another from now on (this device only). */
export function mergeLocal(fromId: string, intoId: string) {
  const from = archive.get('players', fromId),
    into = archive.get('players', resolveId(intoId));
  if (!from || !into || from.id === into.id) return;
  archive.put('players', { ...from, mergedInto: into.id, updatedAt: Date.now() });
}

/** Edits a local player's look or name; returns false when the name belongs to someone else. */
export function patchLocal(
  id: string,
  patch: Partial<Pick<PlayerRec, 'displayName' | 'emoji' | 'color' | 'firstName' | 'lastName'>>,
) {
  const p = archive.get('players', id);
  if (!p) return false;
  if (patch.displayName) {
    const other = findByName(patch.displayName);
    if (other && other.id !== id) return false;
  }
  archive.put('players', {
    ...p,
    ...patch,
    ...(patch.displayName && {
      displayName: tidyName(patch.displayName),
      nameKey: nameKey(patch.displayName),
    }),
    updatedAt: Date.now(),
  });
  return true;
}
