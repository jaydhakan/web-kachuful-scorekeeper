import { byCode, type CatalogueView } from '@/progression/catalogue';

export interface PopCard {
  k: string;
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
}

/** A moment's card: "Asha · Boston". */
export const popCard = (prog: CatalogueView, code: string, name: string): PopCard => {
  const def = byCode(prog).get(code),
    what = prog.strings.achievements[code]?.name ?? code;
  return {
    k: code + name,
    emoji: def?.emoji ?? '🏅',
    text: `${name} · ${what}`,
    ...(def?.big ? { tier: 'big' as const } : def?.shame ? { tier: 'shame' as const } : {}),
    who: name,
    what,
  };
};
