import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import {
  clueGiverOf,
  other,
  type ClueNumber,
  type Action,
  type IshaaraPublic,
  type Team,
} from '@/games/ishaara/domain';
import { useIshaara } from '@/games/ishaara/state/store';
import { useClue, type IshaaraClue } from '@/games/ishaara/state/useTable';
import { clue } from '@/games/ishaara/strings/clue';
import { icon } from '@/components/ui/IconsMore';
import { Icon } from '@/components/ui/Icons';
import { Modal } from '@/components/ui/Modal';
import { useWakeLock } from '@/hooks/useWakeLock';
import { ClueEntry } from './ClueEntry';
import { Counts, KeyGrid, Mark, TeamPill, TINT } from './KeyParts';
import { FinishedPanel, NotePanel, OursPanel, PenaltyPanel, TheirsPanel } from './Panels';
import { CTA, OUTLINE, sendError, useCountdown } from './clueKit';

/** A centred message for loading, refusal and error states, with an optional action. */
function Notice({
  text,
  busy,
  action,
  back,
}: {
  text: string;
  busy?: boolean;
  action?: { label: string; run(): void };
  back?: () => void;
}) {
  return (
    <div className="grid min-h-full content-center justify-items-center gap-4 p-6 text-center">
      <p role={busy ? 'status' : 'alert'} className="max-w-[32ch] text-18 text-key-text-2">
        {text}
      </p>
      {action && (
        <button type="button" onClick={action.run} className={`${CTA} max-w-xs`}>
          {action.label}
        </button>
      )}
      {back && (
        <button type="button" onClick={back} className={`${OUTLINE} max-w-xs`}>
          {clue.load.back}
        </button>
      )}
    </div>
  );
}

function Gate({
  team,
  name,
  onShow,
  onLeave,
}: {
  team: Team | null;
  name: string | null;
  onShow(): void;
  onLeave(): void;
}) {
  const show = useRef<HTMLButtonElement>(null);
  useEffect(() => show.current?.focus(), []);
  return (
    <div className="mx-auto grid min-h-full w-full max-w-[30rem] grid-rows-[auto_1fr_auto] gap-6 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <div>{team && <TeamPill team={team} name={name} />}</div>
      <div className="grid content-center justify-items-center gap-4 text-center">
        <span className="grid h-24 w-24 place-items-center rounded-full bg-key-surface">
          {icon('eyeOff', 'h-10 w-10')}
        </span>
        <h1 className="max-w-[16ch] text-30 font-bold leading-tight tracking-[-0.02em]">
          {clue.gate.title}
        </h1>
        <p className="max-w-[34ch] text-18 text-key-text-2">{clue.gate.body}</p>
      </div>
      <div className="grid gap-3">
        <button ref={show} type="button" onClick={onShow} className={CTA}>
          {icon('eye', 'h-6 w-6')}
          {clue.gate.show}
        </button>
        <button type="button" onClick={onLeave} className={OUTLINE}>
          {clue.gate.notYet}
        </button>
      </div>
    </div>
  );
}

