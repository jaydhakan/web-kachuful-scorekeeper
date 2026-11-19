import { describe, expect, it } from 'vitest';
import { shortName, teamLabels, teamOrder } from './teams';

const names = ['Riya', 'Arjun', 'Dev', 'Meera'];

describe('team labels', () => {
  it('names your own team "You & partner" and the other by its two players', () => {
    expect(teamLabels(0, names)).toEqual({ a: 'You & Dev', b: 'Arjun & Meera' });
    expect(teamLabels(3, names)).toEqual({ a: 'Riya & Dev', b: 'You & Arjun' });
  });

  it('gives someone watching both pairs', () => {
    expect(teamLabels(null, names)).toEqual({ a: 'Riya & Dev', b: 'Arjun & Meera' });
  });

  it('cuts long names without splitting an emoji', () => {
    expect(shortName('Jayendrasinh')).toBe('Jayendr…');
    expect(shortName('🦊🦊🦊🦊🦊🦊🦊🦊🦊')).toBe('🦊🦊🦊🦊🦊🦊🦊…');
    expect(shortName('Asha')).toBe('Asha');
  });

  it('puts the viewer’s team first', () => {
    expect(teamOrder(0)).toEqual(['a', 'b']);
    expect(teamOrder(1)).toEqual(['b', 'a']);
    expect(teamOrder(null)).toEqual(['a', 'b']);
  });
});
