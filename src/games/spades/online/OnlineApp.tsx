import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { Loader } from '@/components/ui/Loader';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { uuid } from '@/lib/ids';
import { ApiError } from '@/sync/api';
import { spGo } from '../nav';
import { online as o } from '../strings/online';
import type { OnlineEntry } from './entry';
import ShareView from './live/ShareView';
import Lobby from './lobby/Lobby';
import PlayTable from './table/PlayTable';
import { loadLastRules } from './state/lastSetup';
import { TableContext } from './state/tableContext';
import { useTableLink } from './state/useTableLink';
import { reasonOf, spEp, viewOfError } from './sync/endpoints';

function Loading({ label }: { label: string }) {
  return (
    <div className="app-root scr-bg relative h-full w-full">
      <p role="status" className="sr-only">
        {label}
      </p>
      <Loader />
    </div>
  );
}

function Problem({ title, body, onRetry }: { title: string; body: string; onRetry?: () => void }) {
  return (
    <main
      role="alert"
      className="app-root scr-bg grid h-full w-full place-content-center justify-items-center gap-4 p-6 text-center"
    >
      <h1 className="disp text-28 font-bold tracking-[-0.02em]">{title}</h1>
      <p className="max-w-[34ch] text-16 text-[var(--tx2)]">{body}</p>
      {onRetry && (
        <PrimaryButton className="min-w-[16rem] px-6" onClick={onRetry}>
          {o.error.retry}
        </PrimaryButton>
      )}
      <button
        type="button"
        className="press min-h-11 px-3 text-16 font-semibold underline"
        onClick={() => spGo('')}
      >
        {o.back}
      </button>
    </main>
  );
}

/** Runs `work` once per attempt (StrictMode's second effect included); `retry` starts a new attempt. */
function useOnce(work: () => Promise<void>, attempt: number) {
  const done = useRef(-1);
  useEffect(() => {
    if (done.current === attempt) return;
    done.current = attempt;
    void work();
  }, [work, attempt]);
}

/** `?table=new`: creates a table with the host's last rules, then becomes that table's address. */
function Create() {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState<string | null>(null);
  const work = useCallback(async () => {
    setFailed(null);
    const id = uuid();
    try {
      await spEp.create({ id, rules: loadLastRules() });
      spGo(`?table=${id}`, { replace: true });
    } catch (e) {
      setFailed(e instanceof ApiError && e.code === 'no_player' ? o.error.noPlayer : o.error.body);
    }
  }, []);
  useOnce(work, attempt);
  if (failed)
    return (
      <Problem title={o.error.createTitle} body={failed} onRetry={() => setAttempt((n) => n + 1)} />
    );
  return <Loading label={o.open.creating} />;
}

/** `?join=CODE`: finds the table, takes a seat (or finds the one already held), then becomes its address. */
function Join({ code }: { code: string }) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState<{ body: string; retry: boolean } | null>(null);
  const work = useCallback(async () => {
    setFailed(null);
    let id: string;
    try {
      id = (await spEp.byCode(code)).id;
    } catch (e) {
      const missing = e instanceof ApiError && e.status === 404;
      return setFailed({
        body: missing ? o.error.unknownCode(code) : o.error.body,
        retry: !missing,
      });
    }
    try {
      await spEp.join(id);
    } catch (e) {
      // Already at this table (it started, or it's someone else's move): open it all the same.
      if (viewOfError(e)?.me.seat != null) return spGo(`?table=${id}`, { replace: true });
      const why = reasonOf(e);
      const body =
        why === 'full'
          ? o.error.full
          : why === 'started'
            ? o.error.started
            : why === 'no_player'
              ? o.error.noPlayer
              : o.error.body;
      return setFailed({ body, retry: why === 'offline' || why === 'server' });
    }
    spGo(`?table=${id}`, { replace: true });
  }, [code]);
  useOnce(work, attempt);
  if (failed)
    return (
      <Problem
        title={o.error.joinTitle(code)}
        body={failed.body}
        onRetry={failed.retry ? () => setAttempt((n) => n + 1) : undefined}
      />
    );
  return <Loading label={o.open.joining(code)} />;
}

/** One table: the lobby while it waits (and through the draw for deal's reveal), then the play screen. */
function Table({ id }: { id: string }) {
  const ctx = useTableLink(id);
  const status = ctx.view?.table.status;
  // Seen in the lobby on this visit: the draw for deal then plays out here before the table opens.
  const [sawLobby, setSawLobby] = useState(false);
  const [revealed, setRevealed] = useState(false);
  if (status === 'lobby' && !sawLobby) setSawLobby(true);
  const onRevealDone = useCallback(() => setRevealed(true), []);

  if (ctx.status === 'gone') return <Problem title={o.error.goneTitle} body={o.error.goneBody} />;
  if (!ctx.view) {
    if (ctx.status === 'error')
      return <Problem title={o.error.title} body={o.error.body} onRetry={ctx.reload} />;
    return <Loading label={o.open.loading} />;
  }
  const t = ctx.view.table;
  const drawnHere =
    sawLobby && !revealed && t.status === 'playing' && t.drawn !== null && t.history.length === 0;
  let screen: ReactElement;
  if (t.status === 'cancelled' && t.history.length === 0 && !t.drawn)
    screen = <Problem title={o.error.goneTitle} body={o.error.goneBody} />;
  else if (t.status === 'lobby' || drawnHere)
    screen = <Lobby adopt={ctx.adopt} reveal={drawnHere} onRevealDone={onRevealDone} />;
  else screen = <PlayTable />;
  return <TableContext.Provider value={ctx}>{screen}</TableContext.Provider>;
}

/**
 * Online play, one address at a time: create a table, join one by code, open one by id, or watch one through a live
 * link. Signed out, only the live view reaches here (the root sends the rest to Home).
 */
const OnlineApp: (props: { entry: OnlineEntry }) => ReactElement | null = ({ entry }) => {
  switch (entry.kind) {
    case 'create':
      return <Create />;
    case 'join':
      return <Join key={entry.code} code={entry.code} />;
    case 'table':
      return <Table key={entry.id} id={entry.id} />;
    case 'live':
      return <ShareView key={entry.token} token={entry.token} recap={false} />;
    case 'recap':
      return <ShareView key={entry.token} token={entry.token} recap />;
  }
};
export default OnlineApp;
