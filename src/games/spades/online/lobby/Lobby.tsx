import { AnimatePresence, LayoutGroup, m } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { TableInviteSheet } from '@/components/seat-invites/TableInviteSheet';
import { Icon } from '@/components/ui/Icons';
import { IconButton } from '@/components/ui/IconButton';
import { Modal } from '@/components/ui/Modal';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Sheet } from '@/components/ui/Sheet';
import { Toast } from '@/components/ui/Toast';
import { vibrate } from '@/hooks/useHaptics';
import { useHistorySync } from '@/hooks/useHistorySync';
import { t as tx } from '@/strings';
import { seatEp, type CircleMember } from '@/sync/seatInviteApi';
import { partnerOf, SEATS, type Seat, type SpView } from '../../domain';
import { spGo } from '../../nav';
import EditRules from '../../sheets/EditRules';
import { online as o, refusalText, rulesSheet } from '../../strings/online';
import RulesLine from '../../ui/RulesLine';
import { useTable } from '../state/tableContext';
import { reasonOf, spEp } from '../sync/endpoints';
import type { SpViewOut } from '../sync/types';
import { Chair } from './Chair';
import { DrawReveal } from './DrawReveal';
import { RoomCode, ShareCard } from './RoomCode';
import { allSeated, bandOf, canDraw, placeOf } from './seats';
import { useLobbyRules } from './useLobbyRules';

type Panel = { kind: 'rules' } | { kind: 'invite'; seat: Seat } | { kind: 'cancel'; seat: Seat };
type ToastMsg = { id: number; msg: string; undo: false };

export interface LobbyProps {
  /** Takes a view a route answered with (rules PATCH, join), so the lobby needn't wait for the stream. */
  adopt: (v: SpViewOut) => void;
  /** The draw for deal has happened: play its reveal, then `onRevealDone` opens the table. */
  reveal: boolean;
  onRevealDone: () => void;
}

/**
 * The lobby (plan §2.3): the room code, the rules line, the share card, four chairs and the way to the deal. The host
 * invites, shuffles partners and draws for deal; everyone moves chairs and says they are ready.
 */
