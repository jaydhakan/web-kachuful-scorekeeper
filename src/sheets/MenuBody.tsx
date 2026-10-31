import { motion } from 'framer-motion';
import { useApp } from '@/state/store';
import { stagger } from '@/components/ui/stagger';
import { destRoute, destsFor } from '@/components/hubNav';
import { t } from '@/strings';

export function MenuBody() {
  const { state, actions } = useApp();
  const inGame = state.screen === 'round' || state.screen === 'winner';
  const go: [string, string, () => void, boolean?][] = [
    ...destsFor(!!state.session).map((d): [string, string, () => void] => [
      d.emoji,
      d.label,
      () => actions.open(destRoute(d)),
    ]),
    state.session
      ? ['👤', t.hub.nav.account, () => actions.open({ screen: 'account' })]
      : ['🔑', t.hub.nav.signIn, () => actions.open({ screen: 'signin' })],
  ];
  const game: [string, string, () => void, boolean?][] = [
    ['📖', t.sheets.menu.rules, () => actions.openSheet({ type: 'rules' })],
    ['📊', t.sheets.menu.board, () => actions.openSheet({ type: 'board' })],
    ['🗓️', t.sheets.menu.upcoming, () => actions.openSheet({ type: 'upcoming' })],
    ['↩️', t.sheets.menu.undo, () => actions.undo()],
    [
      '🏁',
      t.sheets.menu.end,
      () => {
        actions.openSheet(null);
        actions.ask('endGame');
      },
      true,
    ],
    [
      '🏠',
      t.sheets.menu.quit,
      () => {
        actions.openSheet(null);
        actions.go('home', -1);
      },
    ],
  ];
  const items = inGame ? [...game, ...go] : go;
  return (
    <>
      {items.map(([ic, t, f, neg], i) => (
        <motion.button
          key={t}
          type="button"
          {...stagger(i)}
          whileTap="press"
          variants={{ press: { scale: 0.97 } }}
          onClick={f}
          className={`relative isolate flex min-h-14 w-full items-center gap-3.5 rounded-2xl px-2 text-left text-18 font-medium tracking-[-0.012em] ${neg ? 'text-[var(--neg)]' : ''}`}
        >
          <motion.span
            aria-hidden
            initial={false}
            variants={{ press: { opacity: 1 } }}
            style={{ opacity: 0 }}
            className="absolute inset-0 -z-10 rounded-[inherit] bg-white/[.07]"
          />
          <span aria-hidden className="w-7 text-center text-22">
            {ic}
          </span>
          {t}
        </motion.button>
      ))}
    </>
  );
}
