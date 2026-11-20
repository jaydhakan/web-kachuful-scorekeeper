/** The Kursi (REWARDS-PLAN §6.3): the chair you take by finishing above whoever holds it. */
const list = (names: string[]) =>
  names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} aur ${names.at(-1)}`;

export const kursi = {
  glyph: '🪑',
  /** The seat badge's word. */
  badge: 'Kursi',
  defences: (n: number) => (n === 1 ? '1 defence' : `${n} defences`),
  /** Round 1's deal line. */
  seated: (names: string[], n: number) =>
    `🪑 ${list(names)} ki Kursi · ${n === 1 ? '1 defence' : `${n} defences`}`,
  /** The chip on whoever is ahead of the holder in this game's score. */
  near: '🪑 ke kareeb',
  nearSr: (name: string) => `${name} would take the Kursi if the game ended now`,
  /** The end of a game. */
  taken: 'Kursi chheeni!',
  first: 'Pehli Kursi!',
  takenBy: (to: string[], from: string[]) =>
    from.length ? `${list(to)} ne ${list(from)} se Kursi chheen li` : `${list(to)} baithe Kursi pe`,
  kept: (names: string[], n: number) =>
    `🪑 Kursi bachi: ${list(names)}, ${n === 1 ? '1 defence' : `${n} defences`}`,
} as const;