export default function Lobby({ adopt, reveal, onRevealDone }: LobbyProps) {
  const ctx = useTable();
  const view = ctx.view!;
  const table = view.table;
  const me = view.me.seat;
  const host = view.me.host;
  const anchor: Seat = me ?? 0;
  const hostWho = table.seats[table.host].who;
  const { rules, name, change } = useLobbyRules(
    table.id,
    { rules: table.rules, name: table.name },
    adopt,
  );

  const [panel, setPanel] = useState<Panel | null>(null);
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const [shakes, setShakes] = useState<number[]>([0, 0, 0, 0]);
  const [dealerShown, setDealerShown] = useState(false);
  const close = useCallback(() => setPanel(null), []);
  useHistorySync(panel ? 1 : 0, close);

  const say = useCallback((msg: string) => {
    setToast({ id: Date.now() + Math.random(), msg, undo: false });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    const msg = refusalText(ctx.lastError);
    if (msg) say(msg);
  }, [ctx.lastError, say]);

  // Arrivals, declines and cancellations, worked out from what changed between views.
  const seen = useRef<{ users: Set<string>; invites: typeof ctx.invites } | null>(null);
  const cancelled = useRef(new Set<string>());
  const users = table.seats.map((x) => x.who?.userId ?? null);
  useEffect(() => {
    const prev = seen.current;
    seen.current = { users: new Set(users.filter((u): u is string => !!u)), invites: ctx.invites };
    if (!prev) return;
    SEATS.forEach((s) => {
      const who = table.seats[s].who;
      if (who && !prev.users.has(who.userId) && s !== me) {
        say(o.lobby.joined(who.name));
        if (host) vibrate(10);
      }
      const was = prev.invites[s];
      if (was && !ctx.invites[s] && !who && !users.includes(was.userId)) {
        if (cancelled.current.has(was.inviteId)) return;
        setShakes((k) => k.map((n, i) => (i === s ? n + 1 : n)));
        say(o.lobby.cantJoin(was.name));
        vibrate(12);
      }
    });
    // Keyed on the joined user ids, so a rules change alone never reads as an arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users.join(), ctx.invites]);
  const known = seen.current?.users;

  const act = ctx.act;
  const move = async (seat: Seat) => {
    close();
    try {
      adopt(await spEp.join(table.id, seat));
    } catch (e) {
      say(refusalText(reasonOf(e)) ?? '');
    }
  };

  const invite = async (seat: Seat, m: CircleMember) => {
    await seatEp.create(table.id, { userId: m.userId, seat: String(seat) });
    close();
    say(o.lobby.inviteSent(m.name));
    vibrate(8);
  };
  const cancelInvite = async (seat: Seat) => {
    const inv = ctx.invites[seat];
    close();
    if (!inv) return;
    cancelled.current.add(inv.inviteId);
    try {
      await seatEp.cancel(inv.inviteId);
      say(o.lobby.cancelled(inv.name));
    } catch {
      cancelled.current.delete(inv.inviteId);
      say(refusalText('error') ?? '');
    }
  };

  const shuffle = async () => {
    if ((await act({ type: 'shufflePartners' })) !== 'ok') return;
    vibrate(10);
  };
  // After a shuffle the host hears who their partner is now.
  const partnerId = me === null ? null : (table.seats[partnerOf(me)].who?.userId ?? null);
  const lastPartner = useRef(partnerId);
  useEffect(() => {
    const was = lastPartner.current;
    lastPartner.current = partnerId;
    if (!was || !partnerId || was === partnerId || me === null) return;
    const p = table.seats[partnerOf(me)].who;
    if (p && allSeated(table)) say(o.lobby.shuffled(p.name));
  }, [partnerId, me, table, say]);

  const mine = me === null ? null : table.seats[me];
  const full = allSeated(table);
  const drawable = canDraw(table, ctx.presence);
  const drawing = reveal || table.status !== 'lobby';
  let drawLabel: string;
  if (drawing) drawLabel = host ? o.lobby.drawing : o.lobby.guestDrawing(hostWho?.name ?? '');
  else if (!host) drawLabel = o.lobby.guestDeals(hostWho?.name ?? '');
  else if (drawable) drawLabel = o.lobby.draw;
  else if (!full) drawLabel = o.lobby.waitPlayers;
  else if (!table.seats.every((x) => x.ready)) drawLabel = o.lobby.waitReady;
  else drawLabel = o.lobby.waitConnected;

  const subtitle = full
    ? o.lobby.subtitleFull
    : host
      ? o.lobby.subtitleHost
      : o.lobby.subtitleWaiting;
  const exclude = [
    ...users.filter((u): u is string => !!u),
    ...ctx.invites.flatMap((i) => (i ? [i.userId] : [])),
  ];

  return (
    <div className="app-root scr-bg relative h-full w-full">
      <div {...(panel ? { inert: '' as const } : {})} className="absolute inset-0 flex flex-col">
        <header className="flex shrink-0 items-center gap-1 pl-[max(0.5rem,var(--sal))] pr-[max(0.5rem,var(--sar))] pt-[max(0.5rem,var(--sat))]">
          <IconButton label={o.lobby.leave} onClick={() => spGo('')} chrome>
            {Icon.back}
          </IconButton>
          <div className="min-w-0 flex-1 text-center">
            <h1 className="disp [overflow-wrap:anywhere] text-20 font-bold tracking-[-0.02em]">
              {name}
            </h1>
            <p className="[overflow-wrap:anywhere] text-13 text-[var(--tx2)]">{subtitle}</p>
          </div>
          <span aria-hidden className="h-12 w-12 shrink-0" />
        </header>
        {ctx.status === 'reconnecting' && (
          <p
            role="status"
            className="mx-auto mt-1 rounded-full bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] px-3 py-1 text-13 font-bold text-[var(--warning)]"
          >
            {o.reconnecting}
          </p>
        )}
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-3 pl-[max(1rem,var(--sal))] pr-[max(1rem,var(--sar))]">
          <div className="mx-auto flex w-full max-w-[28rem] flex-col gap-3.5 pt-2">
            <RoomCode code={table.code} />
            <RulesLine
              rules={rules}
              online
              editable={host}
              onOpen={() => setPanel({ kind: 'rules' })}
            />
            {!full && <ShareCard code={table.code} qrUrl={ctx.qrUrl} name={name} />}
            <LayoutGroup id={`sp-lobby-${table.id}`}>
              <section
                aria-label={o.lobby.table}
                className="relative mx-auto h-[290px] w-full max-w-[24rem]"
              >
                <div
                  aria-hidden
                  className="felt absolute inset-x-[70px] inset-y-[52px] grid place-items-center rounded-[50%] text-48 opacity-90"
                >
                  <span className="opacity-20">♠</span>
                </div>
                {SEATS.map((s) => {
                  const x = table.seats[s];
                  return (
                    <Chair
                      key={s}
                      place={placeOf(s, anchor)}
                      who={x.who}
                      invite={ctx.invites[s]}
                      ready={x.ready}
                      present={ctx.presence[s]}
                      me={s === me}
                      hosts={s === table.host}
                      band={bandOf(s, me)}
                      viewerHosts={host}
                      arrived={!!known && !!x.who && !known.has(x.who.userId)}
                      shake={shakes[s]}
                      dealer={dealerShown && table.dealer === s}
                      disabled={ctx.busy || drawing}
                      onInvite={() => setPanel({ kind: 'invite', seat: s })}
                      onSit={() => void move(s)}
                      onCancel={() => setPanel({ kind: 'cancel', seat: s })}
                    />
                  );
                })}
                {reveal && table.drawn && table.dealer !== null && (
                  <DrawReveal
                    drawn={table.drawn}
                    dealer={table.dealer}
                    placeOf={(s) => placeOf(s, anchor)}
                    onWin={() => setDealerShown(true)}
                    onDone={onRevealDone}
                  />
                )}
              </section>
            </LayoutGroup>
            <DrawLine view={view} show={reveal && dealerShown} />
          </div>
        </div>
        {/* Pinned under the scroll, so Ready and Draw for deal stay on screen on a short or sideways phone. */}
        <div className="shrink-0 pb-[max(0.75rem,var(--sab))] pl-[max(1rem,var(--sal))] pr-[max(1rem,var(--sar))] pt-2">
          <div className="mx-auto flex w-full max-w-[28rem] flex-col gap-2.5">
            {mine && !drawing && (
              <div className="flex gap-2.5">
                {host && (
                  <PrimaryButton
                    tone="glass"
                    className="min-h-[52px] flex-1"
                    disabled={!full || ctx.busy}
                    onClick={() => void shuffle()}
                  >
                    {o.lobby.shuffle}
                  </PrimaryButton>
                )}
                <PrimaryButton
                  tone="glass"
                  aria-pressed={mine.ready}
                  className="min-h-[52px] flex-1"
                  disabled={ctx.busy}
                  onPointerDown={() => vibrate(10)}
                  onClick={() => void act({ type: mine.ready ? 'unready' : 'ready' })}
                >
                  {mine.ready ? o.lobby.notReady : o.lobby.ready}
                </PrimaryButton>
              </div>
            )}
            <PrimaryButton
              className="min-h-[56px] w-full"
              disabled={!host || !drawable || drawing || ctx.busy}
              busy={host && drawing}
              onClick={() => void act({ type: 'drawForDeal' })}
            >
              {drawLabel}
            </PrimaryButton>
          </div>
        </div>
      </div>
      <Toast toast={toast} onUndo={() => {}} onDismiss={() => setToast(null)} />
      <AnimatePresence>
        {panel?.kind === 'rules' && (
          <Sheet key="rules" title={rulesSheet.title} onClose={close}>
            <EditRules
              rules={rules}
              name={name}
              editable={host}
              online
              hostName={hostWho?.name}
              onChange={change}
              onClose={close}
            />
          </Sheet>
        )}
        {panel?.kind === 'invite' && (
          <TableInviteSheet
            key="invite"
            title={o.invite.title}
            subtitle={
              me === null
                ? undefined
                : bandOf(panel.seat, me) === 'partner'
                  ? o.invite.partner
                  : o.invite.opponent
            }
            exclude={exclude}
            onClose={close}
            onPick={(m) => invite(panel.seat, m)}
            lead={
              <button
                type="button"
                onClick={() => void move(panel.seat)}
                className="press mb-1 flex min-h-14 w-full items-center gap-3 rounded-[14px] p-1.5 text-left"
              >
                <span
                  aria-hidden
                  className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full border-2 border-dashed border-[var(--accent)] text-[var(--accent-tx)]"
                >
                  {Icon.seat}
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-16">{o.invite.moveHere}</b>
                  <small className="block text-13 text-[var(--tx2)]">{o.invite.moveHereSub}</small>
                </span>
              </button>
            }
          />
        )}
        {panel?.kind === 'cancel' && ctx.invites[panel.seat] && (
          <Modal
            key="cancel"
            text={o.invite.cancelTitle(ctx.invites[panel.seat]!.name)}
            body={o.invite.cancelBody(ctx.invites[panel.seat]!.name)}
            ok={o.invite.cancel}
            danger
            cancel={o.invite.keep}
            onOk={() => void cancelInvite(panel.seat)}
            onCancel={close}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/** Who drew the highest card, said once the reveal lights it (and read out for screen readers). */
function DrawLine({ view, show }: { view: SpView; show: boolean }) {
  const t = view.table;
  const d = t.dealer;
  const text =
    show && d !== null && t.drawn
      ? d === view.me.seat
        ? o.draw.youDeal(tx.card.name(t.drawn[d].rank, t.drawn[d].suit))
        : o.draw.theyDeal(
            t.seats[d].who?.name ?? '',
            tx.card.name(t.drawn[d].rank, t.drawn[d].suit),
          )
      : '';
  return (
    <p role="status" className="min-h-6 text-center text-15 font-semibold">
      {text && (
        <m.span
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-block"
        >
          {text}
        </m.span>
      )}
    </p>
  );
}
