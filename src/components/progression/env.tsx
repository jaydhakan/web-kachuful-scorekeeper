import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Face } from '@/components/ui/Avatar';
import type { DeviceProgression, GameProgression } from '@/progression/registry';
import type { Award, Earned, SeasonResult } from '@/progression/types';
import type { Activity } from '@/sync/types';
import { archive } from '@/state/archive';
import { resolveId } from '@/state/registry';

/** A player as the pages draw them. */
export type Person = Face & { id: string; name: string };

/** A game's device rules bound to what its pages gathered from this device. */
export interface DeviceSource {
  earned(): Earned[];
  ladderCounts(playerId: string): Record<string, number>;
  daily(day: string): Award[];
  season(month: string): SeasonResult;
  months(): string[];
}

/** Binds a game's device rules to its facts; memoise it on the facts, it caches what it works out. */
export function bindDevice<F>(d: DeviceProgression<F>, f: F): DeviceSource {
  let earned: Earned[] | null = null;
  const seasons = new Map<string, SeasonResult>();
  return {
    earned: () => (earned ??= d.earned(f)),
    ladderCounts: (id) => d.ladderCounts(f, id),
    daily: (day) => d.daily(f, day),
    season: (m) => {
      let s = seasons.get(m);
      if (!s) seasons.set(m, (s = d.season(f, m)));
      return s;
    },
    months: () => d.months(f),
  };
}

/**
 * What the shared pages need from the game that shows them: its progression, who is signed in, how to draw a player
 * and where links go. A game's hub builds one and wraps its pages in `ProgressionScope`.
 */
export interface ProgressionEnv {
  prog: GameProgression;
  /** Signed in, the pages read the server; signed out, `device`. */
  signedIn: boolean;
  /** The signed-in player, for "where you stand" and "your achievements". */
  me: string | null;
  person: (id: string) => Person;
  onBack: () => void;
  openPlayer: (id: string) => void;
  openAchievements: (id?: string) => void;
  /** Left out, Awards doesn't link to the feed (signed out, say). */
  openActivity?: () => void;
  /** A feed item about a finished game; left out, the item opens its player. */
  openGame?: (a: Activity) => void;
  /** Left out for a game with nothing on the device (Ishaara): signed out the pages show nothing. */
  device?: DeviceSource;
}

const Ctx = createContext<ProgressionEnv | null>(null);

export function ProgressionScope({ env, children }: { env: ProgressionEnv; children: ReactNode }) {
  return <Ctx.Provider value={env}>{children}</Ctx.Provider>;
}

export function useProgressionEnv(): ProgressionEnv {
  const env = useContext(Ctx);
  if (!env) throw new Error('A progression page needs a ProgressionScope');
  return env;
}

/** A player from the registry (which mirrors the server's signed in), else their id as a name. */
export function personOf(id: string): Person {
  const r = archive.get('players', resolveId(id));
  return r
    ? { id: r.id, name: r.displayName, emoji: r.emoji, color: r.color, photoUrl: r.photoUrl }
    : { id, name: id.replace(/^name:/, ''), emoji: '🙂', color: 'var(--tx2)' };
}

/** `bindDevice` memoised on the facts. */
export function useDevice<F>(d: DeviceProgression<F> | undefined, f: F): DeviceSource | undefined {
  return useMemo(() => (d ? bindDevice(d, f) : undefined), [d, f]);
}
