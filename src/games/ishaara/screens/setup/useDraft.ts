import { useCallback, useState } from 'react';
import type { IshaaraRules, Seated } from '@/games/ishaara/domain';
import { PACK_IDS } from '@/games/ishaara/state/words';
import { uuid } from '@/lib/ids';
import { archive } from '@/state/archive';
import { type Session } from '@/state/persistence';
import { loadIshLastSetup } from '@/games/ishaara/state/persistence';
import { resolveId } from '@/state/registry';
import { useArchiveVersion } from '@/state/useArchive';
import type { AccountOf } from './teamRules';

/** A new game being set up on this device: seats, packs, custom words as typed, and the rules. */
export interface Draft {
  players: Seated[];
  packs: string[];
  custom: string;
  rules: Omit<IshaaraRules, 'packs'>;
}

const DEFAULT_RULES: Draft['rules'] = { timerSec: null, clueEntry: 'typed', bestOf: 1 };

/** Custom words as typed: split on commas and new lines. */
export const splitCustom = (text: string) =>
  text
    .split(/[,\n]/)
    .map((w) => w.trim())
    .filter(Boolean);

/** The last setup on this device, or the host alone on Sun with the everyday pack. */
export function firstDraft(session: Session | null): Draft {
  const last = loadIshLastSetup();
  if (last && last.players.length)
    return {
      players: last.players,
      packs: last.packs.length ? last.packs : [PACK_IDS[0]],
      custom: last.customWords.join(', '),
      rules: {
        timerSec: last.rules.timerSec ?? null,
        clueEntry: last.rules.clueEntry === 'spoken' ? 'spoken' : 'typed',
        bestOf: last.rules.bestOf === 3 ? 3 : 1,
      },
    };
  const me = session?.player;
  return {
    players: me
      ? [
          {
            id: uuid(),
            name: me.displayName,
            emoji: me.emoji,
            color: me.color,
            playerId: me.id,
            team: 'sun',
            role: 'clue-giver',
          },
        ]
      : [],
    packs: [PACK_IDS[0]],
    custom: '',
    rules: DEFAULT_RULES,
  };
}

export function useDraft(session: Session | null) {
  const [draft, setDraft] = useState<Draft>(() => firstDraft(session));
  const patch = useCallback((p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p })), []);
  return { draft, setDraft, patch };
}

/** Which account each seat is linked to: the host's own player, else the registry's link. */
export function useAccountOf(session: Session | null): AccountOf {
  const v = useArchiveVersion();
  const uid = session?.user.id ?? null,
    mine = session?.user.playerId ?? null;
  return useCallback(
    (p: Seated) => {
      void v;
      if (!p.playerId) return null;
      if (mine && resolveId(p.playerId) === mine) return uid;
      return archive.get('players', resolveId(p.playerId))?.linkedUserId ?? null;
    },
    [v, uid, mine],
  );
}
