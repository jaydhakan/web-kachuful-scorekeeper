/** What the landing page says about a Spades game in progress; tiny, since the landing page loads it. */
export const spPlatform = {
  peek: {
    hand: (n: number) => `Hand ${n}`,
    deals: (name: string) => `${name} deals`,
    team: (a: string, b: string) => `${a} & ${b}`,
  },
} as const;
