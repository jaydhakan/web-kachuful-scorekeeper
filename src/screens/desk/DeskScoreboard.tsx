import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useId, useRef, type CSSProperties } from 'react';
import { doneRounds, pts, totals, type Outcome } from '@/domain';
import { fmt, sgnN } from '@/lib/format';
import { useApp } from '@/state/store';
import { useRoundEdit } from '@/hooks/useRoundEdit';
import { useShortcuts } from '@/hooks/useShortcuts';
import { TR } from '@/theme/trumps';
import { Icon } from '@/components/ui/Icons';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Seg } from '@/components/ui/Seg';
import { EASE, SPRING, SPRING_SHEET } from '@/components/ui/motion';
import { DeskPage, Eyebrow, GhostButton, Kbd, PageHead } from './DeskParts';
import { t } from '@/strings';

/** The Edit-round side panel: same draft rules as the phone's Edit sheet (useRoundEdit). */
function EditPanel({ i, onClose }: { i: number; onClose: () => void }) {
  const { g, r, od, bids, res, problem, step, mark, save } = useRoundEdit(i);
  const titleId = useId();
  const ref = useRef<HTMLElement>(null);
  const rm = useReducedMotion();
  useShortcuts({ enter: save });
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true });
  }, []);
  return (
    <motion.aside
      ref={ref}
      aria-labelledby={titleId}
      initial={rm ? { opacity: 0 } : { x: '110%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={rm ? { opacity: 0 } : { x: '110%', opacity: 0 }}
      transition={rm ? { duration: 0.2, ease: EASE } : SPRING_SHEET}
      className="glass glass-glow flex min-h-0 flex-col gap-3.5 p-5 [grid-area:edit] dt:p-[22px]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <Eyebrow>{t.desk.board.edit}</Eyebrow>
          <h2 id={titleId} className="disp text-32 font-extrabold leading-[1.1] tracking-[-0.03em]">
            {t.desk.roundN(i + 1)}
          </h2>
        </div>
        <GhostButton icon aria-label={t.common.close} onClick={onClose}>
          {Icon.close}
        </GhostButton>
      </div>
      <p className="text-13 text-[var(--tx2)]">
        {t.sheets.editInfo(r.cards, TR[r.trump].name, g.players[r.dealerIndex].name)}
      </p>
      <ul className="scroll-thin -mr-1.5 flex min-h-0 flex-col gap-2 overflow-y-auto pr-1.5">
        {od.map((k) => {
          const p = g.players[k];
          return (
            <li
              key={p.id}
              className="flex flex-wrap items-center gap-2.5 rounded-2xl bg-white/5 p-2.5"
            >
              <span
                aria-hidden
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-white/20 text-22"
                style={{ background: p.color }}
              >
                {p.emoji}
              </span>
              <span className="min-w-[5rem] flex-1 text-17 font-bold [overflow-wrap:anywhere]">
                {p.name}
              </span>
              <span className="flex items-center">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.88 }}
                  aria-label={t.sheets.lowerBid(p.name)}
                  onClick={() => step(p.id, -1)}
                  className="h-12 w-12 rounded-xl bg-white/[.08] text-22 font-bold"
                >
                  −
                </motion.button>
                <output className="disp w-8 text-center text-22 font-extrabold">
                  {bids[p.id]}
                </output>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.88 }}
                  aria-label={t.sheets.raiseBid(p.name)}
                  onClick={() => step(p.id, 1)}
                  className="h-12 w-12 rounded-xl bg-white/[.08] text-22 font-bold"
                >
                  +
                </motion.button>
              </span>
              <Seg<Outcome>
                uid={'de' + p.id}
                label={t.results.resultFor(p.name)}
                value={res[p.id]}
                onChange={(v) => mark(p.id, v)}
                className="ml-auto [&_button]:h-12"
                options={[
                  { v: 'made', label: t.table.made, tone: 'pos' },
                  { v: 'missed', label: t.table.missed, tone: 'neg' },
                ]}
              />
            </li>
          );
        })}
      </ul>
      <p
        role="alert"
        className={`text-14 font-medium ${problem ? 'text-[var(--warn)]' : 'text-[var(--tx2)]'}`}
      >
        {problem || t.desk.board.note}
      </p>
      <div className="mt-auto flex gap-3">
        <PrimaryButton tone="glass" className="w-32" onClick={onClose}>
          {t.common.cancel}
        </PrimaryButton>
        <PrimaryButton className="flex-1" disabled={!!problem} onClick={save}>
          {t.desk.board.saveChanges}
          {!problem && <Kbd>⏎</Kbd>}
        </PrimaryButton>
      </div>
    </motion.aside>
  );
}

/**
 * Every round by every player, over the game screen (which stays mounted underneath). Picking a round opens the
 * Edit panel beside the grid. Driven by the `board` / `edit` sheet state, so the phone's actions work unchanged.
 */
