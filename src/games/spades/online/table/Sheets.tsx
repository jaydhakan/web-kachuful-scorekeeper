import { useId } from 'react';
import { Icon } from '@/components/ui/Icons';
import { MenuRow } from '@/components/ui/MenuRows';
import { Seg } from '@/components/ui/Seg';
import { handLines } from '@/games/spades/domain/standings';
import type { Seat, SpPublic, TeamId, TrickRec } from '@/games/spades/domain/types';
import { play as s } from '@/games/spades/strings/play';
import { usePrefs } from '@/games/spades/ui/prefs';
import { SpCard } from '@/games/spades/ui/SpCard';

export function PrefsBody() {
  const [prefs, set] = usePrefs();
  const uid = useId();
  return (
    <div className="flex flex-col gap-5 pb-2">
      <div>
        <p className="mb-2 text-13 font-semibold text-[var(--tx2)]">{s.prefs.sort}</p>
        <Seg
          uid={`${uid}-sort`}
          label={s.prefs.sort}
          value={prefs.sort}
          onChange={(v) => set({ sort: v })}
          options={[
            { v: 'up', label: s.prefs.sortUp },
            { v: 'down', label: s.prefs.sortDown },
          ]}
        />
      </div>
      <div>
        <p className="mb-2 text-13 font-semibold text-[var(--tx2)]">{s.prefs.sounds}</p>
        <Seg
          uid={`${uid}-snd`}
          label={s.prefs.sounds}
          value={prefs.sounds}
          onChange={(v) => set({ sounds: v })}
          options={[
            { v: 'all', label: s.prefs.soundsAll },
            { v: 'mine', label: s.prefs.soundsMine },
            { v: 'off', label: s.prefs.soundsOff },
          ]}
        />
        <p className="mt-2 text-13 text-[var(--tx2)]">{s.prefs.soundsNote}</p>
      </div>
      <div>
        <p className="mb-2 text-13 font-semibold text-[var(--tx2)]">{s.prefs.autoSingle}</p>
        <Seg
          uid={`${uid}-auto`}
          label={s.prefs.autoSingle}
          value={prefs.autoSingle ? 'on' : 'off'}
          onChange={(v) => set({ autoSingle: v === 'on' })}
          options={[
            { v: 'off', label: s.prefs.autoSingleOff },
            { v: 'on', label: s.prefs.autoSingleOn },
          ]}
        />
        <p className="mt-2 text-13 text-[var(--tx2)]">{s.prefs.autoSingleNote}</p>
      </div>
    </div>
  );
}

/** One trick as a row of four small cards, the winner's ringed. */
export function TrickRow({
  t,
  names,
  label,
}: {
  t: TrickRec;
  names: readonly string[];
  label: string;
}) {
  return (
    <li className="flex items-center gap-3 py-1.5">
      <span className="w-16 shrink-0 text-13 text-[var(--tx2)]">{label}</span>
      <span className="flex gap-1.5">
        {t.plays.map((p) => (
          <span key={p.seat} className="flex flex-col items-center gap-0.5">
            <span
              className={`relative block w-8 rounded-[5px] ${p.seat === t.winner ? 'shadow-[0_0_0_2px_var(--medal-gold-hi)]' : ''}`}
            >
              <SpCard card={p.card} size="mini" label className="w-8" />
            </span>
            <span className="max-w-[3.5rem] text-center text-13 leading-tight [overflow-wrap:anywhere]">
              {names[p.seat]}
            </span>
          </span>
        ))}
      </span>
    </li>
  );
}

