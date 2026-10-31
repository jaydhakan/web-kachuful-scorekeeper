import { motion } from 'framer-motion';
import { useApp } from '@/state/store';
import { stagger } from '@/components/ui/stagger';
import { drawerRules } from '@/strings/rules';
import { Drawer } from './Drawer';
import { Kbd } from './DeskParts';
import { t } from '@/strings';

export function RulesDrawer() {
  const { state, actions } = useApp();
  const g = state.game;
  // Home shows the general rule; inside a game the peak and side are this table's.
  const own = state.screen !== 'home' && state.screen !== 'setup';
  const items = drawerRules(
    own ? g.direction : (state.setup?.dir ?? 'cw'),
    own ? g.maxCards : null,
    g.lengthMode === 'endless',
  );
  return (
    <Drawer
      eyebrow={t.desk.rules.eyebrow}
      title={t.desk.rules.title}
      closeLabel={t.desk.rules.close}
      onClose={() => actions.openSheet(null)}
      foot={
        <div className="glass hidden shrink-0 flex-col gap-2 px-4 py-3.5 kbd:flex">
          <div className="text-13 font-bold uppercase tracking-[0.12em] text-[var(--accent)]">
            {t.desk.rules.keyboard}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-15 text-[var(--tx2)]">
            {(
              [
                ['0–9', t.desk.keys.bid],
                ['⏎', t.desk.keys.confirm],
                ['Z', t.desk.keys.undo],
                ['?', t.desk.keys.shortcuts],
              ] as const
            ).map(([k, what]) => (
              <span key={k} className="inline-flex items-center gap-2">
                <Kbd className="bg-white/[.12]">{k}</Kbd>
                {what}
              </span>
            ))}
          </div>
        </div>
      }
    >
      <ol>
        {items.map(([title, body], i) => (
          <motion.li
            key={title}
            {...stagger(i, 0.12)}
            className="flex gap-3.5 border-t border-white/[.08] py-3.5 first:border-t-0"
          >
            <span className="disp grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-[color-mix(in_srgb,var(--accent)_22%,transparent)] text-16 font-extrabold text-[var(--accent)]">
              {i + 1}
            </span>
            <div>
              <h3 className="mb-1 text-18 font-bold">{title}</h3>
              <p className="text-16 leading-normal text-[var(--tx2)] [&_b]:text-[var(--tx)]">
                {body}
              </p>
            </div>
          </motion.li>
        ))}
      </ol>
    </Drawer>
  );
}