/** The key and whatever this phone can do right now (clue, Not allowed, penalty pick). */
function KeyBoard({ c, onHide }: { c: IshaaraClue; onHide(): void }) {
  const { actions } = useIshaara();
  const rm = useReducedMotion();
  const g = c.game!;
  const keyIds = c.key!;
  const team = c.team!;
  const live = c.conn === 'live';
  const disabled = !live || c.busy;
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [typing, setTyping] = useState(false);
  const [asking, setAsking] = useState(false);
  const hide = useRef<HTMLButtonElement>(null);
  useEffect(() => hide.current?.focus(), []);
  // A new state from the server answers whatever the last message was about.
  useEffect(() => setError(null), [g.rev]);

  const picker = g.status === 'active' && !!g.pending && other(g.pending.penaltyFor) === team;
  useEffect(() => {
    if (!picker) setSelected(null);
  }, [picker]);
  const mine = g.turn === team;

  const send = async (a: Action) => {
    setError(null);
    const r = await c.send(a);
    setError(sendError(r));
    return r.ok;
  };
  const sendClue = (word: string | null, number: ClueNumber) =>
    void send({ type: 'clue', word, number });
  const reveal = async () => {
    if (selected === null) return;
    if (await send({ type: 'penaltyReveal', card: selected })) setSelected(null);
  };

  const line =
    g.status === 'finished'
      ? clue.status.finished
      : g.status === 'waiting'
        ? clue.status.waiting
        : picker
          ? clue.status.picking
          : mine
            ? g.clue
              ? clue.status.yourGuessing(team)
              : clue.status.yourClue(team)
            : clue.status.theirs(g.turn);

  let panel;
  if (g.status === 'finished')
    panel = (
      <FinishedPanel
        game={g}
        team={team}
        onNext={(id) => actions.openGame(id, 'clue')}
        onBack={actions.leave}
      />
    );
  else if (g.status === 'waiting')
    panel = <NotePanel title={clue.waiting.title} body={clue.waiting.body} />;
  else if (g.pending)
    panel = picker ? (
      <PenaltyPanel
        game={g}
        selected={selected}
        disabled={disabled}
        onConfirm={() => void reveal()}
        onClear={() => setSelected(null)}
      />
    ) : (
      <NotePanel body={clue.penalty.against(other(team))} />
    );
  else if (mine && !g.clue)
    panel = <ClueEntry game={g} disabled={disabled} onSend={sendClue} onTyping={setTyping} />;
  else if (mine) panel = <OursPanel game={g} offset={c.clockOffset} />;
  else
    panel = (
      <TheirsPanel
        game={g}
        offset={c.clockOffset}
        disabled={disabled}
        onNotAllowed={() => void send({ type: 'notAllowed' })}
      />
    );
  const finished = g.status === 'finished';
  // Leaving is always one tap away (ISH-F03); it asks first only while the table waits on this phone's clue.
  const waitsOnMe = g.status === 'active' && mine && !g.clue && !g.pending;
  const leave = () => (waitsOnMe ? setAsking(true) : actions.leave());
  const HEAD_BTN =
    'press inline-flex min-h-12 shrink-0 items-center gap-2 rounded-[16px] bg-key-surface px-4 text-18 font-semibold shadow-[inset_0_0_0_1px_var(--key-edge)]';

  return (
    <m.div
      initial={rm ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      data-typing={typing || undefined}
      className={`group mx-auto flex h-full w-full max-w-[30rem] flex-col gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] md:max-w-[40rem] land:pb-[max(0.75rem,env(safe-area-inset-bottom))] land:pt-[max(0.75rem,env(safe-area-inset-top))] ${PANES}`}
    >
      {/* While typing on a short screen (the keyboard is up) the header and counts make way for the key. */}
      <div className="flex items-center justify-between gap-3 pane:[grid-area:head] [@media(max-height:560px)]:group-data-[typing]:hidden">
        <TeamPill team={team} name={clueGiverOf(g, team)?.name ?? null} />
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={leave} aria-label={clue.leaveLabel} className={HEAD_BTN}>
            <span aria-hidden className="[&_svg]:h-5 [&_svg]:w-5">
              {Icon.back}
            </span>
            <span className="hidden min-[400px]:inline">{clue.leave}</span>
          </button>
          <button
            ref={hide}
            type="button"
            onClick={onHide}
            aria-label={clue.hideLabel}
            className={HEAD_BTN}
          >
            {icon('eyeOff', 'h-5 w-5')}
            {clue.hide}
          </button>
        </div>
      </div>
      {/* One note: on a phone it sticks under the header; beside the key the grid puts it in its own area. */}
      {(!live || error) && (
        <div className="sticky top-0 z-10 grid gap-1 rounded-[14px] bg-key-surface px-4 py-2.5 shadow-[inset_0_0_0_1px_var(--key-edge)] pane:static pane:[grid-area:note]">
          {!live && (
            <p role="status" className="text-16 font-semibold text-key-alert">
              {clue.reconnecting}
            </p>
          )}
          {error && (
            <p role="alert" className="text-16 font-semibold text-key-alert">
              {error}
            </p>
          )}
        </div>
      )}
      <StatusBand game={g} team={team} line={line} offset={c.clockOffset} />
      {finished && <div className="pane:[grid-area:panel]">{panel}</div>}
      {/* On a phone on its side the key itself shows the counts; the room goes to the clue bar. */}
      <div className="land:hidden pane:[grid-area:counts] [@media(max-height:560px)]:group-data-[typing]:hidden">
        <Counts keyIds={keyIds} revealed={g.revealed} />
      </div>
      <div className="flex min-h-[15.25rem] flex-1 flex-col pane:min-h-0 pane:[grid-area:key]">
        <KeyGrid
          words={g.words}
          keyIds={keyIds}
          revealed={g.revealed}
          team={team}
          pickable={
            picker && !disabled ? (i) => keyIds[i] === team && g.revealed[i] === null : undefined
          }
          selected={selected}
          onPick={setSelected}
        />
      </div>
      {!finished && <div className="pane:self-end pane:[grid-area:panel]">{panel}</div>}
      <AnimatePresence>
        {asking && (
          <Modal
            key="leave"
            text={clue.leaveAsk}
            ok={clue.leave}
            cancel={clue.stay}
            onCancel={() => setAsking(false)}
            onOk={() => (setAsking(false), actions.leave())}
          />
        )}
      </AnimatePresence>
    </m.div>
  );
}

/**
 * From a phone on its side up: the key fills the left pane's height and the status, counts and panel sit beside it
 * (ISH-F02), the split the desk board uses. Upright tablets keep one wider column.
 */
const PANES =
  'pane:grid pane:max-w-[96rem] pane:grid-cols-[minmax(0,3fr)_minmax(19rem,2fr)] pane:grid-rows-[auto_auto_auto_auto_1fr] pane:gap-x-6 pane:[grid-template-areas:"key_head""key_band""key_counts""key_note""key_panel"] wide:px-8 wide:pb-8 wide:pt-8';

/**
 * Whose turn it is, as a band in the acting team's colour (ISH-F17). A new turn sweeps in from that team's side
 * (A2), the phone whose turn starts vibrates once (A11), and a timed turn drains a bar along the bottom (A3).
 */
function StatusBand({
  game,
  team,
  line,
  offset,
}: {
  game: IshaaraPublic;
  team: Team;
  line: string;
  offset: number;
}) {
  const rm = useReducedMotion();
  const active = game.status === 'active';
  const yours = active && game.turn === team && !game.clue && !game.pending;
  const was = useRef(yours);
  useEffect(() => {
    if (yours && !was.current) navigator.vibrate?.(40);
    was.current = yours;
  }, [yours]);
  const fill = active ? TINT[game.turn] : 'bg-key-surface text-key-text';
  return (
    <div
      className={`relative isolate min-h-12 shrink-0 overflow-hidden rounded-[16px] pane:[grid-area:band] ${fill}`}
    >
      {active && !rm && (
        <m.span
          key={game.turn}
          aria-hidden
          initial={{ scaleX: 0, opacity: 0.5 }}
          animate={{ scaleX: 1, opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className={`absolute inset-0 -z-10 bg-key-text ${game.turn === 'sun' ? 'origin-left' : 'origin-right'}`}
        />
      )}
      <h1
        aria-live="polite"
        className="flex min-h-12 items-center gap-2.5 px-4 py-2 text-18 font-bold leading-tight"
      >
        {active && <Mark id={game.turn} className="h-4 w-4" />}
        {line}
      </h1>
      {active && <TurnBar game={game} offset={offset} />}
    </div>
  );
}

/** A thin bar that drains over a timed turn; the last ten seconds turn it to the alert colour and pulse. */
function TurnBar({ game, offset }: { game: IshaaraPublic; offset: number }) {
  const rm = useReducedMotion();
  const left = useCountdown(game.deadline, offset);
  const total = game.rules.timerSec;
  if (left === null || !total) return null;
  const low = left <= 10;
  return (
    <span aria-hidden className="absolute inset-x-0 bottom-0 h-1">
      <span className="absolute inset-0 bg-key-bg opacity-40" />
      <m.span
        className={`absolute inset-0 origin-left ${low ? 'bg-key-alert' : 'bg-current'}`}
        animate={{
          scaleX: Math.min(1, left / total),
          opacity: low && !rm ? [1, 0.45, 1] : 1,
        }}
        transition={{
          scaleX: { duration: rm ? 0 : 0.5, ease: 'linear' },
          opacity: low && !rm ? { duration: 1, repeat: Infinity } : { duration: 0 },
        }}
      />
    </span>
  );
}

/** One game on a clue phone: the gate first, then the key, held in memory only while this is mounted. */
export function KeyView({ id }: { id: string }) {
  const { actions } = useIshaara();
  const c = useClue(id);
  const [shown, setShown] = useState(false);
  useWakeLock(shown && c.keyStatus === 'ready');
  const team = c.team ?? c.me?.team ?? null;
  const name = c.game && team ? (clueGiverOf(c.game, team)?.name ?? null) : null;

  if (c.status === 'gone') return <Notice text={clue.load.gone} back={actions.leave} />;
  if (!c.game)
    return c.status === 'error' ? (
      <Notice
        text={clue.load.gameError}
        action={{ label: clue.load.retry, run: c.reload }}
        back={actions.leave}
      />
    ) : (
      <Notice text={clue.load.game} busy back={actions.leave} />
    );
  if (!shown)
    return (
      <Gate
        team={team}
        name={name}
        onShow={() => {
          setShown(true);
          c.openKey();
        }}
        onLeave={actions.leave}
      />
    );
  if (c.keyStatus === 'forbidden')
    return <Notice text={clue.load.forbidden} back={actions.leave} />;
  if (c.keyStatus === 'gone') return <Notice text={clue.load.gone} back={actions.leave} />;
  if (c.keyStatus === 'error')
    return (
      <Notice
        text={clue.load.keyError}
        action={{ label: clue.load.retry, run: c.openKey }}
        back={actions.leave}
      />
    );
  if (c.keyStatus !== 'ready' || !c.key || !c.team)
    return <Notice text={clue.load.key} busy back={actions.leave} />;
  return <KeyBoard c={c} onHide={() => setShown(false)} />;
}
