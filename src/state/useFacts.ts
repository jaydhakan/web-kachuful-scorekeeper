import { useMemo } from 'react';
import { buildFacts, type Facts, type Game } from '@/domain';
import { archive } from './archive';
import { identify, resolveId } from './registry';
import { useApp } from './store';
import { useArchiveVersion } from './useArchive';

const played = (g: Game) => g.id !== 'demo' && g.rounds.some((r) => Object.keys(r.bids).length);

/**
 * The games this device scored: the archive (without conflict copies or games pulled from the server) with the
 * current game as it is now.
 */
export function deviceGames(current: Game): Game[] {
  const list = archive
    .games()
    .filter((r) => r.origin === 'local' && !r.conflictOf && r.syncId !== current.syncId)
    .map((r) => r.game);
  if (played(current)) list.push(current);
  return identify(list);
}

/** Boards, stats and achievements for this device, recomputed when a game or the archive changes. */
export function useDeviceFacts(): Facts {
  const { state } = useApp();
  const v = useArchiveVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- recomputed per archive version by design
  return useMemo(() => buildFacts(deviceGames(state.game), Date.now()), [v, state.game]);
}

export interface Who {
  id: string;
  name: string;
  emoji: string;
  color: string;
  firstName?: string | null;
  lastName?: string | null;
}

/** How to show a player: the registry's current look, else the last game they played in. */
export function whoIs(f: Facts | null, id: string): Who {
  const r = archive.get('players', resolveId(id));
  if (r)
    return {
      id: r.id,
      name: r.displayName,
      emoji: r.emoji,
      color: r.color,
      firstName: r.firstName,
      lastName: r.lastName,
    };
  const p = f?.people.get(id);
  return p
    ? { id, name: p.name, emoji: p.emoji, color: p.color }
    : { id, name: id.replace(/^name:/, ''), emoji: '🙂', color: 'var(--tx2)' };
}
