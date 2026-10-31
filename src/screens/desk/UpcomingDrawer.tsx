import { motion } from 'framer-motion';
import { curRound, roundAt, totalRounds } from '@/domain';
import { useApp } from '@/state/store';
import { TR } from '@/theme/trumps';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { stagger } from '@/components/ui/stagger';
import { Drawer } from './Drawer';
import { GhostButton, Kbd } from './DeskParts';
import { t } from '@/strings';

export function UpcomingDrawer() {
  const { state, actions } = useApp();
  const g = state.game,
    cr = curRound(g),
    base = cr.phase === 'done' ? cr.index + 1 : cr.index,
    last = totalRounds(g);
  const count = Math.max(0, Math.min(7, last - base));
  const close = () => actions.openSheet(null);
  return (
    <Drawer
      eyebrow={t.desk.upcoming.eyebrow}
      title={t.desk.upcoming.title}
      onClose={close}
      foot={
        <div className="flex shrink-0 gap-3">
          <GhostButton
            className="!h-[60px] flex-1 !rounded-[18px] !text-18"
            onClick={() => actions.openSheet({ type: 'rules' })}
          >
            {t.desk.nav.rules}
          </GhostButton>
          <PrimaryButton className="flex-1" onClick={close}>
            {t.common.done} <Kbd>{t.desk.keys.esc}</Kbd>
          </PrimaryButton>
        </div>
      }
    >
      <p className="mb-3 text-13 text-[var(--tx2)]">{t.desk.upcoming.note}</p>
      <ol className="flex flex-col gap-2">
        {Array.from({ length: count }, (_, k) => {
          const i = base + k,
            r = roundAt(g, i),
            peak = r.cards === g.maxCards,
            now = k === 0;
          return (
            <motion.li
              key={i}
              {...stagger(k, 0.1)}
              className={`grid min-h-[68px] grid-cols-[4.5rem_5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl px-4 py-2 ${now ? 'bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent)_60%,transparent)]' : 'bg-white/5'}`}
            >
              <span className="flex flex-col items-start gap-1 text-15 font-bold text-[var(--tx2)]">
                {t.desk.summary.axis(i + 1)}
                {now && (
                  <span className="rounded-xl bg-[var(--accent)] px-2 text-13 font-extrabold text-ink-on-accent">
                    {cr.phase === 'done' ? t.desk.upcoming.next : t.desk.upcoming.now}
                  </span>
                )}
              </span>
              <span className="disp text-30 font-extrabold leading-none tracking-[-0.03em]">
                {r.cards}{' '}
                <span className="text-26" style={{ color: TR[r.trump].col }}>
                  {TR[r.trump].sym}
                </span>
              </span>
              <span className="min-w-0 text-17 font-bold leading-tight [overflow-wrap:anywhere]">
                {t.desk.deals(g.players[r.dealerIndex].name)}
                <small className="block text-13 font-normal text-[var(--tx2)]">
                  {t.desk.upcoming.leads(g.players[r.firstPlayerIndex].name)}
                </small>
              </span>
              {peak ? (
                <span className="rounded-xl bg-[var(--gold)] px-2.5 py-0.5 text-13 font-extrabold text-ink-gold">
                  {t.desk.peak}
                </span>
              ) : (
                <span className="text-13 text-[var(--tx2)]">{TR[r.trump].name}</span>
              )}
            </motion.li>
          );
        })}
      </ol>
      {count > 0 && base + count === last && (
        <p className="mt-3 text-13 text-[var(--tx2)]">{t.desk.upcoming.end}</p>
      )}
    </Drawer>
  );
}
