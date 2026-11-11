import type { ClueNumber, IshaaraPublic } from './types';

export const MAX_CLUE_LEN = 24;
const SUFFIXES = ['s', 'es', 'ed', 'ing', 'er'];
// A face-down word inside a longer clue counts only from this length, so "pin" doesn't block "spine".
const MIN_PART = 3;

export type ClueCheck =
  | { ok: true }
  | { ok: false; reason: 'empty' | 'format' }
  | { ok: false; reason: 'same' | 'form' | 'part'; word: string };

/** Lower-case, composed form: how clues and board words are compared. */
export const norm = (s: string) => s.normalize('NFC').toLowerCase().trim();

const isLetter = (ch: string) => /^[\p{L}\p{M}]$/u.test(ch);

/** One word: letters, with single hyphens between parts. */
export function clueFormatOk(word: string): boolean {
  const w = norm(word);
  if (!w || [...w].length > MAX_CLUE_LEN) return false;
  return w.split('-').every((part) => part.length > 0 && [...part].every(isLetter));
}

/** The simple forms of a word: plural, -s, -es, -ed, -ing, -er, and the same after a silent e. */
export function formsOf(w: string): string[] {
  const out = SUFFIXES.map((s) => w + s);
  if (w.endsWith('e')) out.push(w + 'd', w + 'r', w.slice(0, -1) + 'ing');
  return out;
}

const isFormOf = (a: string, b: string) => formsOf(b).includes(a);

function clash(clue: string, word: string): 'same' | 'form' | 'part' | null {
  if (clue === word) return 'same';
  if (isFormOf(clue, word) || isFormOf(word, clue)) return 'form';
  const parts = clue.split('-');
  if (parts.length > 1 && parts.some((p) => p === word || isFormOf(p, word))) return 'part';
  if (
    word.length >= MIN_PART &&
    clue.length > word.length &&
    (clue.startsWith(word) || clue.endsWith(word))
  )
    return 'part';
  return null;
}

/**
 * Checks a typed clue against the words still face down (§2.2). The app blocks what this catches; everything else
 * (rhymes, translations, letter clues) is the other clue-giver's Not allowed.
 */
export function clueAllowed(
  word: string,
  state: Pick<IshaaraPublic, 'words' | 'revealed'>,
): ClueCheck {
  const clue = norm(word);
  if (!clue) return { ok: false, reason: 'empty' };
  if (!clueFormatOk(clue)) return { ok: false, reason: 'format' };
  for (let i = 0; i < state.words.length; i++) {
    if (state.revealed[i] !== null) continue;
    const reason = clash(clue, norm(state.words[i]));
    if (reason) return { ok: false, reason, word: state.words[i] };
  }
  return { ok: true };
}

export const isClueNumber = (n: unknown): n is ClueNumber =>
  n === 'inf' || (typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 9);

/** Clue 1–9 allows number + 1 guesses; 0 and ∞ allow as many as the team wants. */
export const guessesFor = (n: ClueNumber): number | 'inf' =>
  n === 'inf' || n === 0 ? 'inf' : n + 1;
