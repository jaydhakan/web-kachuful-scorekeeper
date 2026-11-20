import { AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { dayLabel } from '@/lib/dates';
import { wasNightSeen } from '@/state/persistence';
import { useApp } from '@/games/kachuful/state/store';
import { nights as ns } from '@/games/kachuful/strings/night';
import { ApiError } from '@/sync/api';
import { ep } from '@/sync/endpoints';
import type { NightRow } from '@/sync/types';
import { RemoteGate } from '@/components/RemoteGate';
import { AvatarStack, EmptyState, Section } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icons';
import { icon } from '@/components/ui/IconsMore';
import { Modal } from '@/components/ui/Modal';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { InlineError } from '@/platform/pages/InlineError';
import { authError } from '@/platform/pages/AuthPages';
import { READY_MS, useNightList, useOpenedNights } from './NightReady';

/** The night still going: counted when its last game is three hours old, or now with End the night. */
function OpenNight({
  row,
  busy,
  err,
  onEnd,
}: {
  row: NightRow;
  busy: boolean;
  err: string;
  onEnd: () => void;
}) {
  return (
    <li className="glass flex flex-col gap-3 px-4 py-3">
      <div className="flex items-center gap-3">
        <span aria-hidden className="shrink-0 text-[var(--accent-tx)]">
          {icon('hourglass', 'h-7 w-7')}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-16 font-bold">{ns.open}</span>
          <span className="text-14 text-[var(--tx2)]">{ns.openSub(row.games)}</span>
        </span>
        <AvatarStack players={row.players} max={4} />
      </div>
      <PrimaryButton tone="glass" busy={busy} onClick={onEnd} className="!h-12 w-full !text-16">
        {busy ? ns.ending : ns.end}
      </PrimaryButton>
      {err && <InlineError msg={err} />}
    </li>
  );
}

function ClosedNight({ row, onOpen }: { row: NightRow & { id: string }; onOpen: () => void }) {
  const fresh = !wasNightSeen(row.id) && Date.now() - row.endedAt < READY_MS;
  const day = dayLabel(row.startedAt);
  const winner = row.winner?.displayName ?? null;
  return (
    <li>
      <button
        type="button"
        data-night-row
        aria-label={ns.rowSaid(day, row.games, winner, fresh)}
        onClick={onOpen}
        className="press glass flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-2 text-16 font-bold">
            {day}
            {fresh && (
              <span className="mat-fill rounded-full px-2 py-0.5 text-13 font-extrabold text-ink-on-accent">
                {ns.fresh}
              </span>
            )}
          </span>
          <span className="text-14 text-[var(--tx2)] [overflow-wrap:anywhere]">
            {ns.row(row.games, winner)}
          </span>
        </span>
        <AvatarStack players={row.players} max={4} />
        <span aria-hidden className="shrink-0 text-[var(--tx2)]">
          {Icon.chev}
        </span>
      </button>
    </li>
  );
}

/** My nights from the server, newest first: the open one (with End the night), then each closed one's story. */
export function YourNights({ playerId, titled }: { playerId: string; titled: boolean }) {
  const { actions } = useApp();
  useOpenedNights();
  const r = useNightList(playerId);
  const [more, setMore] = useState<NightRow[]>([]);
  const [cursor, setCursor] = useState<string | null | undefined>(undefined);
  const [paging, setPaging] = useState<'idle' | 'busy' | 'failed'>('idle');
  const next = cursor === undefined ? r.data?.nextCursor : cursor;
  const [ask, setAsk] = useState(false);
  const [ending, setEnding] = useState(false);
  const [endErr, setEndErr] = useState('');
  const openNight = (id: string) => actions.open({ screen: 'night', params: { id } });
  const end = async () => {
    setAsk(false);
    setEnding(true);
    setEndErr('');
    try {
      const { id } = await ep.closeNight();
      setMore([]);
      setCursor(undefined);
      r.reload();
      openNight(id);
    } catch (e) {
      setEndErr(e instanceof ApiError && e.status === 404 ? ns.noneOpen : authError(e));
    } finally {
      setEnding(false);
    }
  };
  const loadMore = async () => {
    if (!next || paging === 'busy') return;
    setPaging('busy');
    try {
      const p = await ep.nights(playerId, next);
      setMore((m) => [...m, ...p.items]);
      setCursor(p.nextCursor);
      setPaging('idle');
    } catch {
      setPaging('failed');
    }
  };
  return (
    <Section title={titled ? ns.title : undefined}>
      <RemoteGate r={r} rows={3}>
        {(p) => {
          const rows = [...p.items, ...more];
          if (!rows.length) return <EmptyState icon="moon" title={ns.empty} body={ns.emptyBody} />;
          return (
            <>
              <ul className="flex flex-col gap-2">
                {rows.map((row) =>
                  row.id && row.closed ? (
                    <ClosedNight
                      key={row.id}
                      row={{ ...row, id: row.id }}
                      onOpen={() => openNight(row.id!)}
                    />
                  ) : (
                    <OpenNight
                      key="open"
                      row={row}
                      busy={ending}
                      err={endErr}
                      onEnd={() => setAsk(true)}
                    />
                  ),
                )}
              </ul>
              {next && (
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  aria-busy={paging === 'busy' || undefined}
                  className="press glass mt-2 min-h-12 w-full px-4 text-15 font-bold"
                >
                  {ns.more}
                </button>
              )}
              {paging === 'failed' && <InlineError msg={ns.moreFailed} className="mt-2" />}
            </>
          );
        }}
      </RemoteGate>
      <AnimatePresence>
        {ask && (
          <Modal
            text={ns.endAsk}
            body={ns.endBody}
            ok={ns.end}
            onOk={() => void end()}
            onCancel={() => setAsk(false)}
          />
        )}
      </AnimatePresence>
    </Section>
  );
}
