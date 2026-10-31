import { motion } from 'framer-motion';
import { useApp } from '@/state/store';
import { stagger } from '@/components/ui/stagger';

export function MenuBody() {
  const { actions } = useApp();
  const items: [string, string, () => void, boolean?][] = [
    ['📖', 'Rules', () => actions.openSheet({ type: 'rules' })],
    ['📊', 'Scoreboard', () => actions.openSheet({ type: 'board' })],
    ['🗓️', 'Upcoming rounds', () => actions.openSheet({ type: 'upcoming' })],
    ['↩️', 'Undo last action', () => actions.undo()],
    [
      '🏁',
      'End game',
      () => {
        actions.openSheet(null);
        actions.ask('endGame');
      },
      true,
    ],
    [
      '🏠',
      'Quit to home',
      () => {
        actions.openSheet(null);
        actions.go('home', -1);
      },
    ],
  ];
  return (
    <>
      {items.map(([ic, t, f, neg], i) => (
        <motion.button
          key={t}
          type="button"
          {...stagger(i)}
          whileTap={{ scale: 0.97, backgroundColor: 'rgba(255,255,255,.07)' }}
          onClick={f}
          className={`flex min-h-14 w-full items-center gap-3.5 rounded-2xl px-2 text-left text-18 font-medium tracking-[-0.012em] ${neg ? 'text-[var(--neg)]' : ''}`}
        >
          <span aria-hidden className="w-7 text-center text-22">
            {ic}
          </span>
          {t}
        </motion.button>
      ))}
    </>
  );
}
