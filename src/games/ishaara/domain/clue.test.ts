import { describe, expect, it } from 'vitest';
import { clueAllowed, clueFormatOk, guessesFor } from './clue';

const board = (words: string[], revealed: Array<number> = []) => ({
  words,
  revealed: words.map((_, i) => (revealed.includes(i) ? ('blank' as const) : null)),
});

describe('clueAllowed', () => {
  const b = board(['SUN', 'Train', 'bake', 'box', 'ice cream']);

  it('blocks a face-down word, any case', () => {
    expect(clueAllowed('sun', b)).toEqual({ ok: false, reason: 'same', word: 'SUN' });
    expect(clueAllowed('TRAIN', b)).toMatchObject({ reason: 'same' });
  });

  it('blocks simple forms: -s, -es, -ed, -ing, -er, and after a silent e', () => {
    for (const w of [
      'trains',
      'trained',
      'training',
      'trainer',
      'boxes',
      'baked',
      'baking',
      'baker',
      'bakes',
    ])
      expect(clueAllowed(w, b)).toMatchObject({ ok: false, reason: 'form' });
  });

  it('blocks a clue whose board word is a form of it', () => {
    expect(clueAllowed('mountain', board(['mountains']))).toMatchObject({ reason: 'form' });
  });

  it('blocks a clue containing a face-down word as a whole part', () => {
    expect(clueAllowed('sunlight', b)).toMatchObject({ reason: 'part', word: 'SUN' });
    expect(clueAllowed('moonsun', b)).toMatchObject({ reason: 'part' });
    expect(clueAllowed('night-trains', b)).toMatchObject({ reason: 'part' });
  });

  it('does not block a short word buried mid-clue', () => {
    expect(clueAllowed('unboxed', board(['box']))).toEqual({ ok: true });
  });

  it('a word becomes usable once it is revealed', () => {
    expect(clueAllowed('sun', board(['sun'], [0]))).toEqual({ ok: true });
  });

  it('allows unrelated words, Hindi in Latin or Devanagari, and hyphens', () => {
    expect(clueAllowed('spice', b)).toEqual({ ok: true });
    expect(clueAllowed('jugaad', b)).toEqual({ ok: true });
    expect(clueAllowed('बारिश', b)).toEqual({ ok: true });
    expect(clueAllowed('tea-time', b)).toEqual({ ok: true });
  });

  it('rejects empty, spaced, numeric or punctuated clues', () => {
    expect(clueAllowed('  ', b)).toEqual({ ok: false, reason: 'empty' });
    for (const w of ['two words', 'r2d2', 'hi!', '-dash', 'a--b'])
      expect(clueAllowed(w, b)).toMatchObject({ reason: 'format' });
  });
});

describe('clueFormatOk and guessesFor', () => {
  it('caps a clue at 24 letters', () => {
    expect(clueFormatOk('a'.repeat(24))).toBe(true);
    expect(clueFormatOk('a'.repeat(25))).toBe(false);
  });
  it('maps numbers to guesses', () => {
    expect([0, 1, 9, 'inf'].map((n) => guessesFor(n as 0))).toEqual(['inf', 2, 10, 'inf']);
  });
});
