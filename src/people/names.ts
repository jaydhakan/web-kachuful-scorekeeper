/** Player names are unique by this key: trimmed, inner spaces collapsed, case ignored. */
export const nameKey = (s: string): string => s.trim().replace(/\s+/g, ' ').toLowerCase();

/** A display name as typed, tidied: trimmed, single spaces, first letter capitalised. */
export const tidyName = (s: string): string => {
  const n = s.trim().replace(/\s+/g, ' ');
  return n.charAt(0).toUpperCase() + n.slice(1);
};

export const NAME_MAX = 14;

/** Emails compare trimmed and lower-cased. */
export const emailKey = (s: string): string => s.trim().toLowerCase();
/** The shape check the server makes: something@something.something, no spaces. */
export const emailOk = (s: string): boolean => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.trim());

/**
 * A free name for someone whose name is taken: the first name plus a last-name initial ("Riya S"), then the
 * whole last name, then a number. `taken` holds name keys.
 */
export function suggestName(name: string, taken: Set<string>, lastName?: string | null): string {
  const base = tidyName(name);
  const fit = (s: string) => s.slice(0, NAME_MAX).trim();
  const tries: string[] = [];
  const last = lastName?.trim();
  if (last) tries.push(fit(`${base} ${last[0].toUpperCase()}`), fit(`${base} ${tidyName(last)}`));
  for (let i = 2; i < 100; i++) tries.push(fit(`${base.slice(0, NAME_MAX - 3)} ${i}`));
  return tries.find((s) => !taken.has(nameKey(s))) ?? base;
}
