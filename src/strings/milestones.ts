/** Firsts and group milestones (backend-requests §6), and a gift opened at the table (§5). */
const GAME: Record<string, string> = {
  kachuful: 'Kachuful',
  spades: 'Spades',
  'kaali-teeri': 'Kaali Teeri',
  ishaara: 'Ishaara',
};
const FIRSTS: Record<string, [glyph: string, line: string]> = {
  'first:kachuful:ten_players': ['🔟', 'The first 10-player Kachuful ever'],
  'first:kachuful:perfect_game': ['💯', 'The first perfect game of Kachuful ever'],
  'first:spades:boston': ['🗽', 'The first Boston ever'],
  'first:spades:blind_nil': ['🙈', 'The first Blind Nil made, ever'],
  'first:kaali-teeri:thousand': ['🏦', 'The first 1000 in Kaali Teeri ever'],
  'first:ishaara:speedrun': ['⚡', 'The first Ishaara speedrun ever'],
};
const nth = (n: number) =>
  `${n.toLocaleString('en-IN')}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')}`;

export const milestones = {
  dismiss: 'Close',
  /** The stamp's glyph and line for a milestone key; null for a key this app doesn't know yet. */
  line(key: string, n: number | null): { glyph: string; line: string } | null {
    const first = FIRSTS[key];
    if (first) return { glyph: first[0], line: first[1] };
    const [kind, game] = key.split(':');
    if (kind !== 'group' || n == null) return null;
    return game === 'all'
      ? { glyph: '🎉', line: `Baithak’s ${nth(n)} game together` }
      : { glyph: '🎉', line: `The ${nth(n)} game of ${GAME[game] ?? game} together` };
  },
  who: (names: string[]) => (names.length ? `At the table: ${names.join(', ')}` : ''),
  gift: {
    headline: (who: string) => `A gift for ${who}!`,
    from: (item: string, from: string) => `${item}, from ${from}`,
    feed: (from: string, to: string, item: string) => `${from} sent ${to} a ${item}`,
  },
};
