import { AnimatePresence, m } from 'framer-motion';
import { pts, type Outcome } from '@/domain';
import { sgnN } from '@/lib/format';
import { useApp } from '@/state/store';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icons';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Seg } from '@/components/ui/Seg';
import { Table } from '@/components/ui/Table';
import { PRESS_SM, SPRING } from '@/components/ui/motion';
import { stagger } from '@/components/ui/stagger';
import { RoundFrame } from './RoundFrame';
import { resultsView } from './roundView';
import { t } from '@/strings';
import { Avatar } from '@/components/ui/Avatar';
import { ToggleTrack } from '@/components/ui/Toggle';

export function Results() {
  const { state, actions } = useApp();
  const g = state.game;
  const { r, st, od, tricks, left, blocked, why } = resultsView(g);
  return (
    <RoundFrame
      r={r}
      sub={t.results.navSub}
      title={t.results.title}
      fit
      asideFirst
      navLeft={
        <IconButton label={t.common.back} onClick={() => actions.phase('playing', -1)}>
          {Icon.back}
        </IconButton>
      }
      aside={
        <>
          {!tricks && <TricksLeft left={left} cards={r.cards} />}
          {/* Marks and bids already exist in the round; only a pane with room shows them on a table. */}
          <div className="mb-4 hidden aspect-[34/30] w-full flex-col wide:flex">
            <Table
              uid="results"
              fit
              big
              noSeatAnim
              players={g.players}
              dir={g.direction}
              bids={r.bids}
              res={r.results}
            />
          </div>
          <m.button
            type="button"
            role="switch"
            aria-checked={st.exact}
            onClick={actions.toggleExact}
            whileTap="press"
            className="mb-1 flex min-h-12 w-full items-center justify-between rounded-2xl px-1 text-left"
          >
            <span className="flex flex-col">
              <span className="text-16 font-medium">{t.results.exactSwitch}</span>
              <span className="text-13 text-[var(--tx2)] @h-short:hidden">
                {t.results.exactHint}
              </span>
            </span>
            <ToggleTrack on={st.exact} />
          </m.button>
          {tricks && (
            <div className="mb-3 px-1 text-13 text-[var(--tx2)]">
              {t.results.totalTricks(
                Object.values(tricks).reduce((a, b) => a + b, 0),
                r.cards,
              )}
            </div>
          )}
        </>
      }
      barNote={st.msg}
      bar={
        <PrimaryButton className="w-full" disabled={!st.ok} onClick={actions.confirmRound}>
          {t.results.confirm}
        </PrimaryButton>
      }
    >
      <div
        // A container, so the Made/Missed buttons can relax once the row has room for them.
        className="@container scroll-thin min-h-[8.5rem] flex-1 overflow-y-auto overflow-x-hidden pane:overflow-visible"
      >
        {/* One grouped list with hairlines between players (Results.dc.html). */}
        <div className="glass overflow-hidden">
          {od.map((i, k) => {
            const p = g.players[i],
              b = r.bids[p.id],
              res = r.results[p.id],
              pv = pts(r, p.id);
            // The one result the app filled in because nothing else could work.
            const forced = state.autoResult === p.id && !!res && !tricks;
            return (
              <m.div key={p.id} {...stagger(k)}>
                {/* The controls wrap under the name when the pane is too narrow for both. */}
                <div className="relative flex min-h-14 flex-wrap items-center gap-x-2 gap-y-1 px-2 py-1.5">
                  {k > 0 && (
                    <span aria-hidden className="absolute left-14 right-2 top-0 h-px bg-ov/10" />
                  )}
                  {/* Made or missed reads at a glance: the row floods with its colour, then settles (MOTION_SPEC.md). */}
                  <AnimatePresence initial={false}>
                    {res && (
                      <m.span
                        key={res}
                        aria-hidden
                        initial={{ opacity: 1 }}
                        animate={{ opacity: [1, 1, 0] }}
                        transition={{ duration: 0.5, times: [0, 0.4, 1] }}
                        className={`pointer-events-none absolute inset-0 rounded-[inherit] ${res === 'made' ? 'bg-[var(--success-soft)]' : 'bg-[var(--danger-soft)]'}`}
                      />
                    )}
                  </AnimatePresence>
                  <div className="flex min-w-[7.5rem] flex-1 items-center gap-2">
                    <span className="relative shrink-0">
                      <Avatar
                        p={p}
                        className="mat-av grid h-10 w-10 shrink-0 place-items-center rounded-full text-22"
                      />
                      {i === r.dealerIndex && (
                        <i
                          aria-hidden
                          className="mat-dealer absolute -bottom-1 -right-1.5 grid h-[18px] w-[18px] place-items-center rounded-full text-[11px] font-extrabold not-italic leading-none"
                        >
                          {t.table.dealerMark}
                        </i>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="break-words text-16 font-bold @[26rem]:text-18 leading-[1.2] tracking-[-0.015em] [text-wrap:balance]">
                        {p.name}
                      </div>
                      <div className="whitespace-nowrap text-13 font-medium leading-4 text-[var(--tx2)]">
                        {t.results.bid(b)}
                        {i === r.dealerIndex && ` · ${t.results.dealer}`}
                        {!res && !tricks && (blocked(p.id, 'made') || blocked(p.id, 'missed')) && (
                          <>
                            {' '}
                            ·{' '}
                            <span className="text-[var(--warn)]">
                              {why(blocked(p.id, 'made') ?? blocked(p.id, 'missed'))}
                            </span>
                          </>
                        )}
                      </div>
                      {forced && (
                        <div className="text-13 font-medium leading-4 text-[var(--tx2)]">
                          {t.results.onlyOption}
                        </div>
                      )}
                    </div>
                    {/* Points for the round in their own column, once marked (Results.dc.html). */}
                    <b
                      className={`tick w-10 shrink-0 text-right text-15 ${pv == null ? 'font-normal text-[var(--dis)]' : pv > 0 ? 'text-[var(--pos)]' : 'text-[var(--neg-tx)]'}`}
                    >
                      {pv == null ? '—' : sgnN(pv)}
                    </b>
                  </div>
                  {tricks ? (
                    <div className="ml-auto flex items-center">
                      <m.button
                        type="button"
                        whileTap={PRESS_SM}
                        aria-label={t.results.fewer(p.name)}
                        onClick={() => actions.setTricks(p.id, -1)}
                        className="h-11 w-11 rounded-xl bg-ov/[.07] text-24 font-bold"
                      >
                        −
                      </m.button>
                      <output className="disp w-[34px] text-center text-24 font-extrabold">
                        {tricks[p.id]}
                      </output>
                      <m.button
                        type="button"
                        whileTap={PRESS_SM}
                        aria-label={t.results.more(p.name)}
                        onClick={() => actions.setTricks(p.id, 1)}
                        className="h-11 w-11 rounded-xl bg-ov/[.07] text-24 font-bold"
                      >
                        +
                      </m.button>
                    </div>
                  ) : (
                    <Seg<Outcome>
                      uid={'seg' + p.id}
                      label={t.results.resultFor(p.name)}
                      size="sm"
                      value={res}
                      onChange={(v) => actions.setResult(p.id, v)}
                      className="ml-auto [&_button]:px-2 [&_button]:text-18 @[26rem]:[&_button]:px-3.5 @[26rem]:[&_button]:text-15"
                      options={[
                        {
                          v: 'made',
                          label: result(t.table.made, t.results.made),
                          tone: 'pos',
                          disabled: !!blocked(p.id, 'made'),
                          why: why(blocked(p.id, 'made')),
                        },
                        {
                          v: 'missed',
                          label: result(t.table.missed, t.results.missed),
                          tone: 'neg',
                          disabled: !!blocked(p.id, 'missed'),
                          why: why(blocked(p.id, 'missed')),
                        },
                      ]}
                    />
                  )}
                </div>
              </m.div>
            );
          })}
        </div>
      </div>
    </RoundFrame>
  );
}

/**
 * A tick or cross, with its word once the row has room. The word is always in the text, so the button keeps
 * its name for assistive tech while a narrow row gives the player's name the space.
 */
const result = (icon: string, word: string) => (
  <>
    <span aria-hidden>{icon}</span>{' '}
    <span className="sr-only @[26rem]:not-sr-only @[26rem]:ml-1">{word}</span>
  </>
);

/** How many of the round's tricks the bids of the players marked Made have not claimed yet. */
function TricksLeft({ left, cards }: { left: number; cards: number }) {
  return (
    <div
      className="mb-3 px-1 py-1 @h-[44rem]:mb-2 @h-[44rem]:py-0.5"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-15 font-medium text-[var(--tx2)]">{t.results.tricksLeft}</span>
        <span className="disp tick text-28 font-extrabold leading-none tracking-[-0.03em] @h-[44rem]:text-22">
          {left}
          <span className="text-15 font-medium tracking-normal text-[var(--tx2)]">
            {t.results.tricksOf(cards)}
          </span>
        </span>
      </div>
      <div className="mat-meter mt-2 h-2 overflow-hidden rounded-full @h-[44rem]:hidden">
        <m.div
          className="mat-meter-fill h-full origin-left rounded-full"
          initial={false}
          animate={{ scaleX: cards ? left / cards : 0 }}
          transition={SPRING}
        />
      </div>
    </div>
  );
}
