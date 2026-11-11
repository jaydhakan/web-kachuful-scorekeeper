import { m, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import {
  clueGiverOf,
  other,
  wordsLeft,
  type ClueNumber,
  type Action,
  type Team,
} from '@/games/ishaara/domain';
import { useIshaara } from '@/games/ishaara/state/store';
import { useClue, type IshaaraClue } from '@/games/ishaara/state/useTable';
import { clue } from '@/games/ishaara/strings/clue';
import { icon } from '@/components/ui/IconsMore';
import { useWakeLock } from '@/hooks/useWakeLock';
import { ClueEntry } from './ClueEntry';
import { Counts, KeyGrid, TeamPill } from './KeyParts';
import { FinishedPanel, NotePanel, OursPanel, PenaltyPanel, TheirsPanel } from './Panels';
import { CTA, OUTLINE, sendError } from './clueKit';

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
  const status = [
    line,
    clue.status.left('sun', wordsLeft(g, 'sun')),
    clue.status.left('moon', wordsLeft(g, 'moon')),
  ].join(' · ');

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
  else if (mine && !g.clue) panel = <ClueEntry game={g} disabled={disabled} onSend={sendClue} />;
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

  return (
    <m.div
      initial={rm ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto grid w-full max-w-[30rem] gap-4 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]"
    >
      <div className="flex items-center justify-between gap-3">
        <TeamPill team={team} name={clueGiverOf(g, team)?.name ?? null} />
        <button
          ref={hide}
          type="button"
          onClick={onHide}
          aria-label={clue.hideLabel}
          className="press inline-flex min-h-12 shrink-0 items-center gap-2 rounded-[16px] bg-key-surface px-4 text-18 font-semibold shadow-[inset_0_0_0_1px_var(--key-edge)]"
        >
          {icon('eyeOff', 'h-5 w-5')}
          {clue.hide}
        </button>
      </div>
      <h1 className="text-16 text-key-text-2" aria-live="polite">
        {status}
      </h1>
      <Counts keyIds={keyIds} />
      <KeyGrid
        words={g.words}
        keyIds={keyIds}
        revealed={g.revealed}
        pickable={
          picker && !disabled ? (i) => keyIds[i] === team && g.revealed[i] === null : undefined
        }
        selected={selected}
        onPick={setSelected}
      />
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
      {panel}
    </m.div>
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
      <Notice text={clue.load.game} busy />
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
  if (c.keyStatus !== 'ready' || !c.key || !c.team) return <Notice text={clue.load.key} busy />;
  return <KeyBoard c={c} onHide={() => setShown(false)} />;
}
