import { CODE_LENGTH, cleanCode } from '@/games/spades/code';

/** How an address opens online play; the online app takes it as its one prop. */
export type OnlineEntry =
  | { kind: 'create' }
  | { kind: 'join'; code: string }
  | { kind: 'table'; id: string }
  | { kind: 'live'; token: string }
  | { kind: 'recap'; token: string };

// A table or game id from the server, or a share token: nothing that could reach the address bar unescaped.
const ID = /^[\w-]{1,80}$/;

/**
 * `?table=new` → create, `?table=<id>` or `?game=<id>` (a seat invite opened by address) → that table,
 * `?join=CODE` → join by code, `?live=TOKEN` → watch, `?recap=TOKEN` → the final board. Anything else (or a malformed value) is null: Home.
 */
export function parseOnlineEntry(search: string): OnlineEntry | null {
  const q = new URLSearchParams(search);
  const live = q.get('live');
  if (live && ID.test(live)) return { kind: 'live', token: live };
  const recap = q.get('recap');
  if (recap && ID.test(recap)) return { kind: 'recap', token: recap };
  const join = q.get('join');
  if (join !== null) {
    const code = cleanCode(join);
    return code.length === CODE_LENGTH ? { kind: 'join', code } : null;
  }
  const table = q.get('table') ?? q.get('game');
  if (table === 'new') return { kind: 'create' };
  if (table && ID.test(table)) return { kind: 'table', id: table };
  return null;
}
