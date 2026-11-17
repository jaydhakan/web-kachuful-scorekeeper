import { useCallback, useEffect, useRef, useState } from 'react';
import { turnMoments, turnsOf, type TurnMoment } from '@/games/ishaara/domain/achievements';
import type { IshaaraPublic } from '@/games/ishaara/domain';
import { table as s } from '@/games/ishaara/strings/table';
import { loadProgression } from '@/progression/registry';
import { popCard, type PopCard } from '@/components/progression/popCard';

/** The moments of turns that are over: the turn still on the table (a clue up) can yet be undone or extended. */
export function endedMoments(g: IshaaraPublic): TurnMoment[] {
  const finished = g.status === 'finished';
  const all = turnMoments(g.log, finished ? g : undefined);
  const open = !finished && g.clue ? turnsOf(g.log).length - 1 : -1;
  return all.filter((m) => m.turn !== open);
}

const keyOf = (m: TurnMoment) => `${m.turn}|${m.code}|${m.team}`;

/**
 * A turn's moments as pop cards when the turn ends, worked out on the table from the public log. What was already
 * over when the board opened never pops (a reload replays nothing); the server's rows are the record.
 */
export function useTurnMoments(game: IshaaraPublic | null) {
  const [pops, setPops] = useState<{ id: number; cards: PopCard[]; keys: string[] } | null>(null);
  const seen = useRef<Set<string> | null>(null);
  // Only unmounting drops a batch: a newer state arriving while the catalogue loads must not.
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );
  useEffect(() => {
    if (!game) return;
    const ms = endedMoments(game);
    if (!seen.current) {
      seen.current = new Set(ms.map(keyOf));
      return;
    }
    // An undo reopens a turn: its moments leave the screen and may pop again once it really ends.
    const now = new Set(ms.map(keyOf));
    for (const k of [...seen.current]) if (!now.has(k)) seen.current.delete(k);
    setPops((p) => {
      if (!p || p.keys.every((k) => now.has(k))) return p;
      const keep = p.keys.map((k) => now.has(k));
      const cards = p.cards.filter((_, i) => keep[i]);
      return cards.length ? { ...p, cards, keys: p.keys.filter((_, i) => keep[i]) } : null;
    });
    const fresh = ms.filter((m) => !seen.current!.has(keyOf(m)));
    if (!fresh.length) return;
    for (const m of fresh) seen.current.add(keyOf(m));
    void loadProgression('ishaara').then((prog) => {
      if (mounted.current)
        setPops({
          id: game.rev,
          cards: fresh.map((m) => popCard(prog, m.code, s.team[m.team])),
          keys: fresh.map(keyOf),
        });
    });
  }, [game]);
  const done = useCallback(() => setPops(null), []);
  return { pops, done };
}
