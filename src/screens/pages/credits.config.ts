/** Everything the Credits screen names. Edit here; the screen derives initials and links from it. */
export interface Person {
  name: string;
  /** Instagram handle without the @. */
  instagram: string;
}

export const credits = {
  /** An empty handle hides the Instagram link. */
  developer: { name: 'Jay Dhakan', instagram: 'jaydhakan_11', site: 'jay.vectanix.com' },
  design: [{ name: 'Nirav', instagram: 'wxtermelonsugxrhigh' }] as Person[],
  testers: [
    { name: 'Priyank', instagram: 'priiyyankkk' },
    { name: 'Rahil', instagram: '_ex_calibur__' },
    { name: 'Akshesh', instagram: 'aksheshpithwa' },
  ] as Person[],
  /** Who the "regulars" section thanks: the most rounds played all time, among players with at least `minRounds`. */
  regulars: { top: 10, minRounds: 500 },
};

export const instagramUrl = (handle: string) => `https://instagram.com/${handle}`;
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
