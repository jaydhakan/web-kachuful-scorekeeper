import { byCode, type CatalogueView } from '@/progression/catalogue';

export interface PopCard {
  k: string;
  emoji: string;
  text: string;
}

/** A moment's card: "Asha · Boston". */
export const popCard = (prog: CatalogueView, code: string, name: string): PopCard => ({
  k: code + name,
  emoji: byCode(prog).get(code)?.emoji ?? '🏅',
  text: `${name} · ${prog.strings.achievements[code]?.name ?? code}`,
});