export function DeskScoreboard() {
  const { state, actions } = useApp();
  const g = state.game,
    done = doneRounds(g),
    tot = totals(g);
  const editing = state.sheet?.type === 'edit' ? state.sheet.i : null;
  const rm = useReducedMotion();
  const close = () => actions.openSheet(null);
  const closeEdit = () => actions.openSheet({ type: 'board' });
  // Escape closes the panel first, then the board; dialogs above handle their own.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || document.querySelector('[aria-modal="true"]'))
        return;
      e.preventDefault();
      if (editing != null) closeEdit();
      else close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });
  const cols = { '--pc': g.players.length } as CSSProperties;
  const row =
    'grid grid-cols-[minmax(9rem,12.25rem)_repeat(var(--pc),minmax(4.25rem,1fr))] items-center gap-x-1 rounded-[14px] px-3';
  return (
    <motion.div
      initial={rm ? { opacity: 0 } : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={rm ? { opacity: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="scr-bg absolute inset-0 z-10"
    >
      <DeskPage scroll label={t.desk.nav.scoreboard} className="rail:overflow-hidden">
        <PageHead
          barTitled
          eyebrow={t.desk.board.eyebrow(done.length)}
          title={t.desk.nav.scoreboard}
          actions={
            <>
              <span className="hidden items-center text-13 text-[var(--tx2)] kbd:flex">
                {t.desk.board.hint}
              </span>
              <GhostButton onClick={close}>
                {t.desk.board.back} <Kbd className="bg-white/[.12]">{t.desk.keys.esc}</Kbd>
              </GhostButton>
            </>
          }
        />
        <div
          className={`grid gap-5 rail:min-h-0 rail:flex-1 ${editing != null ? "[grid-template-areas:'edit'_'grid'] rail:[grid-template-areas:'grid_edit'] rail:grid-cols-[minmax(0,1fr)_clamp(22rem,32vw,28rem)] dt:gap-6" : "[grid-template-areas:'grid']"}`}
        >
          <motion.section
            layout="position"
            transition={SPRING}
            aria-label={t.desk.board.grid}
            className="glass scroll-thin min-h-0 overflow-auto p-3 [grid-area:grid]"
            style={cols}
          >
            {!done.length ? (
              <p className="p-4 text-16 text-[var(--tx2)]">{t.desk.board.empty}</p>
            ) : (
              <div className="flex min-w-min flex-col gap-1">
                <div className={`${row} sticky top-0 z-[2] min-h-[5.75rem] bg-sheet/90 py-2`}>
                  <span className="text-13 font-bold text-[var(--tx2)]">{t.desk.board.header}</span>
                  {g.players.map((p) => (
                    <span
                      key={p.id}
                      className="flex min-w-0 flex-col items-center gap-0.5 text-center"
                    >
                      <span
                        aria-hidden
                        className="grid h-9 w-9 place-items-center rounded-full border-2 border-white/20 text-20"
                        style={{ background: p.color }}
                      >
                        {p.emoji}
                      </span>
                      <span className="max-w-full text-13 text-[var(--tx2)] [overflow-wrap:anywhere]">
                        {p.name}
                      </span>
                      <b
                        className={`disp tick text-22 font-extrabold leading-none ${tot[p.id] < 0 ? 'text-[var(--neg-tx)]' : ''}`}
                      >
                        {fmt(tot[p.id])}
                      </b>
                    </span>
                  ))}
                </div>
                <div className="h-px bg-white/10" />
                {done.map((r) => {
                  const sel = editing === r.index;
                  return (
                    <motion.button
                      key={r.index}
                      type="button"
                      aria-label={t.sheets.editRow(r.index + 1)}
                      aria-pressed={sel}
                      onClick={() =>
                        actions.openSheet(sel ? { type: 'board' } : { type: 'edit', i: r.index })
                      }
                      whileTap={{ scale: 0.99 }}
                      className={`${row} min-h-[66px] text-left ${sel ? 'bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent)_55%,transparent)]' : '[@media(hover:hover)]:hover:bg-white/[.04]'}`}
                    >
                      <span className="flex items-center gap-2.5 text-15 font-bold [overflow-wrap:anywhere]">
                        {t.desk.board.row(
                          r.index + 1,
                          r.cards,
                          r.trump,
                          g.players[r.dealerIndex].name,
                        )}
                      </span>
                      {g.players.map((p) => {
                        const v = pts(r, p.id),
                          ok = r.results[p.id] === 'made';
                        return (
                          <span
                            key={p.id}
                            className="flex flex-col items-center justify-center text-13 text-[var(--tx2)]"
                          >
                            <span>
                              {r.bids[p.id]}{' '}
                              <i
                                className={`font-extrabold not-italic ${ok ? 'text-[var(--pos)]' : 'text-[var(--neg-tx)]'}`}
                              >
                                {ok ? t.table.made : t.table.missed}
                              </i>
                            </span>
                            <b
                              className={`disp tick text-22 font-extrabold leading-tight ${v != null && v > 0 ? 'text-[var(--pos)]' : 'text-[var(--neg-tx)]'}`}
                            >
                              {v == null ? '–' : sgnN(v)}
                            </b>
                          </span>
                        );
                      })}
                    </motion.button>
                  );
                })}
              </div>
            )}
          </motion.section>
          <AnimatePresence>
            {editing != null && <EditPanel key={editing} i={editing} onClose={closeEdit} />}
          </AnimatePresence>
        </div>
      </DeskPage>
    </motion.div>
  );
}
