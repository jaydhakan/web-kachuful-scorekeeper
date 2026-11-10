import { describe, expect, it } from 'vitest';
import { withoutShared } from '../../tools/ownCss';

describe('withoutShared (a game sheet keeps only its own rules)', () => {
  const site = '.p-4{padding:1rem}@media (min-width:768px){.md\\:p-8{padding:2rem}}';

  it('drops rules the site sheet has, keeps the rest, and drops emptied at-rules', () => {
    const own =
      '.p-4{padding:1rem}.grid-cols-5{grid-template-columns:repeat(5,minmax(0,1fr))}' +
      '@media (min-width:768px){.md\\:p-8{padding:2rem}}@container (min-width:40rem){.p-4{padding:1rem}}';
    expect(withoutShared(own, site)).toBe(
      '.grid-cols-5{grid-template-columns:repeat(5,minmax(0,1fr))}@container (min-width:40rem){.p-4{padding:1rem}}',
    );
  });
});
