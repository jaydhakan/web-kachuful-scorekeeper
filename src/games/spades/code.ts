/** A table's join code: 4 characters from the server's alphabet, which leaves out lookalikes (I, O, 0, 1). */
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 4;

/** Upper-cases and keeps only allowed characters, up to the code's length: what a typed or pasted code becomes. */
export function cleanCode(raw: string): string {
  let out = '';
  for (const ch of raw.toUpperCase()) {
    if (CODE_ALPHABET.includes(ch)) out += ch;
    if (out.length === CODE_LENGTH) break;
  }
  return out;
}

/**
 * A pasted share link (`…/spades?join=KQ7M`) gives its code, and so does a message with the code as a word in it
 * ("Join us: KQ7M"); anything else is read as typed.
 */
export function codeFromPaste(text: string): string {
  const link = /[?&]join=([^&#\s]+)/i.exec(text);
  if (link) return cleanCode(decodeURIComponent(link[1]));
  const word = text
    .split(/[^A-Za-z0-9]+/)
    .find((w) => w.length === CODE_LENGTH && cleanCode(w).length === CODE_LENGTH);
  return cleanCode(word ?? text);
}
