import { API, ApiError, del, get, patch, post } from '@/sync/api';
import type { Page } from '@/sync/types';
import type { SpRules } from '../../domain';
import type { CreateTableIn, SpActionBody, SpLiveOut, SpTableSummary, SpViewOut } from './types';

const T = '/spades/tables';
const enc = encodeURIComponent;

/** One function per Spades online route (backend-requests.md §4.2); writes carry the CSRF header through api.ts. */
export const spEp = {
  create: (b: CreateTableIn) => post<SpViewOut>(T, b),
  byCode: (code: string) => get<{ id: string }>(`${T}/by-code/${enc(code)}`),
  join: (id: string, seat?: number) =>
    post<SpViewOut>(`${T}/${enc(id)}/join`, seat === undefined ? {} : { seat }),
  rules: (id: string, rules: SpRules, name?: string) =>
    patch<SpViewOut>(`${T}/${enc(id)}/rules`, name === undefined ? { rules } : { rules, name }),
  view: (id: string) => get<SpViewOut>(`${T}/${enc(id)}`),
  act: (id: string, body: SpActionBody) => post<SpViewOut>(`${T}/${enc(id)}/actions`, body),
  tables: (status: 'active' | 'finished' = 'active', cursor?: string) =>
    get<Page<SpTableSummary>>(T, { status, cursor }),
  remove: (id: string) => del(`${T}/${enc(id)}`),
  /** A share link's live view: public, no sign-in. */
  live: (token: string) => get<SpLiveOut>(`/public/live/${enc(token)}`),
};

/** The table's live stream. */
export const eventsUrl = (id: string) => `${API}${T}/${enc(id)}/events`;
/** The join QR, drawn by the server (`/spades?join=CODE`). */
export const qrUrl = (id: string) => `${API}${T}/${enc(id)}/qr.svg`;
/** A share link's live stream (public). */
export const liveEventsUrl = (token: string) => `${API}/public/live/${enc(token)}/events`;

/** The current view an action or rules error carries (409 stale, 403 not_your_turn, 422 invalid_action). */
export function viewOfError(e: unknown): SpViewOut | null {
  if (!(e instanceof ApiError)) return null;
  const v = e.body.game as SpViewOut | undefined;
  return v && typeof v === 'object' && v.table && typeof v.table.rev === 'number' ? v : null;
}

/** What went wrong, for a toast: a 422's domain reason, else the error code ('offline' when nothing came back). */
export function reasonOf(e: unknown): string {
  if (!(e instanceof ApiError)) return 'error';
  if (typeof e.body.reason === 'string') return e.body.reason;
  return e.offline ? 'offline' : e.code;
}
