/** The month's top three at the table (REWARDS-PLAN §6.7): titles, the deal line, the chase and the takeover. */
export type MedalNo = 1 | 2 | 3;

export const medals = {
  title: { 1: 'Badshah', 2: 'Wazir', 3: 'Senapati' } as Record<MedalNo, string>,
  glyph: { 1: '🥇', 2: '🥈', 3: '🥉' } as Record<MedalNo, string>,
  /** What a screen reader hears after a medallist's name. */
  sr: (m: MedalNo, defending: boolean) =>
    `${medals.title[m]}, ${defending ? "last month's" : "this month's"} #${m}`,
  /** The deal's line when one medallist sits; the VS card when two or more do. */
  seated: (m: MedalNo, name: string) =>
    m === 1
      ? `👑 Badshah ${name} table pe hai`
      : `${medals.glyph[m]} ${medals.title[m]} ${name} is at the table`,
  vs: 'vs',
  titled: (m: MedalNo, name: string) => `${medals.title[m]} ${name}`,
  /** The chaser's chip, when the game as it stands would give them the medal. */
  onTrack: (m: MedalNo) => `On track for ${medals.glyph[m]}`,
  onTrackSr: (name: string, m: MedalNo) => `${name} is on track to be ${medals.title[m]}`,
  slippingSr: (name: string, m: MedalNo) => `${name}'s ${medals.title[m]} medal is slipping`,
  /** The end of a game where gold changed hands. */
  newBadshah: (name: string) => `Naya Badshah: ${name}!`,
  wasBadshah: (name: string, days: number) =>
    days >= 1
      ? `${name} was Badshah for ${days} ${days === 1 ? 'day' : 'days'}`
      : `${name} was Badshah`,
  movedTo: (m: MedalNo, name: string) => `${medals.glyph[m]} ${name} is the new ${medals.title[m]}`,
  defended: 'Takht bacha liya 🛡️',
  defendedSr: (name: string) => `${name} kept the Badshah's seat`,
  /** The month label under a "defending" medal. */
  defending: 'defending',
} as const;
