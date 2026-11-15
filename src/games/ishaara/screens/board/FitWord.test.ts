import { splitWord } from './FitWord';

describe('long words', () => {
  it('split at their own hyphen or space near the middle, else in the middle with a hyphen', () => {
    expect(splitWord('KARVA-CHAUTH')).toEqual(['KARVA-', 'CHAUTH']);
    expect(splitWord('ICE CREAM')).toEqual(['ICE', 'CREAM']);
    expect(splitWord('WICKETKEEPER')).toEqual(['WICKET-', 'KEEPER']);
    // A hyphen far from the middle is no help: it splits in the middle.
    expect(splitWord('A-BCDEFGHIJKL')).toEqual(['A-BCDEF-', 'GHIJKL']);
  });
});
