import type { Face } from '@/components/ui/Avatar';
import { byCode, type CatalogueView } from '@/progression/catalogue';

export interface PopCard {
  k: string;
  /** The achievement it shows: the same one twice within `COOLDOWN_ROUNDS` rounds plays as a small card. */
  code?: string;
  emoji: string;
  /** The one-line form: "Asha · Boston". */
  text: string;
  /** `big`: the full unlock card (a Moment); `shame`: a silver card that wobbles. Left out: a small card. */
  tier?: 'big' | 'shame';
  /** For the big card, which sets the two apart: who earned it, and what. */
  who?: string;
  what?: string;
  /** Online, on each player's own phone: false when someone else earned it, so a big one shows as a compact card. */
  mine?: boolean;
  /** Who earned it, as drawn: the big card shows their stage bust (wearing the item, for an unlock) instead of the emoji. */
  face?: Face;
}

/** A moment's card: "Asha · Boston". */
export const popCard = (prog: CatalogueView, code: string, name: string): PopCard => {
  const def = byCode(prog).get(code),
    what = prog.strings.achievements[code]?.name ?? code;
  return {
    k: code + name,
    code,
    emoji: def?.emoji ?? '🏅',
    text: `${name} · ${what}`,
    ...(def?.big ? { tier: 'big' as const } : def?.shame ? { tier: 'shame' as const } : {}),
    who: name,
    what,
  };
};