/** The scoreboard: each finished hand's points and running totals, then this hand's tricks so far. */
export function BoardBody({
  table,
  names,
  teamNames,
  tricks,
}: {
  table: SpPublic;
  names: readonly string[];
  teamNames: Record<TeamId, string>;
  tricks: readonly TrickRec[];
}) {
  const lines = handLines(table.history);
  return (
    <div className="flex flex-col gap-5">
      {lines.length === 0 ? (
        <p className="text-15 text-[var(--tx2)]">{s.board.none}</p>
      ) : (
        <table className="w-full border-collapse text-14 tabular-nums">
          <thead>
            <tr>
              <th className="px-1 py-1.5 text-left text-13 font-semibold text-[var(--tx2)]">
                {s.board.hand}
              </th>
              {(['a', 'b'] as const).map((t) => (
                <th
                  key={t}
                  className="px-1 py-1.5 text-right text-13 font-semibold text-[var(--tx2)]"
                >
                  {teamNames[t]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.index} className="border-t border-[var(--hairline)]">
                <td className="px-1 py-2">{l.index + 1}</td>
                {(['a', 'b'] as const).map((t) => (
                  <td key={t} className="px-1 py-2 text-right">
                    <span className={l[t].net < 0 ? 'text-[var(--neg-tx)]' : ''}>
                      {s.sign(l[t].net)}
                    </span>
                    <b className="ml-2 font-bold">{l.after[t]}</b>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <section>
        <h3 className="mb-1 text-15 font-bold">{s.board.tricks}</h3>
        {tricks.length === 0 ? (
          <p className="text-14 text-[var(--tx2)]">{s.board.noTricks}</p>
        ) : (
          <ol>
            {tricks.map((t, i) => (
              <TrickRow key={i} t={t} names={names} label={s.board.trickN(i + 1)} />
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

export function LastTrickBody({
  trick,
  names,
}: {
  trick: TrickRec | null;
  names: readonly string[];
}) {
  if (!trick) return <p className="pb-2 text-15 text-[var(--tx2)]">{s.centre.noTrick}</p>;
  return (
    <div className="pb-2">
      <ul>
        <TrickRow t={trick} names={names} label="" />
      </ul>
      <p className="mt-2 text-15 font-semibold">{s.centre.lastTrickWon(names[trick.winner])}</p>
    </div>
  );
}

export function KeysBody() {
  const rows: [string, string][] = [
    [s.keys.move, s.keys.moveText],
    [s.keys.play, s.keys.playText],
    [s.keys.bid, s.keys.bidText],
    [s.keys.last, s.keys.lastText],
    [s.keys.help, s.keys.helpText],
  ];
  return (
    <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2.5 pb-2 text-15">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt>
            <kbd className="rounded-md bg-ov/[.1] px-2 py-1 font-mono text-14">{k}</kbd>
          </dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export interface MenuActions {
  board: () => void;
  last: () => void;
  prefs: () => void;
  keys: () => void;
  leave: () => void;
  host: {
    end: () => void;
    draw: () => void;
    cancel: () => void;
    /** Away seats the host may open for a new player, and whether it's between tricks. */
    replace: { seat: Seat; name: string }[];
    canReplace: boolean;
    onReplace: (seat: Seat) => void;
  } | null;
}

export function MenuBody({ a }: { a: MenuActions }) {
  const rows = [
    { icon: Icon.scores, label: s.menu.scoreboard, onClick: a.board },
    { icon: Icon.cards, label: s.menu.lastTrick, onClick: a.last },
    { icon: Icon.edit, label: s.menu.prefs, onClick: a.prefs },
    { icon: Icon.keyboard, label: s.menu.shortcuts, onClick: a.keys },
    { icon: Icon.back, label: s.menu.leave, onClick: a.leave },
  ];
  const h = a.host;
  return (
    <div className="pb-2">
      {rows.map((r, i) => (
        <MenuRow key={r.label} i={i} rule={i > 0} {...r} />
      ))}
      {h && (
        <section className="mt-4">
          <h3 className="mb-2 px-2 text-13 font-semibold text-[var(--tx2)]">{s.menu.host}</h3>
          {h.replace.map((x) => (
            <button
              key={x.seat}
              type="button"
              aria-disabled={!h.canReplace || undefined}
              onClick={() => h.canReplace && h.onReplace(x.seat)}
              className={`press mb-2 flex min-h-12 w-full flex-col items-start justify-center rounded-2xl bg-ov/[.06] px-3 py-2 text-left ${h.canReplace ? '' : 'opacity-60'}`}
            >
              <span className="text-16 font-semibold">{s.menu.replace(x.name)}</span>
              <span className="text-13 text-[var(--tx2)]">
                {h.canReplace ? s.menu.replaceSub : s.menu.replaceWait}
              </span>
            </button>
          ))}
          <div className="grid grid-cols-1 gap-2">
            {[
              { label: s.menu.endGame, onClick: h.end },
              { label: s.menu.draw, onClick: h.draw },
              { label: s.menu.cancel, onClick: h.cancel },
            ].map((b) => (
              <button
                key={b.label}
                type="button"
                onClick={b.onClick}
                className="press mat-fill-s min-h-12 rounded-[18px] px-3 text-16 font-bold text-[var(--neg-tx)]"
              >
                {b.label}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
