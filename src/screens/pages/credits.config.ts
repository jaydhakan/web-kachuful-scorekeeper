/** Everything the Credits screen names. Edit here; the screen derives initials and links from it. */
export interface Person {
  name: string;
  /** Instagram handle without the @. */
  instagram: string;
}

export const credits = {
  developer: { name: 'Jay Dhakan', instagram: 'YOUR_INSTA', site: 'jay.vectanix.com' },
  design: [{ name: 'Friend Name', instagram: 'insta_id' }] as Person[],
  testers: [
    { name: 'Friend Name', instagram: 'insta_id' },
    { name: 'Friend Name', instagram: 'insta_id' },
  ] as Person[],
  /** The people who play the most. */
  thanks: ['Name', 'Name', 'Name', 'Name', 'Name'],
};

export const instagramUrl = (handle: string) => `https://instagram.com/${handle}`;
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
