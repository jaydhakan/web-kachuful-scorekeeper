/** Everything the Credits screen names. Edit here; the screen derives initials and links from it. */
export interface Person {
  name: string;
  /** Instagram handle without the @. */
  instagram: string;
}

export const credits = {
  /** An empty handle hides the Instagram link. */
  developer: { name: 'Jay Dhakan', instagram: '', site: 'jay.vectanix.com' },
  design: [{ name: 'Nirav', instagram: 'wxtermelonsugxrhigh' }] as Person[],
  testers: [
    { name: 'Priyank', instagram: 'priiyyankkk' },
    { name: 'Rahil', instagram: '_ex_calibur__' },
  ] as Person[],
  /** The people who play the most; the section is hidden while this is empty. */
  thanks: [] as string[],
};

export const instagramUrl = (handle: string) => `https://instagram.com/${handle}`;
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
