import { CEREMONY_GAP_MS, revealPlan } from '@/components/ui/podiumReveal';
import { GAME_END_MAX_MS } from '@/components/ui/motion';
import { podiumCues } from './podiumCues';

describe('podiumCues', () => {
  const plan = revealPlan([1, 2, 3, 4]);
  const names = (c: { cues: readonly { name: string }[] }) => c.cues.map((x) => x.name);

  it('thuds for 3rd and 2nd, rolls into the winner, and lands the fanfare with the step', () => {
    const c = podiumCues(plan);
    expect(names(c)).toEqual(['thud', 'thud', 'roll', 'fanfare']);
    const at = (n: string) => c.cues.find((x) => x.name === n)!.at;
    expect(at('fanfare')).toBe(plan.step[1]! + 330 + 250);
    expect(at('roll')).toBe(at('fanfare') - 580);
  });

  it('a board crowns with a bell instead of the fanfare', () => {
    expect(names(podiumCues(plan, { board: true }))).toEqual(['thud', 'thud', 'crown']);
  });

  it('a table of two has no 3rd, and a skip or reduced motion keeps only the winner’s sound', () => {
    const c = podiumCues(revealPlan([1, 2]));
    expect(names(c)).toEqual(['thud', 'roll', 'fanfare']);
    expect(c.reduced).toEqual({ name: 'fanfare' });
    expect(c.settle).toEqual({ name: 'fanfare' });
  });

  it('the last game of the night is slower, cracks a patakha, and ends inside the 4s ceiling', () => {
    const slow = revealPlan([1, 2, 3], CEREMONY_GAP_MS);
    const c = podiumCues(slow, { ceremony: true });
    expect(names(c)).toEqual(['thud', 'thud', 'roll', 'fanfare', 'patakha']);
    expect(slow.done).toBeGreaterThan(revealPlan([1, 2, 3]).done);
    // The plan, and the ceremony card's 300ms fade after it, end before the game end's ceiling.
    expect(slow.done + 300).toBeLessThan(GAME_END_MAX_MS);
    expect(c.cues.at(-1)!.at + 800).toBeLessThan(GAME_END_MAX_MS);
  });
});
